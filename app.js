/* global MOCK_EVENTS, TOKA_CATEGORY_OPTIONS, TOKA_INTEREST_OPTIONS, TOKA_STORAGE_KEYS, getEvents, getOnboardingComplete, getReferralCode, getTickets, getUserProfile, saveEvent, saveTicket, saveUserProfile, setOnboardingComplete, setReferralCode, generateTicketCode, generateReferralCode */

const TOKA_APP_STATE = {
    currentScreen: 'screen-home',
    selectedEventId: null,
    selectedRegisterEventId: null,
    homeCategory: 'All',
    discoverCategory: 'All',
    discoverTimeFilter: 'All',
    discoverQuery: '',
    onboardingStep: 1,
    onboardingTouchStartX: 0,
    hostStep: 1,
    hostSubmitted: false,
    ticketToastTimer: null
};

const TOKA_AVATAR_COLORS = ['#F4500A', '#F7B731', '#C6F135', '#2E2E2E', '#7B3F00', '#D16B34', '#AA4C1D', '#5C3B1E'];

function qs(selector, root = document) {
    return root.querySelector(selector);
}

function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getInitials(name) {
    return String(name || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'T';
}

function hashString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getAvatarColor(name) {
    return TOKA_AVATAR_COLORS[hashString(String(name || 'Toka')) % TOKA_AVATAR_COLORS.length];
}

function formatPrice(price, currency) {
    if (!price) {
        return 'Free';
    }

    return `${currency || 'UGX'} ${Number(price).toLocaleString('en-US')}`;
}

function formatDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

function formatDateTime(event) {
    return `${formatDate(event.date)} · ${event.time} - ${event.endTime}`;
}

function getEventById(eventId) {
    return getEvents().find((event) => event.id === eventId) || null;
}

function getUpcomingEvents(count = 3) {
    return getEvents().slice(0, count);
}

function toast(message) {
    const toastEl = qs('#app-toast');
    if (!toastEl) {
        return;
    }

    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(TOKA_APP_STATE.ticketToastTimer);
    TOKA_APP_STATE.ticketToastTimer = window.setTimeout(() => {
        toastEl.classList.remove('show');
    }, 1800);
}

function updateBottomNavActive(screenId) {
    qsa('.nav-item').forEach((button) => {
        const targetScreen = button.dataset.screen;
        button.classList.toggle('active', targetScreen === screenId);
    });
}

function showScreen(screenId) {
    TOKA_APP_STATE.currentScreen = screenId;
    qsa('.screen').forEach((screen) => {
        screen.classList.toggle('active', screen.id === screenId);
    });

    const onboardingShell = qs('#bottom-nav');
    if (onboardingShell) {
        onboardingShell.classList.toggle('hidden', screenId === 'screen-onboarding');
    }

    if (screenId !== 'screen-onboarding') {
        updateBottomNavActive(screenId);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (screenId === 'screen-home') {
        renderHome();
    }
    if (screenId === 'screen-discover') {
        renderDiscover();
    }
    if (screenId === 'screen-my-tickets') {
        renderTickets();
    }
    if (screenId === 'screen-profile') {
        renderProfile();
    }
    if (screenId === 'screen-host') {
        renderHostScreen();
    }
}

function setDiscoverFilters({ query = TOKA_APP_STATE.discoverQuery, category = TOKA_APP_STATE.discoverCategory, timeFilter = TOKA_APP_STATE.discoverTimeFilter } = {}) {
    TOKA_APP_STATE.discoverQuery = query;
    TOKA_APP_STATE.discoverCategory = category;
    TOKA_APP_STATE.discoverTimeFilter = timeFilter;
    renderDiscover();
}

function setHomeCategory(category) {
    TOKA_APP_STATE.homeCategory = category;
    TOKA_APP_STATE.discoverCategory = category === 'All' ? 'All' : category;
    TOKA_APP_STATE.discoverTimeFilter = 'All';
    TOKA_APP_STATE.discoverQuery = '';
    const searchInput = qs('#discover-search');
    if (searchInput) {
        searchInput.value = '';
    }
    showScreen('screen-discover');
}

function getFilteredEvents() {
    const events = getEvents();
    const query = TOKA_APP_STATE.discoverQuery.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.filter((event) => {
        const matchesQuery = !query || [event.name, event.venue, event.city, event.organiser, ...(event.tags || [])].join(' ').toLowerCase().includes(query);
        const matchesCategory = TOKA_APP_STATE.discoverCategory === 'All' || event.category === TOKA_APP_STATE.discoverCategory;
        const eventDate = new Date(`${event.date}T12:00:00`);
        const diffDays = Math.floor((eventDate - today) / 86400000);

        let matchesTime = true;
        if (TOKA_APP_STATE.discoverTimeFilter === 'Today') {
            matchesTime = diffDays === 0;
        } else if (TOKA_APP_STATE.discoverTimeFilter === 'This Week') {
            matchesTime = diffDays >= 0 && diffDays <= 6;
        } else if (TOKA_APP_STATE.discoverTimeFilter === 'This Weekend') {
            const dayOfWeek = eventDate.getDay();
            matchesTime = diffDays >= 0 && (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0);
        } else if (TOKA_APP_STATE.discoverTimeFilter === 'Free') {
            matchesTime = Number(event.price) === 0;
        } else if (TOKA_APP_STATE.discoverTimeFilter === 'Paid') {
            matchesTime = Number(event.price) > 0;
        }

        return matchesQuery && matchesCategory && matchesTime;
    });
}

function renderCategoryChips(container, activeCategory, onClickHandler) {
    if (!container) {
        return;
    }

    const chips = ['All', ...TOKA_CATEGORY_OPTIONS];
    container.innerHTML = chips.map((category) => `
    <button type="button" class="chip ${category === activeCategory ? 'active' : ''}" onclick="${onClickHandler}('${category.replace(/'/g, "\\'")}')">${escapeHtml(category)}</button>
  `).join('');
}

function renderTimeChips() {
    const container = qs('#discover-time-filters');
    if (!container) {
        return;
    }

    const filters = ['All', 'Today', 'This Week', 'This Weekend', 'Free', 'Paid'];
    container.innerHTML = filters.map((filter) => `
    <button type="button" class="chip ${filter === TOKA_APP_STATE.discoverTimeFilter ? 'active' : ''}" onclick="setDiscoverTimeFilter('${filter.replace(/'/g, "\\'")}')">${escapeHtml(filter)}</button>
  `).join('');
}

function renderEventCards(events, container, options = {}) {
    if (!container) {
        return;
    }

    if (options.skeleton) {
        container.innerHTML = Array.from({ length: options.count || 6 }).map(() => `
      <article class="event-card skeleton-card">
        <div class="event-cover shimmer"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line tiny"></div>
      </article>
    `).join('');
        return;
    }

    if (!events.length) {
        container.innerHTML = `
      <div class="empty-state card">
        <p class="empty-state-title">No events match this view.</p>
        <p class="text-muted">Try another search, time filter, or category chip.</p>
      </div>
    `;
        return;
    }

    container.innerHTML = events.map((event) => {
        const isFree = Number(event.price) === 0;
        return `
      <article class="event-card" style="--card-gradient: ${event.gradient || 'linear-gradient(135deg, #2E2E2E, #F4500A)'}">
        <div class="event-cover">
          <div class="event-emoji">${escapeHtml(event.emoji || '🎫')}</div>
          <div class="event-cover-overlay"></div>
        </div>
        <div class="event-card-body">
          <div class="event-card-topline">
            <span class="badge">${escapeHtml(event.category)}</span>
            <span class="event-price">${escapeHtml(formatPrice(event.price, event.currency))}</span>
          </div>
          <h3 class="event-title">${escapeHtml(event.name)}</h3>
          <p class="event-meta">${escapeHtml(formatDateTime(event))}</p>
          <p class="event-meta">${escapeHtml(event.city)} · ${escapeHtml(event.venue)}</p>
          <div class="event-card-bottom">
            <span class="event-capacity">${escapeHtml(String(event.registered || 0))} going</span>
            <button type="button" class="button button-primary button-small" onclick="openEventDetail('${event.id}')">Get Ticket</button>
          </div>
        </div>
      </article>
    `;
    }).join('');
}

function renderHome() {
    const categoryContainer = qs('#home-category-chips');
    const upcomingContainer = qs('#home-upcoming-grid');
    renderCategoryChips(categoryContainer, TOKA_APP_STATE.homeCategory, 'applyHomeCategory');
    renderEventCards(getUpcomingEvents(3), upcomingContainer);
}

function renderDiscover() {
    const searchInput = qs('#discover-search');
    const resultsContainer = qs('#discover-results');
    const activeEvents = getFilteredEvents();

    if (searchInput && searchInput.value !== TOKA_APP_STATE.discoverQuery) {
        searchInput.value = TOKA_APP_STATE.discoverQuery;
    }

    renderTimeChips();
    renderCategoryChips(qs('#discover-category-chips'), TOKA_APP_STATE.discoverCategory, 'setDiscoverCategory');
    renderEventCards(activeEvents, resultsContainer);
}

function renderDetailScreen(event) {
    if (!event) {
        return;
    }

    const cover = qs('#detail-hero');
    const title = qs('#detail-title');
    const organiser = qs('#detail-organiser');
    const badge = qs('#detail-badge');
    const description = qs('#detail-description');
    const meta = qs('#detail-meta');
    const ticketButton = qs('#detail-ticket-button');
    const going = qs('#detail-going');
    const priceLine = qs('#detail-price-line');

    if (cover) {
        cover.style.setProperty('--card-gradient', event.gradient || 'linear-gradient(135deg, #2E2E2E, #F4500A)');
        cover.querySelector('.detail-hero-emoji').textContent = event.emoji || '🎫';
    }
    if (title) title.textContent = event.name;
    if (organiser) organiser.innerHTML = `<span class="avatar initials" style="background:${getAvatarColor(event.organiser)}">${escapeHtml(getInitials(event.organiser))}</span><span>${escapeHtml(event.organiser)}</span>`;
    if (badge) badge.textContent = event.category;
    if (description) description.textContent = event.description;
    if (meta) {
        meta.innerHTML = `
      <div class="info-row"><span class="info-icon">📅</span><span>${escapeHtml(formatDateTime(event))}</span></div>
      <div class="info-row"><span class="info-icon">📍</span><span>${escapeHtml(event.venue)}, ${escapeHtml(event.city)}</span></div>
      <div class="info-row"><span class="info-icon">👥</span><span>${escapeHtml(String(event.capacity || 0))} capacity</span></div>
    `;
    }
    if (ticketButton) {
        ticketButton.textContent = event.price > 0 ? `Get Ticket · ${formatPrice(event.price, event.currency)}` : 'Get Free Ticket';
    }
    if (priceLine) {
        priceLine.textContent = `${event.price > 0 ? formatPrice(event.price, event.currency) : 'Free'} · General Admission`;
    }
    if (going) {
        const attendees = Array.isArray(event.attendees) ? event.attendees.slice(0, 5) : [];
        const moreCount = Math.max(0, (event.attendees || []).length - attendees.length);
        going.innerHTML = `
      <div class="avatar-stack">
        ${attendees.map((attendee) => `<span class="avatar" title="${escapeHtml(attendee)}" style="background:${getAvatarColor(attendee)}">${escapeHtml(getInitials(attendee))}</span>`).join('')}
        ${moreCount > 0 ? `<span class="avatar avatar-more">+${moreCount}</span>` : ''}
      </div>
    `;
  }
}

function openEventDetail(eventId) {
  const event = getEventById(eventId);
  if (!event) {
    return;
  }

  TOKA_APP_STATE.selectedEventId = eventId;
  renderDetailScreen(event);

  // Store event context for engagement actions.
  const detailScreen = document.getElementById('screen-event-detail');
  if (detailScreen) {
    detailScreen.setAttribute('data-event-id', eventId);
  }

  // Load comments and organiser updates before opening the detail screen.
  loadEventEngagement(eventId);
  showScreen('screen-event-detail');
}

// -- MAIN LOADER ----------------------------------------------------------
function loadEventEngagement(eventId) {
  renderUpdates(eventId);
  renderComments(eventId);
  setupEngagementUI(eventId);
}

// -- RENDER ORGANISER UPDATES ---------------------------------------------
function renderUpdates(eventId) {
  const updates = getUpdates(eventId);
  const list = document.getElementById('updates-list');

  if (!list) {
    return;
  }

  if (updates.length === 0) {
    list.innerHTML = `
      <div class="empty-updates" id="empty-updates">
        <p>No updates yet. Check back closer to the event.</p>
      </div>
    `;
    return;
  }

  const sorted = updates.slice().sort((left, right) => right.timestamp - left.timestamp);
  list.innerHTML = sorted.map((update) => {
    const typeClass = 'update-' + (update.type || 'info');
    const timeAgo = formatTimeAgo(update.timestamp);
    return `
      <div class="update-card ${typeClass}">
        <div class="update-header">
          <span class="update-icon">${getUpdateIcon(update.type)}</span>
          <span class="update-label">Organiser Update</span>
          <span class="update-time">${timeAgo}</span>
        </div>
        <p class="update-text">${escapeHtml(update.text)}</p>
      </div>
    `;
  }).join('');
}

function getUpdateIcon(type) {
  if (type === 'warning') {
    return '⚠️';
  }
  if (type === 'exciting') {
    return '🎉';
  }
  return '📣';
}

// -- RENDER COMMENTS -------------------------------------------------------
function renderComments(eventId) {
  const comments = getComments(eventId);
  const list = document.getElementById('comments-list');
  const badge = document.getElementById('comment-count-badge');
  const profile = getUserProfile();

  if (!list) {
    return;
  }

  if (badge) {
    badge.textContent = comments.length;
  }

  if (comments.length === 0) {
    list.innerHTML = `
      <div class="empty-comments" id="empty-comments">
        <p>Be the first to say something. 👋</p>
        <p class="empty-sub">Only ticket holders can comment.</p>
      </div>
    `;
    return;
  }

  const sorted = comments.slice().sort((left, right) => left.timestamp - right.timestamp);
  const currentUser = profile ? profile.name : null;

  list.innerHTML = sorted.map((comment) => {
    const isOwn = currentUser && comment.author === currentUser;
    const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
    const likes = Number(comment.likes || 0);
    const hasLiked = profile && likedBy.indexOf(profile.name) !== -1;
    const timeAgo = formatTimeAgo(comment.timestamp);

    return `
      <div class="comment-item${isOwn ? ' own-comment' : ''}" data-comment-id="${escapeHtml(comment.id)}">
        <div class="comment-avatar" style="background:${escapeHtml(comment.color || '#F4500A')}">
          ${escapeHtml(comment.initials || getInitials(comment.author))}
        </div>
        <div class="comment-body">
          <div class="comment-meta">
            <span class="comment-author">${escapeHtml(comment.author)}${isOwn ? ' <span class="you-badge">You</span>' : ''}</span>
            <span class="comment-time">${timeAgo}</span>
          </div>
          <p class="comment-text">${escapeHtml(comment.text)}</p>
          <div class="comment-actions">
            <button class="like-btn${hasLiked ? ' liked' : ''}" onclick="handleLike('${eventId}', '${comment.id}')">
              ${hasLiked ? '❤️' : '🤍'} <span class="like-count">${likes}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.scrollTop = list.scrollHeight;
}

// -- SETUP UI VISIBILITY ---------------------------------------------------
function setupEngagementUI(eventId) {
  const profile = getUserProfile();
  const event = getEvents().find((item) => item.id === eventId);
  const hasTicket = userHasTicket(eventId);
  const isOrganiser = event ? userIsOrganiser(event) : false;

  const canComment = document.getElementById('can-comment');
  const cannotComment = document.getElementById('cannot-comment');
  const commenterAvatar = document.getElementById('commenter-avatar');

  if (hasTicket && profile && profile.name) {
    if (canComment) {
      canComment.style.display = 'block';
    }
    if (cannotComment) {
      cannotComment.style.display = 'none';
    }
    if (commenterAvatar) {
      commenterAvatar.textContent = getInitials(profile.name);
      commenterAvatar.style.background = getAvatarColor(profile.name);
    }
  } else {
    if (canComment) {
      canComment.style.display = 'none';
    }
    if (cannotComment) {
      cannotComment.style.display = 'flex';
    }
  }

  const updateForm = document.getElementById('post-update-form');
  if (updateForm) {
    updateForm.style.display = isOrganiser ? 'block' : 'none';
  }

  setupCharCount('comment-input', 'comment-char-count', 200);
  setupCharCount('update-input', 'update-char-count', 280);
}

// -- POST A COMMENT --------------------------------------------------------
function postComment() {
  const input = document.getElementById('comment-input');
  const profile = getUserProfile();

  if (!input || !profile || !profile.name) {
    return;
  }

  const text = input.value.trim();
  if (text.length === 0) {
    shakeElement(input);
    return;
  }
  if (text.length > 200) {
    return;
  }

  const eventId = document.getElementById('screen-event-detail')?.getAttribute('data-event-id');
  if (!eventId || !userHasTicket(eventId)) {
    return;
  }

  const comment = {
    id: 'cmt_' + Date.now(),
    eventId,
    author: profile.name,
    initials: getInitials(profile.name),
    color: getAvatarColor(profile.name),
    text,
    timestamp: Date.now(),
    likes: 0,
    likedBy: []
  };

  saveComment(eventId, comment);
  input.value = '';

  const counter = document.getElementById('comment-char-count');
  if (counter) {
    counter.textContent = '200 left';
    counter.style.color = '';
  }

  renderComments(eventId);

  const btn = document.querySelector('.btn-post-comment');
  if (btn) {
    btn.textContent = 'Sent ✓';
    btn.style.background = '#2E9E6B';
    setTimeout(() => {
      btn.textContent = 'Send 🔥';
      btn.style.background = '';
    }, 1500);
  }
}

// -- POST AN ORGANISER UPDATE ---------------------------------------------
function postOrgUpdate() {
  const input = document.getElementById('update-input');
  if (!input) {
    return;
  }

  const text = input.value.trim();
  if (text.length === 0) {
    shakeElement(input);
    return;
  }
  if (text.length > 280) {
    return;
  }

  const eventId = document.getElementById('screen-event-detail')?.getAttribute('data-event-id');
  const event = eventId ? getEventById(eventId) : null;
  if (!eventId || !event || !userIsOrganiser(event)) {
    return;
  }

  let type = 'info';
  const lower = text.toLowerCase();
  if (lower.includes('cancel') || lower.includes('postpone') || lower.includes('change') || lower.includes('moved')) {
    type = 'warning';
  } else if (lower.includes('excited') || lower.includes('surprise') || lower.includes('added') || lower.includes('bonus') || lower.includes('confirmed') || lower.includes('🎉')) {
    type = 'exciting';
  }

  const update = {
    id: 'upd_' + Date.now(),
    eventId,
    text,
    timestamp: Date.now(),
    type
  };

  saveUpdate(eventId, update);
  input.value = '';

  const counter = document.getElementById('update-char-count');
  if (counter) {
    counter.textContent = '280 left';
    counter.style.color = '';
  }

  renderUpdates(eventId);

  const btn = document.querySelector('.btn-post-update');
  if (btn) {
    btn.textContent = 'Posted ✓';
    btn.style.background = '#2E9E6B';
    setTimeout(() => {
      btn.textContent = '📣 Post Update';
      btn.style.background = '';
    }, 1800);
  }
}

// -- LIKE A COMMENT --------------------------------------------------------
function handleLike(eventId, commentId) {
  const profile = getUserProfile();
  if (!profile || !profile.name) {
    return;
  }

  const newLikes = toggleLike(eventId, commentId);
  if (newLikes === undefined) {
    return;
  }

  const commentEl = document.querySelector('[data-comment-id="' + commentId + '"]');
  if (!commentEl) {
    return;
  }

  const likeBtn = commentEl.querySelector('.like-btn');
  const comment = getComments(eventId).find((item) => item.id === commentId);
  if (!likeBtn || !comment) {
    return;
  }

  const hasLiked = Array.isArray(comment.likedBy) && comment.likedBy.indexOf(profile.name) !== -1;
  likeBtn.className = 'like-btn' + (hasLiked ? ' liked' : '');
  likeBtn.innerHTML = `${hasLiked ? '❤️' : '🤍'} <span class="like-count">${newLikes}</span>`;

  likeBtn.style.transform = 'scale(1.3)';
  setTimeout(() => {
    likeBtn.style.transform = 'scale(1)';
  }, 200);
}

// -- UTILITY ---------------------------------------------------------------
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return 'just now';
  }
  if (seconds < 3600) {
    return Math.floor(seconds / 60) + 'm ago';
  }
  if (seconds < 86400) {
    return Math.floor(seconds / 3600) + 'h ago';
  }
  return Math.floor(seconds / 86400) + 'd ago';
}

function setupCharCount(inputId, counterId, maxLength) {
  const input = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (!input || !counter) {
    return;
  }

  const updateCount = () => {
    const remaining = maxLength - input.value.length;
    counter.textContent = remaining + ' left';
    counter.style.color = remaining < 20 ? '#F4500A' : '';
  };

  input.oninput = updateCount;
  updateCount();
}

function shakeElement(element) {
  element.style.animation = 'shake 0.3s ease';
  setTimeout(() => {
    element.style.animation = '';
  }, 300);
}

function openRegistration(eventId) {
  const event = getEventById(eventId || TOKA_APP_STATE.selectedEventId);
  if (!event) {
    return;
  }

  TOKA_APP_STATE.selectedRegisterEventId = event.id;
  renderRegistrationScreen(event);
  showScreen('screen-register');
}

function renderRegistrationScreen(event) {
  const summary = qs('#register-summary');
  const methodContainer = qs('#payment-methods');
  const form = qs('#register-form');
  const paymentPhone = qs('#payment-phone');
  const profile = getUserProfile();

  if (summary) {
    summary.innerHTML = `
      <div>
        <p class="eyebrow">Registering for</p>
        <h3>${escapeHtml(event.name)}</h3>
        <p class="text-muted">${escapeHtml(formatDateTime(event))}</p>
      </div>
      <div class="register-summary-price">${escapeHtml(formatPrice(event.price, event.currency))}</div>
    `;
  }

  if (form) {
    form.dataset.eventId = event.id;
    const fullName = qs('#register-name');
    const phone = qs('#register-phone');
    const email = qs('#register-email');
    const source = qs('#register-source');
    if (fullName && !fullName.value) fullName.value = profile.name || '';
    if (phone && !phone.value) phone.value = profile.phone || '';
    if (email && !email.value) email.value = profile.email || '';
    if (source && !source.value) source.value = 'WhatsApp';
  }

  if (paymentPhone) {
    paymentPhone.value = qs('#register-phone')?.value || profile.phone || '';
  }

  if (methodContainer) {
    const isFreeEvent = event.price === 0;
    const freeOption = event.price === 0 ? `
      <label class="payment-option radio-card ${isFreeEvent ? 'active' : ''}">
        <input type="radio" name="paymentMethod" value="Free" ${isFreeEvent ? 'checked' : ''} />
        <span>
          <strong>Free</strong>
          <small>Skip payment and confirm instantly.</small>
        </span>
      </label>
    ` : '';

    methodContainer.innerHTML = `
      <label class="payment-option radio-card ${isFreeEvent ? '' : 'active'}">
        <input type="radio" name="paymentMethod" value="MTN Mobile Money" ${isFreeEvent ? '' : 'checked'} />
        <span>
          <strong>MTN Mobile Money</strong>
          <small>Default mobile money option.</small>
        </span>
      </label>
      <label class="payment-option radio-card">
        <input type="radio" name="paymentMethod" value="Airtel Money" />
        <span>
          <strong>Airtel Money</strong>
          <small>Alternative mobile money checkout.</small>
        </span>
      </label>
      ${freeOption}
    `;
  }

  togglePaymentNumberInput();
}

function renderConfirmation(ticket) {
  const event = getEventById(ticket.eventId) || ticket.eventSnapshot;
  if (!event) {
    return;
  }

  const codeEl = qs('#confirmed-code');
  const eventEl = qs('#confirmed-event-name');
  const attendeeEl = qs('#confirmed-attendee');
  const dateEl = qs('#confirmed-event-date');
  const referralEl = qs('#confirmed-referral');
  const qrEl = qs('#confirmed-qr');

  if (codeEl) codeEl.textContent = ticket.ticketCode;
  if (eventEl) eventEl.textContent = event.name;
  if (attendeeEl) attendeeEl.textContent = ticket.fullName;
  if (dateEl) dateEl.textContent = formatDateTime(event);
  if (referralEl) referralEl.textContent = `toka.app/ref/${ticket.referralCode}`;
  if (qrEl) {
    qrEl.innerHTML = `<div class="qr-mark">T</div>`;
  }

  const shareButton = qs('#confirmed-share-button');
  if (shareButton) {
    shareButton.onclick = () => shareTicket(ticket.ticketCode, event.name);
  }

  const copyButton = qs('#confirmed-copy-button');
  if (copyButton) {
    copyButton.onclick = () => copyToClipboard(`toka.app/ref/${ticket.referralCode}`);
  }
}

function submitRegistration(event) {
  const form = qs('#register-form');
  if (!form) {
    return;
  }

  const fullName = qs('#register-name')?.value.trim();
  const phone = qs('#register-phone')?.value.trim();
  const email = qs('#register-email')?.value.trim();
  const source = qs('#register-source')?.value || 'WhatsApp';
  const paymentMethod = qs('input[name="paymentMethod"]:checked')?.value || 'MTN Mobile Money';
  const paymentPhone = qs('#payment-phone')?.value.trim();
  const agreed = qs('#register-terms')?.checked;

  if (!fullName || !phone || !agreed) {
    toast('Please complete the required fields and accept the terms.');
    return;
  }

  if (event.price > 0 && paymentMethod !== 'Free' && !paymentPhone) {
    toast('Enter the number to charge.');
    return;
  }

  const profile = saveUserProfile({
    name: fullName,
    phone,
    email,
    interests: getUserProfile().interests || []
  });

  if (!getReferralCode()) {
    setReferralCode(generateReferralCode(profile.name));
  }

  const ticket = {
    id: `ticket-${Date.now()}`,
    eventId: event.id,
    eventSnapshot: { ...event },
    ticketCode: generateTicketCode(),
    fullName,
    phone,
    email,
    source,
    paymentMethod,
    paymentPhone: paymentPhone || phone,
    createdAt: new Date().toISOString(),
    status: 'Confirmed',
    referralCode: getReferralCode() || generateReferralCode(fullName)
  };

  saveTicket(ticket);

  const updatedEvent = {
    ...event,
    registered: Number(event.registered || 0) + 1,
    attendees: Array.isArray(event.attendees) ? [...event.attendees, fullName] : [fullName]
  };
  saveEvent(updatedEvent);

  renderHome();
  renderDiscover();
  renderTickets();
  renderProfile();
  renderConfirmation(ticket);
  TOKA_APP_STATE.selectedRegisterEventId = event.id;
  showScreen('screen-ticket-confirmed');
  toast('Ticket confirmed.');
}

function renderTickets() {
  const tickets = getTickets();
  const emptyState = qs('#tickets-empty');
  const list = qs('#tickets-list');

  if (!list || !emptyState) {
    return;
  }

  if (!tickets.length) {
    emptyState.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');
  list.innerHTML = tickets.map((ticket) => {
    const event = ticket.eventSnapshot || getEventById(ticket.eventId);
    const status = event ? (new Date(`${event.date}T12:00:00`) >= new Date(new Date().setHours(0, 0, 0, 0)) ? 'Upcoming' : 'Past') : 'Upcoming';
    return `
      <article class="ticket-card">
        <button type="button" class="ticket-card-header" data-ticket-id="${escapeHtml(ticket.id)}">
          <div>
            <p class="eyebrow">${escapeHtml(status)}</p>
            <h3>${escapeHtml(event ? event.name : 'Ticket')}</h3>
            <p class="text-muted">${escapeHtml(event ? formatDateTime(event) : '')}</p>
          </div>
          <div class="ticket-code-badge">${escapeHtml(ticket.ticketCode)}</div>
        </button>
        <div class="ticket-card-body hidden" id="ticket-body-${escapeHtml(ticket.id)}">
          <p><strong>Holder:</strong> ${escapeHtml(ticket.fullName)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(ticket.phone)}</p>
          <p><strong>Payment:</strong> ${escapeHtml(ticket.paymentMethod)}</p>
          <p><strong>Source:</strong> ${escapeHtml(ticket.source)}</p>
          <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketCode)}</p>
        </div>
      </article>
    `;
  }).join('');
}

function toggleTicketBody(ticketId) {
  const body = qs(`#ticket-body-${ticketId}`);
  if (!body) {
    return;
  }
  body.classList.toggle('hidden');
}

function renderProfile() {
  const profile = getUserProfile();
  const avatar = qs('#profile-avatar');
  const name = qs('#profile-name');
  const phone = qs('#profile-phone');
  const stats = qs('#profile-stats');
  const interests = qs('#profile-interests');
  const settings = qs('#profile-settings');
  const referralCode = getReferralCode();

  if (avatar) {
    avatar.textContent = getInitials(profile.name || 'Toka');
    avatar.style.background = getAvatarColor(profile.name || 'Toka');
  }
  if (name) name.textContent = profile.name || 'Your Profile';
  if (phone) phone.textContent = profile.phone || '+256 --- ----';
  if (stats) {
    const hostedCount = getEvents().filter((event) => event.createdBy === 'user').length;
    stats.innerHTML = `
      <div class="stat-card"><strong>${getTickets().length}</strong><span>Events Attended</span></div>
      <div class="stat-card"><strong>${hostedCount}</strong><span>Events Hosted</span></div>
      <div class="stat-card"><strong>${referralCode ? 1 : 0}</strong><span>Referrals</span></div>
    `;
  }
  if (interests) {
    interests.innerHTML = TOKA_INTEREST_OPTIONS.map((interest) => `
      <button type="button" class="chip ${profile.interests && profile.interests.includes(interest) ? 'active' : ''}" onclick="toggleProfileInterest('${interest.replace(/'/g, "\\'")}')">${escapeHtml(interest)}</button>
    `).join('');
  }
  if (settings) {
    settings.innerHTML = `
      <button type="button" class="settings-item" onclick="editProfile()"><span>Edit Profile</span><span>›</span></button>
      <button type="button" class="settings-item" onclick="toggleNotifications()"><span>Notifications</span><span>${profile.notificationsEnabled === false ? 'Off' : 'On'}</span></button>
      <div class="settings-item static-item">
        <span>Language</span>
        <span>${escapeHtml(profile.language || 'English')}</span>
      </div>
      <button type="button" class="settings-item" onclick="shareTokaApp()"><span>Share Toka</span><span>↗</span></button>
      <button type="button" class="settings-item" onclick="aboutToka()"><span>About Toka</span><span>i</span></button>
      <button type="button" class="settings-item danger" onclick="logoutUser()"><span>Logout</span><span>⎋</span></button>
    `;
  }
}

function toggleProfileInterest(interest) {
  const profile = getUserProfile();
  const interests = new Set(profile.interests || []);
  if (interests.has(interest)) {
    interests.delete(interest);
  } else {
    interests.add(interest);
  }
  saveUserProfile({ interests: Array.from(interests) });
  renderProfile();
}

function toggleNotifications() {
  const profile = getUserProfile();
  saveUserProfile({ notificationsEnabled: !(profile.notificationsEnabled !== false) });
  renderProfile();
  toast('Notification setting updated.');
}

function editProfile() {
  const profile = getUserProfile();
  const name = window.prompt('Update your name', profile.name || '');
  if (name === null) {
    return;
  }
  const phone = window.prompt('Update your phone number', profile.phone || '');
  if (phone === null) {
    return;
  }
  const email = window.prompt('Update your email', profile.email || '');
  if (email === null) {
    return;
  }
  saveUserProfile({ name: name.trim(), phone: phone.trim(), email: email.trim() });
  if (!getReferralCode() && name.trim()) {
    setReferralCode(generateReferralCode(name.trim()));
  }
  renderProfile();
  toast('Profile updated.');
}

function aboutToka() {
  window.alert('Toka is a community-first events platform for discovering, hosting, and sharing real-world experiences.');
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement('textarea');
      helper.value = text;
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      document.body.removeChild(helper);
    }
    toast('Copied!');
  } catch (error) {
    toast('Could not copy text.');
  }
}

