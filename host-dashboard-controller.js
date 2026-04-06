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

        function getMetricSafe(eventId) {
            if (typeof getEventMetric === 'function') {
                return getEventMetric(eventId) || {};
            }
            return {};
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
          </div>
        </article>
      `;
    }).join('');

    return `
      <section class="host-event-grid">${cards || '<article class="card"><p class="text-muted">No hosted events yet.</p></article>'}</section>
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
    `;
  }

  function renderAudience(events) {
    const cards = events.map((event) => {
      const metric = getMetricSafe(event.id);
      const impressions = Number(metric.impressions || 0);
      const sold = Number(metric.ticketSalesCount || 0);
      const conversion = impressions > 0 ? ((sold / impressions) * 100).toFixed(1) : '0.0';
      return `
        <article class="host-audience-card card">
          <h3>${escapeHtml(event.name || 'Untitled')}</h3>
          <div class="host-audience-grid">
            <span>Impressions <strong>${impressions}</strong></span>
            <span>Tickets Sold <strong>${sold}</strong></span>
            <span>Conversion <strong>${conversion}%</strong></span>
          </div>
        </article>
      `;
    }).join('');

    return `
      <section class="host-audience-stack">${cards || '<article class="card"><p class="text-muted">No audience data yet.</p></article>'}</section>
    `;
  }

  function applyTitle(route) {
    const titleEl = document.querySelector('#host-dashboard-title');
    const routeLabel = document.querySelector('#host-dashboard-route-label');
    const labels = {
      dashboard: 'Overview',
      events: 'Events',
      analytics: 'Analytics',
      audience: 'Audience'
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

    content.innerHTML = renderOverview(hosted);
  }

  function navigate(route) {
    const normalized = String(route || 'dashboard').toLowerCase();
    window.location.hash = `#/host/${normalized}`;
    if (typeof showScreen === 'function') {
      showScreen('screen-host-dashboard');
    }
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
    bindNav
  };

  if (typeof TOKA_APP_STATE === 'object' && TOKA_APP_STATE.currentScreen === 'screen-host-dashboard') {
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindNav();
  });
})();