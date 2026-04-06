(function initHostDashboardController() {
        function getRouteFromHash() {
            const hash = String(window.location.hash || '').toLowerCase();
            if (!hash.startsWith('#/host/')) {
                return 'dashboard';
            }
            return hash.replace('#/host/', '').split('?')[0] || 'dashboard';
        }

        function getHostedEventsSafe() {
            if (typeof getHostedEvents === 'function') {
                return getHostedEvents();
            }
            return [];
        }

        function hasHostDashboardAccessSafe() {
          if (typeof hasHostDashboardAccess === 'function') {
            return hasHostDashboardAccess();
          }
          return false;
        }

        function getTicketsSafe() {
          if (typeof getHostAudienceTickets === 'function') {
            return getHostAudienceTickets();
          }
          if (typeof getTickets === 'function') {
            return getTickets();
            }
            return [];
        }

        function getMetricSafe(eventId) {
            if (typeof getEventMetric === 'function') {
                return getEventMetric(eventId) || {};
            }
            return {};
        }

        function daysUntilEvent(dateString) {
            const eventDate = new Date(`${dateString}T12:00:00`);
            if (Number.isNaN(eventDate.getTime())) {
                return 999;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return Math.floor((eventDate.getTime() - today.getTime()) / 86400000);
        }

        function getEventHealthAlerts(events) {
            const alerts = [];

            events.forEach((event) => {
                const metric = getMetricSafe(event.id);
                const impressions = Number(metric.impressions || 0);
                const sold = Number(metric.ticketSalesCount || 0);
                const capacity = Number(event.capacity || 0);
                const registered = Number(event.registered || 0);
                const conversion = impressions > 0 ? (sold / impressions) * 100 : 0;
                const fillRate = capacity > 0 ? (registered / capacity) * 100 : 0;
                const daysLeft = daysUntilEvent(event.date);

                if (impressions >= 120 && conversion < 1.2) {
                    alerts.push({
                        severity: 'high',
                        message: `${event.name}: low conversion (${conversion.toFixed(1)}%). Consider pricing or copy updates.`
                    });
                }

                if (daysLeft <= 7 && daysLeft >= 0 && fillRate < 35) {
                    alerts.push({
                        severity: 'medium',
                        message: `${event.name}: event is ${daysLeft}d away with only ${fillRate.toFixed(1)}% capacity filled.`
                    });
                }

                if (fillRate >= 85 && daysLeft > 0) {
                    alerts.push({
                        severity: 'low',
                        message: `${event.name}: strong demand (${fillRate.toFixed(1)}% filled). Consider opening more inventory.`
                    });
                }
            });

            return alerts.slice(0, 6);
        }

        function getFinanceSnapshot(events) {
            const totals = events.reduce((acc, event) => {
                const metric = getMetricSafe(event.id);
                const revenue = Number(metric.ticketRevenueTotal || 0);
                const eventDaysLeft = daysUntilEvent(event.date);
                acc.gross += revenue;
                if (eventDaysLeft > 0) {
                    acc.pending += revenue;
                }
                if (eventDaysLeft <= 0) {
                    acc.completed += revenue;
                }
                return acc;
            }, { gross: 0, pending: 0, completed: 0 });

            const estimatedFees = totals.gross * 0.08;
            const estimatedNet = totals.gross - estimatedFees;
            return {
                gross: totals.gross,
                pending: totals.pending,
                completed: totals.completed,
                estimatedFees,
                estimatedNet
            };
        }

        function toCsvCell(value) {
            const text = String(value == null ? '' : value);
            const escaped = text.replace(/"/g, '""');
            return `"${escaped}"`;
        }

        function buildEventsCsv(events) {
            const header = [
                'Event Name',
                'Date',
                'City',
                'Capacity',
                'Registered',
                'Tickets Sold',
                'Impressions',
                'Conversion %',
                'Revenue'
            ];

            const rows = events.map((event) => {
                const metric = getMetricSafe(event.id);
                const impressions = Number(metric.impressions || 0);
                const sold = Number(metric.ticketSalesCount || 0);
                const conversion = impressions > 0 ? ((sold / impressions) * 100).toFixed(2) : '0.00';
                return [
                    event.name || 'Untitled',
                    event.date || '',
                    event.city || '',
                    Number(event.capacity || 0),
                    Number(event.registered || 0),
                    sold,
                    impressions,
                    conversion,
                    Number(metric.ticketRevenueTotal || 0)
                ];
            });

            return [header, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
        }

        function getFinanceBreakdown(events) {
            const refunds = getRefundRequests(events);
            const approvedRefundAmount = refunds
                .filter((entry) => entry.status === 'approved')
                .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
            const pendingRefundAmount = refunds
                .filter((entry) => entry.status === 'pending' || entry.status === 'requested')
                .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

            const base = getFinanceSnapshot(events);
            const netAfterRefunds = base.estimatedNet - approvedRefundAmount;
            const payoutReady = Math.max(base.completed - approvedRefundAmount, 0);

            return {
                ...base,
                approvedRefundAmount,
                pendingRefundAmount,
                netAfterRefunds,
                payoutReady,
                refundCount: refunds.length
            };
        }

        function buildFinanceCsv(events) {
            const header = [
                'Event Name',
                'Gross Revenue',
                'Estimated Fee',
                'Estimated Net',
                'Approved Refund Amount',
                'Pending Refund Amount',
                'Payout Ready'
            ];

            const refunds = getRefundRequests(events);

            const rows = events.map((event) => {
                const metric = getMetricSafe(event.id);
                const gross = Number(metric.ticketRevenueTotal || 0);
                const estimatedFee = gross * 0.08;
                const estimatedNet = gross - estimatedFee;
                const eventRefunds = refunds.filter((entry) => entry.eventId === event.id);
                const approvedRefund = eventRefunds.filter((entry) => entry.status === 'approved').reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
                const pendingRefund = eventRefunds
                    .filter((entry) => entry.status === 'pending' || entry.status === 'requested')
                    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
                return [
                    event.name || 'Untitled',
                    gross,
                    estimatedFee,
                    estimatedNet,
                    approvedRefund,
                    pendingRefund,
                    Math.max(estimatedNet - approvedRefund, 0)
                ];
            });

            return [header, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
        }

        function toDomId(value) {
            return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '-');
        }

        function clampNumber(value, min, max) {
            const num = Number(value);
            if (!Number.isFinite(num)) {
                return min;
            }
            return Math.max(min, Math.min(max, num));
        }

        function getTicketingConfig(event) {
            const metadata = event && typeof event.metadata === 'object' && event.metadata ? event.metadata : {};
            const ticketing = metadata.ticketing && typeof metadata.ticketing === 'object' ? metadata.ticketing : {};
            const tiers = Array.isArray(ticketing.tiers) ? ticketing.tiers : [];

            const findTierPrice = (name, fallback) => {
                const found = tiers.find((tier) => String(tier.name || '').toLowerCase() === name.toLowerCase());
                return Number(found && Number.isFinite(Number(found.price)) ? found.price : fallback);
            };

            const basePrice = Number(event.price || 0);
            return {
                reservePercent: clampNumber(ticketing.reservePercent == null ? 10 : ticketing.reservePercent, 0, 50),
                earlyBirdPrice: findTierPrice('Early Bird', Math.max(basePrice * 0.75, 0)),
                regularPrice: findTierPrice('Regular', basePrice),
                vipPrice: findTierPrice('VIP', Math.max(basePrice * 1.5, 0))
            };
        }

        function getEventByIdSafe(eventId) {
            if (typeof getEventById === 'function') {
                return getEventById(eventId);
            }
            const hosted = getHostedEventsSafe();
            return hosted.find((event) => event.id === eventId) || null;
        }

        function saveTicketingConfig(eventId) {
            const event = getEventByIdSafe(eventId);
            if (!event || typeof saveEvent !== 'function') {
                if (typeof toast === 'function') {
                    toast('Could not update ticket settings for this event.');
                }
                return;
            }

            const domId = toDomId(eventId);
            const reserveInput = document.getElementById(`tier-reserve-${domId}`);
            const earlyInput = document.getElementById(`tier-early-${domId}`);
            const regularInput = document.getElementById(`tier-regular-${domId}`);
            const vipInput = document.getElementById(`tier-vip-${domId}`);

            if (!reserveInput || !earlyInput || !regularInput || !vipInput) {
                return;
            }

            const reservePercent = clampNumber(reserveInput.value, 0, 50);
            const earlyBirdPrice = clampNumber(earlyInput.value, 0, 999999999);
            const regularPrice = clampNumber(regularInput.value, 0, 999999999);
            const vipPrice = clampNumber(vipInput.value, 0, 999999999);

            const capacity = Math.max(0, Number(event.capacity || 0));
            const reserveCount = Math.floor(capacity * (reservePercent / 100));

            const nextMetadata = {
                ...(event.metadata && typeof event.metadata === 'object' ? event.metadata : {}),
                ticketing: {
                    reservePercent,
                    reserveCount,
                    tiers: [
                        { name: 'Early Bird', price: earlyBirdPrice, allocationPercent: 25 },
                        { name: 'Regular', price: regularPrice, allocationPercent: 60 },
                        { name: 'VIP', price: vipPrice, allocationPercent: 15 }
                    ]
                }
            };

            saveEvent({...event, metadata: nextMetadata });
            if (typeof toast === 'function') {
                toast('Ticket tiers and reserve saved.');
            }
            render();
        }

        function getHostedEventIdSet(events) {
            return new Set((events || []).map((event) => String(event.id || '')));
        }

        function getRefundRequests(events) {
            const hostedIds = getHostedEventIdSet(events);
            const tickets = getTicketsSafe();

            return tickets
                .filter((ticket) => hostedIds.has(String(ticket.eventId || '')))
                .filter((ticket) => {
                    const status = String(ticket.refundStatus || '').toLowerCase();
                    return Boolean(ticket.refundRequested) || ['pending', 'requested', 'approved', 'rejected'].includes(status);
                })
                .map((ticket) => {
                    const status = String(ticket.refundStatus || (ticket.refundRequested ? 'pending' : '') || 'pending').toLowerCase();
                    const event = events.find((item) => item.id === ticket.eventId);
                    return {
                        id: ticket.id,
                        eventId: ticket.eventId,
                        eventName: event ? event.name : 'Unknown Event',
                        attendee: ticket.fullName || ticket.name || ticket.email || ticket.phone || 'Unknown attendee',
                        amount: Number(ticket.amount || ticket.price || (event ? event.price : 0) || 0),
                        reason: ticket.refundReason || 'No reason supplied',
                        requestedAt: ticket.refundRequestedAt || ticket.createdAt || '',
                        status
                    };
                })
                .sort((a, b) => {
                    const statusOrder = { pending: 0, requested: 0, approved: 1, rejected: 2 };
                    const left = statusOrder[a.status] != null ? statusOrder[a.status] : 3;
                    const right = statusOrder[b.status] != null ? statusOrder[b.status] : 3;
                    if (left !== right) {
                        return left - right;
                    }
                    return String(b.requestedAt || '').localeCompare(String(a.requestedAt || ''));
                });
        }

        function updateRefundStatus(ticketId, status) {
            if (typeof getTickets !== 'function' || typeof saveTicket !== 'function') {
                return;
            }

            const tickets = getTickets();
            const ticket = tickets.find((item) => item.id === ticketId);
            if (!ticket) {
                return;
            }

            const nextTicket = {
                ...ticket,
                refundRequested: true,
                refundStatus: status,
                refundResolvedAt: new Date().toISOString()
            };

            saveTicket(nextTicket);
            if (typeof toast === 'function') {
                toast(`Refund marked as ${status}.`);
            }
            render();
        }

        function getAudienceSegments(events) {
            const hostedIds = getHostedEventIdSet(events);
            const tickets = getTicketsSafe().filter((ticket) => hostedIds.has(String(ticket.eventId || '')));
            const audienceMap = new Map();

            tickets.forEach((ticket) => {
                const email = String(ticket.email || '').trim().toLowerCase();
                const phone = String(ticket.phone || '').trim();
                const name = String(ticket.name || '').trim();
                const key = email || phone || `name:${name.toLowerCase()}`;
                if (!key) {
                    return;
                }

                const current = audienceMap.get(key) || {
                    identity: email || phone || name || 'Unknown attendee',
                    ticketCount: 0,
                    spend: 0,
                    events: new Set(),
                    hasContact: Boolean(email || phone)
                };

                current.ticketCount += 1;
                current.spend += Number(ticket.amount || ticket.price || 0);
                current.events.add(ticket.eventId || '');
                audienceMap.set(key, current);
            });

            const attendees = Array.from(audienceMap.values()).map((entry) => {
                const eventCount = entry.events.size;
                let segment = 'First-timer';
                if (entry.ticketCount >= 3 || eventCount >= 2) {
                    segment = 'Repeat';
                }
                if (entry.spend >= 150000) {
                    segment = 'High Value';
                }
                if (!entry.hasContact) {
                    segment = 'No Contact';
                }
                return {
                    identity: entry.identity,
                    ticketCount: entry.ticketCount,
                    eventCount,
                    spend: entry.spend,
                    segment
                };
            });

            const summary = {
                total: attendees.length,
                repeat: attendees.filter((item) => item.segment === 'Repeat').length,
                highValue: attendees.filter((item) => item.segment === 'High Value').length,
                firstTimers: attendees.filter((item) => item.segment === 'First-timer').length,
                noContact: attendees.filter((item) => item.segment === 'No Contact').length
            };

            attendees.sort((a, b) => b.spend - a.spend);
            return { summary, attendees: attendees.slice(0, 12) };
        }

        function renderMetricCards(events) {
            const totals = events.reduce((acc, event) => {
                const metric = getMetricSafe(event.id);
                acc.events += 1;
                acc.registrations += Number(event.registered || 0);
                acc.tickets += Number(metric.ticketSalesCount || 0);
                acc.revenue += Number(metric.ticketRevenueTotal || 0);
                acc.impressions += Number(metric.impressions || 0);
                return acc;
            }, { events: 0, registrations: 0, tickets: 0, revenue: 0, impressions: 0 });

            return `
      <section class="host-overview-grid" aria-label="Host overview metrics">
        <article class="host-kpi-card"><p>Hosted Events</p><strong>${totals.events}</strong></article>
        <article class="host-kpi-card"><p>Total Registered</p><strong>${totals.registrations}</strong></article>
        <article class="host-kpi-card"><p>Tickets Sold</p><strong>${totals.tickets}</strong></article>
        <article class="host-kpi-card"><p>Total Revenue</p><strong>${typeof formatPrice === 'function' ? formatPrice(totals.revenue, 'UGX') : totals.revenue}</strong></article>
        <article class="host-kpi-card"><p>Impressions</p><strong>${totals.impressions}</strong></article>
      </section>
    `;
        }

        function renderOverview(events) {
            const finance = getFinanceBreakdown(events);
            const alerts = getEventHealthAlerts(events);
            const rows = events.slice(0, 6).map((event) => {
                const status = typeof getEventStatusBadge === 'function' ? getEventStatusBadge(event) : { label: 'Upcoming', className: 'is-upcoming' };
                const metric = getMetricSafe(event.id);
                return `
        <tr>
          <td>${escapeHtml(event.name || 'Untitled')}</td>
          <td>${escapeHtml(typeof formatDate === 'function' ? formatDate(event.date) : event.date || '')}</td>
          <td><span class="dashboard-pill ${escapeHtml(status.className || '')}">${escapeHtml(status.label || '')}</span></td>
          <td>${Number(event.registered || 0)}</td>
          <td>${Number(metric.ticketSalesCount || 0)}</td>
          <td>${typeof formatPrice === 'function' ? formatPrice(metric.ticketRevenueTotal || 0, event.currency || 'UGX') : Number(metric.ticketRevenueTotal || 0)}</td>
        </tr>
      `;
            }).join('');

            return `
      ${renderMetricCards(events)}
      <section class="host-toolbar card" aria-label="Dashboard quick actions">
        <div class="host-toolbar-actions">
          <button type="button" class="button button-secondary button-small" onclick="TokaHostDashboardController.exportCsv()">Export CSV</button>
          <button type="button" class="button button-ghost button-small" onclick="TokaHostDashboardController.navigate('analytics')">Open Analytics</button>
          <button type="button" class="button button-ghost button-small" onclick="TokaHostDashboardController.navigate('finance')">Open Finance</button>
        </div>
      </section>
      <section class="host-finance-grid" aria-label="Finance snapshot">
        <article class="host-finance-card card">
          <p class="eyebrow">Gross Revenue</p>
          <h3>${typeof formatPrice === 'function' ? formatPrice(finance.gross, 'UGX') : finance.gross}</h3>
          <p class="text-muted">Across all hosted events</p>
        </article>
        <article class="host-finance-card card">
          <p class="eyebrow">Estimated Net</p>
          <h3>${typeof formatPrice === 'function' ? formatPrice(finance.estimatedNet, 'UGX') : finance.estimatedNet}</h3>
          <p class="text-muted">After estimated platform fees (8%)</p>
        </article>
        <article class="host-finance-card card">
          <p class="eyebrow">Payout Ready</p>
          <h3>${typeof formatPrice === 'function' ? formatPrice(finance.payoutReady, 'UGX') : finance.payoutReady}</h3>
          <p class="text-muted">Completed events minus approved refunds</p>
        </article>
      </section>
      <section class="host-alerts card" aria-label="Event health alerts">
        <div class="host-panel-head">
          <h3>Event Health Alerts</h3>
          <p class="text-muted">Auto-detected risks and opportunities</p>
        </div>
        <div class="host-alerts-list">
          ${alerts.length ? alerts.map((alert) => `
            <article class="host-alert-item ${escapeHtml(alert.severity)}">
              <span class="host-alert-dot" aria-hidden="true"></span>
              <p>${escapeHtml(alert.message)}</p>
            </article>
          `).join('') : '<p class="text-muted">No urgent alerts. Your events look healthy right now.</p>'}
        </div>
      </section>
      <section class="host-panel card">
        <div class="host-panel-head">
          <h3>Latest Event Performance</h3>
        </div>
        <div class="host-table-wrap">
          <table class="host-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6" class="text-muted">No hosted events yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderTicketingControls(event) {
    const domId = toDomId(event.id);
    const config = getTicketingConfig(event);
    return `
      <section class="host-ticketing card" aria-label="Ticketing controls for ${escapeHtml(event.name || 'event')}">
        <div class="host-panel-head">
          <h4>Ticketing Controls</h4>
          <p class="text-muted">Configure reserve and tier prices</p>
        </div>
        <div class="host-ticket-grid">
          <label>
            Reserve Capacity %
            <input id="tier-reserve-${domId}" type="number" min="0" max="50" step="1" value="${config.reservePercent}" />
          </label>
          <label>
            Early Bird Price
            <input id="tier-early-${domId}" type="number" min="0" step="1000" value="${config.earlyBirdPrice}" />
          </label>
          <label>
            Regular Price
            <input id="tier-regular-${domId}" type="number" min="0" step="1000" value="${config.regularPrice}" />
          </label>
          <label>
            VIP Price
            <input id="tier-vip-${domId}" type="number" min="0" step="1000" value="${config.vipPrice}" />
          </label>
        </div>
        <div class="host-toolbar-actions">
          <button type="button" class="button button-secondary button-small" onclick="TokaHostDashboardController.saveTicketingConfig('${encodeURIComponent(event.id)}')">Save Ticketing</button>
        </div>
      </section>
    `;
  }

  function renderEvents(events) {
    const cards = events.map((event) => {
      const metric = getMetricSafe(event.id);
      const cap = Number(event.capacity || 0);
      const reg = Number(event.registered || 0);
      const fillRate = cap > 0 ? ((reg / cap) * 100).toFixed(1) : '0.0';
      const thumb = typeof getEventThumbnail === 'function' ? getEventThumbnail(event) : '';
      return `
        <article class="host-event-card card">
          <div class="host-event-top">
            ${thumb ? `<img class="host-event-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(event.name || 'Event')} thumbnail" />` : `<div class="host-event-thumb fallback">${escapeHtml(event.emoji || '🎫')}</div>`}
            <div>
              <h3>${escapeHtml(event.name || 'Untitled')}</h3>
              <p class="text-muted">${escapeHtml(event.city || '')} · ${escapeHtml(typeof formatDate === 'function' ? formatDate(event.date) : event.date || '')}</p>
            </div>
          </div>
          <div class="host-event-stats">
            <span>Registered: <strong>${reg}</strong></span>
            <span>Capacity: <strong>${cap}</strong></span>
            <span>Fill: <strong>${fillRate}%</strong></span>
            <span>Revenue: <strong>${typeof formatPrice === 'function' ? formatPrice(metric.ticketRevenueTotal || 0, event.currency || 'UGX') : Number(metric.ticketRevenueTotal || 0)}</strong></span>
          </div>
          <div class="dashboard-actions">
            <button type="button" class="button button-secondary button-small" onclick="openEventDetail('${escapeHtml(event.id)}')">View Event</button>
            <button type="button" class="button button-ghost button-small" onclick="copyToClipboard('toka.app/e/${escapeHtml(event.id)}')">Copy Link</button>
            <button type="button" class="button button-ghost button-small" onclick="TokaHostDashboardController.deleteEvent(decodeURIComponent('${encodeURIComponent(event.id)}'))">Delete</button>
          </div>
          ${renderTicketingControls(event)}
        </article>
      `;
    }).join('');

    return `
      <section class="host-event-grid">${cards || '<article class="card"><p class="text-muted">No hosted events yet.</p></article>'}</section>
    `;
  }

  function renderRefundQueue(events) {
    const requests = getRefundRequests(events);
    const rows = requests.map((request) => {
      const canResolve = request.status === 'pending' || request.status === 'requested';
      return `
        <tr>
          <td>${escapeHtml(request.eventName)}</td>
          <td>${escapeHtml(request.attendee)}</td>
          <td>${typeof formatPrice === 'function' ? formatPrice(request.amount || 0, 'UGX') : Number(request.amount || 0)}</td>
          <td>${escapeHtml(request.reason)}</td>
          <td><span class="host-status-pill ${escapeHtml(request.status)}">${escapeHtml(request.status)}</span></td>
          <td>
            ${canResolve ? `
              <button type="button" class="button button-ghost button-small" onclick="TokaHostDashboardController.updateRefundStatus(decodeURIComponent('${encodeURIComponent(request.id)}'), 'approved')">Approve</button>
              <button type="button" class="button button-ghost button-small" onclick="TokaHostDashboardController.updateRefundStatus(decodeURIComponent('${encodeURIComponent(request.id)}'), 'rejected')">Reject</button>
            ` : '<span class="text-muted">Resolved</span>'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <section class="host-panel card" aria-label="Refund queue">
        <div class="host-panel-head">
          <h3>Refund Queue</h3>
          <p class="text-muted">Manage pending attendee refund requests</p>
        </div>
        <div class="host-table-wrap">
          <table class="host-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Attendee</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6" class="text-muted">No refund requests found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderAnalytics(events) {
    const chartBlocks = events.map((event) => `
      <article class="host-analytics-card card">
        <div class="host-panel-head">
          <h3>${escapeHtml(event.name || 'Untitled')}</h3>
          <p class="text-muted">7-day revenue trend</p>
        </div>
        <div class="dashboard-chart-wrap">
          <canvas id="host-shell-chart-${escapeHtml(event.id)}" height="120" role="img" aria-label="Revenue chart"></canvas>
        </div>
      </article>
    `).join('');

    return `
      ${renderMetricCards(events)}
      <section class="host-analytics-grid">${chartBlocks || '<article class="card"><p class="text-muted">No analytics available yet.</p></article>'}</section>
      ${renderRefundQueue(events)}
    `;
  }

  function renderAudience(events) {
    const audience = getAudienceSegments(events);
    const genderSummary = getTicketsSafe()
      .filter((ticket) => getHostedEventIdSet(events).has(String(ticket.eventId || '')))
      .reduce((acc, ticket) => {
        const gender = String(ticket.gender || '').trim().toLowerCase();
        if (gender === 'female') acc.female += 1;
        else if (gender === 'male') acc.male += 1;
        else acc.unknown += 1;
        return acc;
      }, { female: 0, male: 0, unknown: 0 });
    const knownGenderCount = genderSummary.female + genderSummary.male;
    const totalGenderRecords = knownGenderCount + genderSummary.unknown;
    const qualityMessage = totalGenderRecords === 0
      ? 'No attendee profile data yet. Gender quality will appear as registrations come in.'
      : genderSummary.unknown > 0
        ? `Unknown gender records: ${genderSummary.unknown}. Encourage attendees to complete full profile data during signup.`
        : 'Unknown gender records: 0. Great data quality: all current attendee records have gender filled.';

    const attendeeRows = audience.attendees.map((entry) => `
      <tr>
        <td>${escapeHtml(entry.identity)}</td>
        <td>${entry.ticketCount}</td>
        <td>${entry.eventCount}</td>
        <td>${typeof formatPrice === 'function' ? formatPrice(entry.spend, 'UGX') : entry.spend}</td>
        <td><span class="host-status-pill ${escapeHtml(entry.segment.toLowerCase().replace(/\s+/g, '-'))}">${escapeHtml(entry.segment)}</span></td>
      </tr>
    `).join('');

    return `
      <section class="host-audience-summary" aria-label="Audience segments summary">
        <article class="host-kpi-card"><p>Total Attendees</p><strong>${audience.summary.total}</strong></article>
        <article class="host-kpi-card"><p>Repeat</p><strong>${audience.summary.repeat}</strong></article>
        <article class="host-kpi-card"><p>High Value</p><strong>${audience.summary.highValue}</strong></article>
        <article class="host-kpi-card"><p>Female</p><strong>${genderSummary.female}</strong></article>
        <article class="host-kpi-card"><p>Male</p><strong>${genderSummary.male}</strong></article>
      </section>
      <section class="host-panel card" aria-label="Top attendees">
        <div class="host-panel-head">
          <h3>Top Audience Segments</h3>
          <p class="text-muted">Based on repeat behavior and spend</p>
        </div>
        <div class="host-table-wrap">
          <table class="host-table">
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Tickets</th>
                <th>Events</th>
                <th>Spend</th>
                <th>Segment</th>
              </tr>
            </thead>
            <tbody>
              ${attendeeRows || '<tr><td colspan="5" class="text-muted">No audience ticket records available.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
      <section class="host-panel card" aria-label="Audience quality">
        <div class="host-panel-head">
          <h3>Audience Data Quality</h3>
        </div>
        <p class="text-muted">${qualityMessage}</p>
      </section>
    `;
  }

  function renderFinance(events) {
    const finance = getFinanceBreakdown(events);
    const refunds = getRefundRequests(events);
    const refundByEvent = new Map();

    refunds.forEach((entry) => {
      const current = refundByEvent.get(entry.eventId) || { pending: 0, approved: 0, rejected: 0, amountPending: 0, amountApproved: 0 };
      if (entry.status === 'approved') {
        current.approved += 1;
        current.amountApproved += Number(entry.amount || 0);
      } else if (entry.status === 'rejected') {
        current.rejected += 1;
      } else {
        current.pending += 1;
        current.amountPending += Number(entry.amount || 0);
      }
      refundByEvent.set(entry.eventId, current);
    });

    const financeRows = events.map((event) => {
      const metric = getMetricSafe(event.id);
      const gross = Number(metric.ticketRevenueTotal || 0);
      const fee = gross * 0.08;
      const refundState = refundByEvent.get(event.id) || { pending: 0, approved: 0, rejected: 0, amountPending: 0, amountApproved: 0 };
      const payout = Math.max(gross - fee - refundState.amountApproved, 0);
      return `
        <tr>
          <td>${escapeHtml(event.name || 'Untitled')}</td>
          <td>${typeof formatPrice === 'function' ? formatPrice(gross, event.currency || 'UGX') : gross}</td>
          <td>${typeof formatPrice === 'function' ? formatPrice(fee, event.currency || 'UGX') : fee}</td>
          <td>${refundState.pending}</td>
          <td>${typeof formatPrice === 'function' ? formatPrice(refundState.amountApproved, event.currency || 'UGX') : refundState.amountApproved}</td>
          <td>${typeof formatPrice === 'function' ? formatPrice(payout, event.currency || 'UGX') : payout}</td>
        </tr>
      `;
    }).join('');

    return `
      <section class="host-finance-grid" aria-label="Finance operations summary">
        <article class="host-finance-card card">
          <p class="eyebrow">Net After Refunds</p>
          <h3>${typeof formatPrice === 'function' ? formatPrice(finance.netAfterRefunds, 'UGX') : finance.netAfterRefunds}</h3>
          <p class="text-muted">Estimated net after approved refunds</p>
        </article>
        <article class="host-finance-card card">
          <p class="eyebrow">Pending Refund Exposure</p>
          <h3>${typeof formatPrice === 'function' ? formatPrice(finance.pendingRefundAmount, 'UGX') : finance.pendingRefundAmount}</h3>
          <p class="text-muted">Potential payout reduction</p>
        </article>
        <article class="host-finance-card card">
          <p class="eyebrow">Payout Ready</p>
          <h3>${typeof formatPrice === 'function' ? formatPrice(finance.payoutReady, 'UGX') : finance.payoutReady}</h3>
          <p class="text-muted">Completed events minus approved refunds</p>
        </article>
      </section>
      <section class="host-toolbar card" aria-label="Finance quick actions">
        <div class="host-toolbar-actions">
          <button type="button" class="button button-secondary button-small" onclick="TokaHostDashboardController.exportFinanceCsv()">Export Finance CSV</button>
          <button type="button" class="button button-ghost button-small" onclick="TokaHostDashboardController.navigate('analytics')">Open Refund Queue</button>
        </div>
      </section>
      <section class="host-panel card" aria-label="Event finance ledger">
        <div class="host-panel-head">
          <h3>Event Finance Ledger</h3>
          <p class="text-muted">Revenue, fees, refunds, payout per event</p>
        </div>
        <div class="host-table-wrap">
          <table class="host-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Gross</th>
                <th>Fee (8%)</th>
                <th>Pending Refunds</th>
                <th>Approved Refund Amount</th>
                <th>Payout Ready</th>
              </tr>
            </thead>
            <tbody>
              ${financeRows || '<tr><td colspan="6" class="text-muted">No finance records available.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function applyTitle(route) {
    const titleEl = document.querySelector('#host-dashboard-title');
    const routeLabel = document.querySelector('#host-dashboard-route-label');
    const labels = {
      dashboard: 'Overview',
      events: 'Events',
      analytics: 'Analytics',
      audience: 'Audience',
      finance: 'Finance'
    };
    const label = labels[route] || 'Overview';
    if (titleEl) {
      titleEl.textContent = `Host Dashboard · ${label}`;
    }
    if (routeLabel) {
      routeLabel.textContent = label;
    }
  }

  function setActiveNav(route) {
    const navButtons = document.querySelectorAll('#host-admin-nav [data-host-route]');
    navButtons.forEach((button) => {
      const active = String(button.getAttribute('data-host-route') || '') === route;
      button.classList.toggle('active', active);
    });
  }

  function mountCharts(events) {
    if (typeof Chart === 'undefined' || typeof getRevenueSeries !== 'function') {
      return;
    }

    if (typeof TOKA_APP_STATE === 'object' && TOKA_APP_STATE.hostChartInstances) {
      Object.values(TOKA_APP_STATE.hostChartInstances).forEach((chart) => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      TOKA_APP_STATE.hostChartInstances = {};
    }

    events.forEach((event) => {
      const canvas = document.getElementById(`host-shell-chart-${event.id}`);
      if (!canvas) {
        return;
      }
      const series = getRevenueSeries(event.id, 7);
      const chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: series.map((point) => point.label),
          datasets: [{
            label: 'Revenue',
            data: series.map((point) => point.revenue),
            borderColor: '#F4500A',
            backgroundColor: 'rgba(244, 80, 10, 0.18)',
            fill: true,
            tension: 0.35
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { color: '#A3A3A3' }, grid: { color: 'rgba(255,255,255,0.08)' } },
            x: { ticks: { color: '#A3A3A3' }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      });

      if (typeof TOKA_APP_STATE === 'object' && TOKA_APP_STATE.hostChartInstances) {
        TOKA_APP_STATE.hostChartInstances[event.id] = chart;
      }
    });
  }

  function render() {
    bindNav();

    const guard = document.querySelector('#host-dashboard-guard');
    const content = document.querySelector('#host-dashboard-content');
    const hosted = getHostedEventsSafe();

    if (!guard || !content) {
      return;
    }

    if (!hasHostDashboardAccessSafe()) {
      guard.classList.remove('hidden');
      guard.innerHTML = `
        <h3>Host access only</h3>
        <p class="text-muted">Sign in with the account that created a host event to open this dashboard.</p>
        <button type="button" class="button button-primary" onclick="showScreen('screen-host')">Create Event</button>
      `;
      content.innerHTML = '';
      return;
    }

    if (!hosted.length) {
      guard.classList.remove('hidden');
      content.innerHTML = '';
      return;
    }

    guard.classList.add('hidden');

    const route = getRouteFromHash();
    setActiveNav(route);
    applyTitle(route);

    if (route === 'events') {
      content.innerHTML = renderEvents(hosted);
      return;
    }
    if (route === 'analytics') {
      content.innerHTML = renderAnalytics(hosted);
      mountCharts(hosted);
      return;
    }
    if (route === 'audience') {
      content.innerHTML = renderAudience(hosted);
      return;
    }
    if (route === 'finance') {
      content.innerHTML = renderFinance(hosted);
      return;
    }

    content.innerHTML = renderOverview(hosted);
  }

  function navigate(route) {
    const normalized = String(route || 'dashboard').toLowerCase();
    window.location.hash = `#/host/${normalized}`;
    if (typeof showScreen === 'function') {
      showScreen('screen-host-dashboard');
    }
  }

  function exportCsv() {
    const hosted = getHostedEventsSafe();
    if (!hosted.length) {
      if (typeof toast === 'function') {
        toast('No hosted events to export yet.');
      }
      return;
    }

    const csv = buildEventsCsv(hosted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `toka-host-report-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof toast === 'function') {
      toast('Host report CSV downloaded.');
    }
  }

  function exportFinanceCsv() {
    const hosted = getHostedEventsSafe();
    if (!hosted.length) {
      if (typeof toast === 'function') {
        toast('No finance records to export yet.');
      }
      return;
    }

    const csv = buildFinanceCsv(hosted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `toka-host-finance-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof toast === 'function') {
      toast('Finance CSV downloaded.');
    }
  }

  function deleteEvent(eventId) {
    const safeId = String(eventId || '').trim();
    if (!safeId) {
      return;
    }

    const hosted = getHostedEventsSafe();
    const event = hosted.find((item) => String(item && item.id || '') === safeId);
    const label = event && event.name ? event.name : 'this event';
    const confirmed = window.confirm(`Delete ${label}? This removes the event and related local records.`);
    if (!confirmed) {
      return;
    }

    if (typeof window.deleteSavedEvent !== 'function') {
      if (typeof toast === 'function') {
        toast('Delete helper is unavailable. Please refresh and try again.');
      }
      return;
    }

    const deleted = window.deleteSavedEvent(safeId);
    if (typeof toast === 'function') {
      toast(deleted ? 'Event deleted.' : 'Event not found.');
    }
    render();
  }

  function bindNav() {
    const nav = document.querySelector('#host-admin-nav');
    if (!nav || nav.dataset.bound === '1') {
      return;
    }

    nav.addEventListener('click', (event) => {
      const target = event.target.closest('[data-host-route]');
      if (!target) {
        return;
      }
      const route = target.getAttribute('data-host-route') || 'dashboard';
      navigate(route);
    });

    nav.dataset.bound = '1';
  }

  window.TokaHostDashboardController = {
    render,
    navigate,
    bindNav,
    exportCsv,
    exportFinanceCsv,
    deleteEvent,
    saveTicketingConfig: (encodedEventId) => saveTicketingConfig(decodeURIComponent(encodedEventId)),
    updateRefundStatus
  };

  if (typeof TOKA_APP_STATE === 'object' && TOKA_APP_STATE.currentScreen === 'screen-host-dashboard') {
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindNav();
  });
})();