async function shareTicket(ticketCode, eventName) {
  const ticketText = `I just got my Toka ticket for ${eventName}. Ticket code: ${ticketCode}. Join me on Toka.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Toka Ticket', text: ticketText, url: window.location.href });
    } else {
      await copyToClipboard(ticketText);
    }
  } catch (error) {
    await copyToClipboard(ticketText);
  }
}

async function shareTokaApp() {
  const shareText = 'Discover events, get tickets, and host with Toka.';
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Toka', text: shareText, url: window.location.href });
    } else {
      await copyToClipboard(shareText);
    }
  } catch (error) {
    await copyToClipboard(shareText);
  }
}

function logoutUser() {
  Object.values(TOKA_STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Ignore storage failures on logout.
    }
  });
  TOKA_APP_STATE.homeCategory = 'All';
  TOKA_APP_STATE.discoverCategory = 'All';
  TOKA_APP_STATE.discoverTimeFilter = 'All';
  TOKA_APP_STATE.discoverQuery = '';
  TOKA_APP_STATE.onboardingStep = 1;
  TOKA_APP_STATE.hostStep = 1;
  renderHome();
  renderDiscover();
  renderTickets();
  renderProfile();
  showScreen('screen-home');
  toast('Logged out.');
}

function applyHomeCategory(category) {
  setHomeCategory(category);
}

function setDiscoverCategory(category) {
  TOKA_APP_STATE.discoverCategory = category;
  renderDiscover();
}

function setDiscoverTimeFilter(filter) {
  TOKA_APP_STATE.discoverTimeFilter = filter;
  renderDiscover();
}

function togglePaymentNumberInput() {
  const selectedMethod = qs('input[name="paymentMethod"]:checked')?.value;
  const paymentWrapper = qs('#payment-phone-wrapper');
  const event = getEventById(TOKA_APP_STATE.selectedRegisterEventId);
  if (!paymentWrapper || !event) {
    return;
  }
  const showPayment = event.price > 0 && selectedMethod !== 'Free';
  paymentWrapper.classList.toggle('hidden', !showPayment);
  if (showPayment) {
    const registerPhone = qs('#register-phone')?.value || getUserProfile().phone || '';
    const paymentPhone = qs('#payment-phone');
    if (paymentPhone && !paymentPhone.value) {
      paymentPhone.value = registerPhone;
    }
  }
}

function renderHostScreen() {
  const stepIndicator = qs('#host-step-indicator');
  const nextButton = qs('#host-next-button');
  const publishButton = qs('#host-publish-button');
  const sections = ['#host-step-one', '#host-step-two', '#host-step-three'];
  sections.forEach((selector, index) => {
    const section = qs(selector);
    if (section) {
      section.classList.toggle('hidden', TOKA_APP_STATE.hostStep !== index + 1);
    }
  });
  if (stepIndicator) {
    stepIndicator.textContent = `${TOKA_APP_STATE.hostStep} of 3 steps`;
  }
  if (nextButton) {
    nextButton.classList.toggle('hidden', TOKA_APP_STATE.hostStep === 3);
  }
  if (publishButton) {
    publishButton.classList.toggle('hidden', TOKA_APP_STATE.hostStep !== 3);
  }
  renderHostPreview();
}

function getHostFormData() {
  return {
    name: qs('#host-name')?.value.trim() || '',
    category: qs('#host-category')?.value || 'Music',
    date: qs('#host-date')?.value || '',
    startTime: qs('#host-start')?.value || '',
    endTime: qs('#host-end')?.value || '',
    venue: qs('#host-venue')?.value.trim() || '',
    city: qs('#host-city')?.value.trim() || '',
    free: qs('#host-free')?.checked || false,
    price: Number(qs('#host-price')?.value || 0),
    capacity: Number(qs('#host-capacity')?.value || 0),
    description: qs('#host-description')?.value.trim() || ''
  };
}

function renderHostPreview() {
  const preview = qs('#host-preview');
  if (!preview) {
    return;
  }
  const data = getHostFormData();
  preview.innerHTML = `
    <article class="event-card preview-card" style="--card-gradient: ${getGradientForCategory(data.category)}">
      <div class="event-cover">
        <div class="event-emoji">${escapeHtml(getEmojiForCategory(data.category))}</div>
        <div class="event-cover-overlay"></div>
      </div>
      <div class="event-card-body">
        <div class="event-card-topline">
          <span class="badge">${escapeHtml(data.category)}</span>
          <span class="event-price">${data.free ? 'Free' : formatPrice(data.price, 'UGX')}</span>
        </div>
        <h3 class="event-title">${escapeHtml(data.name || 'Your event name')}</h3>
        <p class="event-meta">${escapeHtml(data.date ? formatDate(data.date) : 'Select a date')} · ${escapeHtml(data.startTime || '--:--')} - ${escapeHtml(data.endTime || '--:--')}</p>
        <p class="event-meta">${escapeHtml(data.city || 'City')} · ${escapeHtml(data.venue || 'Venue')}</p>
      </div>
    </article>
  `;
}

function getGradientForCategory(category) {
  const mapping = {
    Music: 'linear-gradient(135deg, #F4500A, #F7B731)',
    Sports: 'linear-gradient(135deg, #C6F135, #F7B731)',
    Business: 'linear-gradient(135deg, #F7B731, #F4500A)',
    Art: 'linear-gradient(135deg, #F7B731, #C6F135)',
    Faith: 'linear-gradient(135deg, #F4500A, #0D0D0D)',
    'Food & Drinks': 'linear-gradient(135deg, #2E2E2E, #F7B731)',
    Tech: 'linear-gradient(135deg, #0D0D0D, #F4500A)',
    Campus: 'linear-gradient(135deg, #F4500A, #C6F135)',
    Community: 'linear-gradient(135deg, #C6F135, #0D0D0D)'
  };
  return mapping[category] || 'linear-gradient(135deg, #2E2E2E, #F4500A)';
}

function getEmojiForCategory(category) {
  const mapping = {
    Music: '🎶',
    Sports: '🏆',
    Business: '📈',
    Art: '🎨',
    Faith: '🙏',
    'Food & Drinks': '🍔',
    Tech: '💻',
    Campus: '🎓',
    Community: '🌍'
  };
  return mapping[category] || '🎫';
}

function goHostNext() {
  const formData = getHostFormData();
  if (TOKA_APP_STATE.hostStep === 1 && (!formData.name || !formData.date || !formData.venue || !formData.city)) {
    toast('Complete the event basics first.');
    return;
  }
  if (TOKA_APP_STATE.hostStep === 2 && (!formData.capacity || (!formData.free && !formData.price))) {
    toast('Add pricing and capacity details.');
    return;
  }
  if (TOKA_APP_STATE.hostStep < 3) {
    TOKA_APP_STATE.hostStep += 1;
    renderHostScreen();
  }
}

function goHostBack() {
  if (TOKA_APP_STATE.hostStep > 1) {
    TOKA_APP_STATE.hostStep -= 1;
    renderHostScreen();
  }
}

function publishEvent() {
  const formData = getHostFormData();
  if (!formData.name || !formData.date || !formData.venue || !formData.city || !formData.capacity) {
    toast('Please complete the required event details.');
    return;
  }

  const profile = getUserProfile();
  const createdEvent = {
    id: `evt-${Date.now()}`,
    name: formData.name,
    category: formData.category,
    emoji: getEmojiForCategory(formData.category),
    gradient: getGradientForCategory(formData.category),
    date: formData.date,
    time: formData.startTime || '6:00 PM',
    endTime: formData.endTime || '9:00 PM',
    venue: formData.venue,
    city: formData.city,
    price: formData.free ? 0 : formData.price,
    currency: 'UGX',
    capacity: formData.capacity,
    registered: 0,
    description: formData.description || 'A new Toka event created by the community.',
    organiser: profile.name || 'You',
    tags: [formData.category.toLowerCase()],
    attendees: profile.name ? [profile.name] : [],
    createdBy: 'user'
  };

  saveEvent(createdEvent);
  const success = qs('#host-success');
  if (success) {
    success.classList.remove('hidden');
    success.innerHTML = `
      <h3>Your event is live! 🚀</h3>
      <p class="text-muted">Share this link so people can discover your event.</p>
      <div class="share-link-row">
        <code>toka.app/e/${createdEvent.id}</code>
        <button type="button" class="button button-secondary button-small" onclick="copyToClipboard('toka.app/e/${createdEvent.id}')">Copy</button>
      </div>
    `;
  }
  TOKA_APP_STATE.hostSubmitted = true;
  renderHome();
  renderDiscover();
  renderProfile();
  toast('Event published.');
}

function startOnboarding() {
  TOKA_APP_STATE.onboardingStep = 1;
  renderOnboarding();
  showScreen('screen-onboarding');
}

function renderOnboarding() {
  const slideContainer = qs('#onboarding-slide-container');
  const dots = qs('#onboarding-dots');
  const cta = qs('#onboarding-cta');
  if (!slideContainer || !dots || !cta) {
    return;
  }

  const profile = getUserProfile();
  slideContainer.innerHTML = `
    <div class="onboarding-slide ${TOKA_APP_STATE.onboardingStep === 1 ? 'active' : ''}" data-slide="1">
      <div class="toka-mark">T</div>
      <h2>Welcome to Toka</h2>
      <p>Discover events made for you.</p>
    </div>
    <div class="onboarding-slide ${TOKA_APP_STATE.onboardingStep === 2 ? 'active' : ''}" data-slide="2">
      <h2>Tell us what you're into</h2>
      <div class="chip-grid" id="onboarding-interests"></div>
    </div>
    <div class="onboarding-slide ${TOKA_APP_STATE.onboardingStep === 3 ? 'active' : ''}" data-slide="3">
      <h2>Almost there</h2>
      <div class="form-stack">
        <input id="onboarding-name" type="text" placeholder="Your name" value="${escapeHtml(profile.name || '')}" />
        <input id="onboarding-phone" type="tel" placeholder="+256 700 000 000" value="${escapeHtml(profile.phone || '')}" />
      </div>
    </div>
  `;

  const interestContainer = qs('#onboarding-interests');
  if (interestContainer) {
    const selected = new Set(profile.interests || []);
    interestContainer.innerHTML = TOKA_INTEREST_OPTIONS.map((interest) => `
      <button type="button" class="chip ${selected.has(interest) ? 'active' : ''}" onclick="toggleOnboardingInterest('${interest.replace(/'/g, "\\'")}')">${escapeHtml(interest)}</button>
    `).join('');
  }

  dots.innerHTML = [1, 2, 3].map((index) => `<span class="dot ${TOKA_APP_STATE.onboardingStep === index ? 'active' : ''}"></span>`).join('');

  if (TOKA_APP_STATE.onboardingStep < 3) {
    cta.textContent = 'Next →';
  } else {
    cta.textContent = `Let's go →`;
  }
}

function toggleOnboardingInterest(interest) {
  const profile = getUserProfile();
  const selected = new Set(profile.interests || []);
  if (selected.has(interest)) {
    selected.delete(interest);
  } else {
    selected.add(interest);
  }
  saveUserProfile({ interests: Array.from(selected) });
  renderOnboarding();
}

function goOnboardingNext() {
  if (TOKA_APP_STATE.onboardingStep === 2) {
    const interests = getUserProfile().interests || [];
    if (!interests.length) {
      toast('Select at least one interest.');
      return;
    }
  }
  if (TOKA_APP_STATE.onboardingStep < 3) {
    TOKA_APP_STATE.onboardingStep += 1;
    renderOnboarding();
    return;
  }

  const name = qs('#onboarding-name')?.value.trim();
  const phone = qs('#onboarding-phone')?.value.trim();
  const profile = getUserProfile();
  if (!name || !phone || !(profile.interests || []).length) {
    toast('Add your name, phone, and at least one interest.');
    return;
  }

  saveUserProfile({ name, phone, interests: profile.interests || [] });
  setOnboardingComplete(true);
  if (!getReferralCode()) {
    setReferralCode(generateReferralCode(name));
  }
  renderHome();
  renderDiscover();
  renderTickets();
  renderProfile();
  showScreen('screen-home');
  toast('Welcome to Toka.');
}

function goOnboardingBack() {
  if (TOKA_APP_STATE.onboardingStep > 1) {
    TOKA_APP_STATE.onboardingStep -= 1;
    renderOnboarding();
  }
}

function bindGlobalEvents() {
  const discoverSearch = qs('#discover-search');
  if (discoverSearch) {
    discoverSearch.addEventListener('input', (event) => {
      TOKA_APP_STATE.discoverQuery = event.target.value;
      renderDiscover();
    });
  }

  const registerForm = qs('#register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const targetEvent = getEventById(registerForm.dataset.eventId || TOKA_APP_STATE.selectedRegisterEventId);
      if (targetEvent) {
        submitRegistration(targetEvent);
      }
    });
  }

  const hostForm = qs('#host-form');
  if (hostForm) {
    ['input', 'change'].forEach((eventType) => {
      hostForm.addEventListener(eventType, () => renderHostPreview());
    });
  }

  const paymentMethods = qs('#payment-methods');
  if (paymentMethods) {
    paymentMethods.addEventListener('change', togglePaymentNumberInput);
  }

  const paymentPhone = qs('#payment-phone');
  const registerPhone = qs('#register-phone');
  if (registerPhone && paymentPhone) {
    registerPhone.addEventListener('input', () => {
      if (qs('input[name="paymentMethod"]:checked')?.value !== 'Free') {
        paymentPhone.value = registerPhone.value;
      }
    });
  }

  const ticketsList = qs('#tickets-list');
  if (ticketsList) {
    ticketsList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-ticket-id]');
      if (!button) {
        return;
      }
      toggleTicketBody(button.dataset.ticketId);
    });
  }

  const onboardingSlide = qs('#onboarding-slide-container');
  if (onboardingSlide) {
    onboardingSlide.addEventListener('touchstart', (event) => {
      TOKA_APP_STATE.onboardingTouchStartX = event.touches[0].clientX;
    }, { passive: true });
    onboardingSlide.addEventListener('touchend', (event) => {
      const deltaX = event.changedTouches[0].clientX - TOKA_APP_STATE.onboardingTouchStartX;
      if (Math.abs(deltaX) < 50) {
        return;
      }
      if (deltaX < 0) {
        goOnboardingNext();
      } else {
        goOnboardingBack();
      }
    }, { passive: true });
  }
}

function initializeLandingState(onboardingDone) {
  const isOnboardingDone = typeof onboardingDone === 'boolean' ? onboardingDone : getOnboardingComplete();
  if (!isOnboardingDone) {
    renderOnboarding();
    showScreen('screen-onboarding');
    return;
  }

  if (!getReferralCode()) {
    const profile = getUserProfile();
    if (profile.name) {
      setReferralCode(generateReferralCode(profile.name));
    }
  }

  renderHome();
  renderDiscover();
  renderTickets();
  renderProfile();
  showScreen('screen-home');
}

function initApp() {
  bindGlobalEvents();
  const onboardingDone = getOnboardingComplete();
  seedMockComments();
  initializeLandingState(onboardingDone);
  const searchInput = qs('#discover-search');
  if (searchInput) {
    searchInput.value = TOKA_APP_STATE.discoverQuery;
  }
  const hostFree = qs('#host-free');
  if (hostFree) {
    hostFree.addEventListener('change', () => {
      const priceInput = qs('#host-price');
      if (priceInput) {
        priceInput.closest('.field-group')?.classList.toggle('hidden', hostFree.checked);
      }
      renderHostPreview();
    });
  }

  const hostInputs = ['#host-name', '#host-category', '#host-date', '#host-start', '#host-end', '#host-venue', '#host-city', '#host-price', '#host-capacity', '#host-description'];
  hostInputs.forEach((selector) => {
    const element = qs(selector);
    if (element) {
      element.addEventListener('input', renderHostPreview);
      element.addEventListener('change', renderHostPreview);
    }
  });

  renderHostScreen();
  if (qs('#host-price') && qs('#host-free')?.checked) {
    qs('#host-price').closest('.field-group')?.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', initApp);

window.showScreen = showScreen;
window.openEventDetail = openEventDetail;
window.openRegistration = openRegistration;
window.applyHomeCategory = applyHomeCategory;
window.setDiscoverCategory = setDiscoverCategory;
window.setDiscoverTimeFilter = setDiscoverTimeFilter;
window.toggleProfileInterest = toggleProfileInterest;
window.toggleNotifications = toggleNotifications;
window.editProfile = editProfile;
window.aboutToka = aboutToka;
window.copyToClipboard = copyToClipboard;
window.shareTicket = shareTicket;
window.shareTokaApp = shareTokaApp;
window.logoutUser = logoutUser;
window.goHostNext = goHostNext;
window.goHostBack = goHostBack;
window.publishEvent = publishEvent;
window.goOnboardingNext = goOnboardingNext;
window.goOnboardingBack = goOnboardingBack;
window.toggleOnboardingInterest = toggleOnboardingInterest;
window.renderHostPreview = renderHostPreview;
window.togglePaymentNumberInput = togglePaymentNumberInput;
window.postComment = postComment;
window.postOrgUpdate = postOrgUpdate;
window.handleLike = handleLike;