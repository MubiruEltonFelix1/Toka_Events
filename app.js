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
    ticketToastTimer: null,
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    hostThumbnailDataUrl: '',
    recordedImpressions: {},
    hostChartInstances: {},
    isPublishingHostEvent: false,
    lastPublishedFingerprint: '',
    lastPublishedAt: 0,
    postOnboardingScreen: '',
    hostDashboardRoute: 'dashboard'
};

const TOKA_PWA_STATE = {
    deferredInstallPrompt: null
};

const TOKA_PWA_STORAGE_KEYS = {
    installPromptDismissedAt: 'toka_pwa_install_prompt_dismissed_at'
};

const TOKA_PWA_INSTALL_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const TOKA_HOST_PUBLISH_DUPLICATE_WINDOW_MS = 12000;

const TOKA_AUTH_STATE = {
    session: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
    authMode: 'signin',
    pendingScreenId: '',
    feedbackMessage: '',
    feedbackType: ''
};

const TOKA_PROTECTED_SCREENS = new Set([
    'screen-calendar',
    'screen-my-tickets',
    'screen-profile',
    'screen-host',
    'screen-host-dashboard',
    'screen-register'
]);

window.TOKA_AUTH_STATE = TOKA_AUTH_STATE;

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

function normalizeCountryCode(rawValue) {
    const digits = String(rawValue || '').replace(/[^0-9]/g, '');
    if (!digits || digits.length < 1 || digits.length > 4) {
        return '';
    }
    return `+${digits}`;
}

function normalizeLocalPhoneNumber(rawValue) {
    const digits = String(rawValue || '').replace(/[^0-9]/g, '');
    if (!digits || digits.length < 6 || digits.length > 12) {
        return '';
    }
    return digits;
}

function buildE164Phone(countryCode, localDigits) {
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    const normalizedLocal = normalizeLocalPhoneNumber(localDigits);
    if (!normalizedCountryCode || !normalizedLocal) {
        return { ok: false, error: 'Enter a valid country code and phone number.' };
    }
    const combinedDigits = `${normalizedCountryCode.slice(1)}${normalizedLocal}`;
    if (combinedDigits.length < 8 || combinedDigits.length > 15) {
        return { ok: false, error: 'Phone number must be between 8 and 15 digits including country code.' };
    }
    return {
        ok: true,
        e164: `+${combinedDigits}`,
        countryCode: normalizedCountryCode,
        localNumber: normalizedLocal
    };
}

function parseE164Phone(phoneValue, fallbackCountryCode = '+256') {
    const value = String(phoneValue || '').trim();
    if (!value.startsWith('+')) {
        const fallback = buildE164Phone(fallbackCountryCode, value);
        return fallback.ok ? fallback : { ok: false, error: 'Phone number must include country code.' };
    }

    const digits = value.replace(/[^0-9]/g, '');
    for (let ccLength = 1; ccLength <= 4; ccLength += 1) {
        const country = digits.slice(0, ccLength);
        const local = digits.slice(ccLength);
        const parsed = buildE164Phone(`+${country}`, local);
        if (parsed.ok) {
            return parsed;
        }
    }

    return { ok: false, error: 'Invalid international phone format.' };
}

function validateAndNormalizePhoneInput(rawValue, fallbackCountryCode = '+256') {
    const input = String(rawValue || '').trim();
    if (!input) {
        return { ok: false, error: 'Phone number is required.' };
    }
    if (input.startsWith('+')) {
        return parseE164Phone(input, fallbackCountryCode);
    }
    return buildE164Phone(fallbackCountryCode, input);
}

function isAuthenticatedUser() {
    return Boolean(TOKA_AUTH_STATE.isAuthenticated && TOKA_AUTH_STATE.user && TOKA_AUTH_STATE.user.id);
}

function hasCompletedUserProfile() {
    const profile = getUserProfile() || {};
    const interests = Array.isArray(profile.interests) ? profile.interests : [];
    return Boolean(getOnboardingComplete() && profile.name && profile.phone && interests.length);
}

function getAuthRedirectUrl() {
    const path = window.location.pathname || '/';
    return `${window.location.origin}${path}`;
}

function getAuthEmailLabel() {
    const email = String(TOKA_AUTH_STATE.user && TOKA_AUTH_STATE.user.email ? TOKA_AUTH_STATE.user.email : '').trim();
    if (!email) {
        return 'Account';
    }
    const [localPart, domainPart] = email.split('@');
    if (!domainPart) {
        return email;
    }
    const trimmedLocal = localPart.length > 5 ? `${localPart.slice(0, 5)}…` : localPart;
    return `${trimmedLocal}@${domainPart}`;
}

function isStandalonePwa() {
    const standaloneMatch = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = Boolean(window.navigator && window.navigator.standalone);
    return Boolean(standaloneMatch || iosStandalone);
}

function isIosSafariInstallPath() {
    const ua = window.navigator.userAgent || '';
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    return Boolean(isIos && isSafari);
}

function getInstallPromptDismissedAt() {
    const rawValue = window.localStorage.getItem(TOKA_PWA_STORAGE_KEYS.installPromptDismissedAt);
    const parsed = Number(rawValue || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function setInstallPromptDismissedNow() {
    window.localStorage.setItem(TOKA_PWA_STORAGE_KEYS.installPromptDismissedAt, String(Date.now()));
}

function shouldShowInstallCta() {
    if (isStandalonePwa()) {
        return false;
    }

    const lastDismissedAt = getInstallPromptDismissedAt();
    if (lastDismissedAt && Date.now() - lastDismissedAt < TOKA_PWA_INSTALL_PROMPT_COOLDOWN_MS) {
        return false;
    }

    return Boolean(TOKA_PWA_STATE.deferredInstallPrompt || isIosSafariInstallPath());
}

function updateInstallCtaVisibility() {
    const shouldShow = shouldShowInstallCta();
    qsa('.js-install-app-btn').forEach((button) => {
        button.classList.toggle('hidden', !shouldShow);
    });
}

async function promptInstallApp() {
    if (isStandalonePwa()) {
        toast('Toka is already installed on this device.');
        return;
    }

    if (TOKA_PWA_STATE.deferredInstallPrompt) {
        const installEvent = TOKA_PWA_STATE.deferredInstallPrompt;
        installEvent.prompt();
        const choice = await installEvent.userChoice;
        TOKA_PWA_STATE.deferredInstallPrompt = null;
        if (choice && choice.outcome === 'accepted') {
            toast('Installing Toka...');
        } else {
            setInstallPromptDismissedNow();
        }
        updateInstallCtaVisibility();
        return;
    }

    if (isIosSafariInstallPath()) {
        window.alert('Install Toka on iPhone/iPad:\n1) Tap Share in Safari\n2) Choose Add to Home Screen\n3) Tap Add');
        setInstallPromptDismissedNow();
        updateInstallCtaVisibility();
        return;
    }

    toast('Install is not available yet in this browser.');
}

function registerPwaInstallHandlers() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        TOKA_PWA_STATE.deferredInstallPrompt = event;
        updateInstallCtaVisibility();
    });

    window.addEventListener('appinstalled', () => {
        TOKA_PWA_STATE.deferredInstallPrompt = null;
        updateInstallCtaVisibility();
        toast('Toka installed successfully.');
    });
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        const path = window.location.pathname || '/';
        const basePath = path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1);
      await navigator.serviceWorker.register(`${basePath}sw.js?v=20260406-14`, { scope: basePath });
    } catch (error) {
        console.warn('Service worker registration failed', error);
    }
}

function setAuthFeedback(message, type = 'error') {
    TOKA_AUTH_STATE.feedbackMessage = String(message || '');
    TOKA_AUTH_STATE.feedbackType = type;
    const feedback = qs('#auth-feedback');
    if (!feedback) {
        return;
    }
    if (!TOKA_AUTH_STATE.feedbackMessage) {
        feedback.textContent = '';
        feedback.className = 'auth-feedback';
        return;
    }
    feedback.textContent = TOKA_AUTH_STATE.feedbackMessage;
    feedback.className = `auth-feedback ${type === 'success' ? 'success' : type === 'error' ? 'error' : 'info'}`;
}

function renderAuthHeader() {
    const container = qs('#auth-header-actions');
    if (!container) {
        return;
    }

    if (isAuthenticatedUser()) {
        container.innerHTML = `
    <div class="auth-status">
    <button type="button" class="button button-ghost button-small js-install-app-btn hidden" onclick="promptInstallApp()">Install App</button>
    <span class="auth-email" title="${escapeHtml(TOKA_AUTH_STATE.user.email || '')}">${escapeHtml(getAuthEmailLabel())}</span>
    <button type="button" class="button button-secondary button-small auth-sign-out" onclick="logoutUser()">Sign Out</button>
    </div>
  `;
        updateInstallCtaVisibility();
        return;
    }

    container.innerHTML = `
    <button type="button" class="button button-ghost button-small js-install-app-btn hidden" onclick="promptInstallApp()">Install App</button>
    <button type="button" class="button button-primary button-small auth-sign-in" onclick="openAuthModal('signin')">Sign In</button>
  `;
    updateInstallCtaVisibility();
}

function openAuthModal(mode = 'signin', message = '') {
    const modal = qs('#auth-modal');
    const emailInput = qs('#auth-email');
    const passwordInput = qs('#auth-password');
    const modeLabel = qs('#auth-mode-label');
    const title = qs('#auth-title');
    const description = qs('#auth-description');
    const submitButton = qs('#auth-submit');
    const toggleButton = qs('#auth-toggle-mode');
    const forgotButton = qs('#auth-forgot-password');
    const resendButton = qs('#auth-resend-confirmation');
    const signupOnlyFields = qsa('.auth-signup-only');
    const signupName = qs('#auth-full-name');
    const signupGender = qs('#auth-gender');
    const signupCountryCode = qs('#auth-country-code');
    const signupPhoneLocal = qs('#auth-phone-local');
    const profile = getUserProfile();

    TOKA_AUTH_STATE.authMode = mode === 'signup' ? 'signup' : 'signin';

    if (modeLabel) {
        modeLabel.textContent = TOKA_AUTH_STATE.authMode === 'signup' ? 'Sign Up' : 'Sign In';
    }
    if (title) {
        title.textContent = TOKA_AUTH_STATE.authMode === 'signup' ? 'Create your Toka account' : 'Welcome back to Toka';
    }
    if (description) {
        description.textContent = TOKA_AUTH_STATE.authMode === 'signup' ?
            'Create an account to host events, save tickets, and keep your session synced.' :
            'Sign in to access your tickets, profile, and hosting tools.';
    }
    if (submitButton) {
        submitButton.textContent = TOKA_AUTH_STATE.authMode === 'signup' ? 'Sign Up' : 'Sign In';
    }
    if (toggleButton) {
        toggleButton.textContent = TOKA_AUTH_STATE.authMode === 'signup' ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
    }
    if (forgotButton) {
        forgotButton.classList.toggle('hidden', TOKA_AUTH_STATE.authMode === 'signup');
    }
    if (resendButton) {
        resendButton.classList.toggle('hidden', TOKA_AUTH_STATE.authMode !== 'signup');
    }
    signupOnlyFields.forEach((field) => {
        field.classList.toggle('hidden', TOKA_AUTH_STATE.authMode !== 'signup');
    });

    if (TOKA_AUTH_STATE.authMode === 'signup') {
        const parsedPhone = parseE164Phone(profile.phone || '', profile.phoneCountryCode || '+256');
        if (signupName && !signupName.value) {
            signupName.value = profile.name || '';
        }
        if (signupGender && !signupGender.value) {
            signupGender.value = profile.gender || '';
        }
        if (signupCountryCode && !signupCountryCode.value) {
            signupCountryCode.value = parsedPhone.ok ? parsedPhone.countryCode : (profile.phoneCountryCode || '+256');
        }
        if (signupPhoneLocal && !signupPhoneLocal.value) {
            signupPhoneLocal.value = parsedPhone.ok ? parsedPhone.localNumber : (profile.phoneNationalNumber || '');
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }

    if (emailInput && !emailInput.value) {
        emailInput.focus();
    } else if (passwordInput) {
        passwordInput.focus();
    }

    setAuthFeedback(message, message ? 'info' : '');
}

function closeAuthModal() {
    const modal = qs('#auth-modal');
    if (!modal) {
        return;
    }
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
}

function toggleAuthMode() {
    openAuthModal(TOKA_AUTH_STATE.authMode === 'signup' ? 'signin' : 'signup');
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    const emailInput = qs('#auth-email');
    const passwordInput = qs('#auth-password');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const fullName = qs('#auth-full-name') ? qs('#auth-full-name').value.trim() : '';
    const gender = qs('#auth-gender') ? qs('#auth-gender').value.trim() : '';
    const countryCode = qs('#auth-country-code') ? qs('#auth-country-code').value.trim() : '';
    const phoneLocal = qs('#auth-phone-local') ? qs('#auth-phone-local').value.trim() : '';

    if (!client || !client.auth) {
        setAuthFeedback('Supabase auth is not configured in this browser session.');
        return;
    }

    if (!email || !password) {
        setAuthFeedback('Email and password are required.');
        return;
    }

    setAuthFeedback('');
    const submitButton = qs('#auth-submit');
    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        if (TOKA_AUTH_STATE.authMode === 'signup') {
            if (!fullName || !gender) {
                setAuthFeedback('Full name and gender are required for sign up.');
                return;
            }

            const parsedPhone = buildE164Phone(countryCode, phoneLocal);
            if (!parsedPhone.ok) {
                setAuthFeedback(parsedPhone.error);
                return;
            }

            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        gender,
                        phone: parsedPhone.e164,
                        phone_country_code: parsedPhone.countryCode,
                        phone_national_number: parsedPhone.localNumber
                    },
                    emailRedirectTo: getAuthRedirectUrl()
                }
            });
            if (error) {
                throw error;
            }

            const isRepeatedSignup = Boolean(data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
            if (isRepeatedSignup) {
                setAuthFeedback('This email already exists. Sign in or resend confirmation email if not yet verified.', 'info');
                return;
            }

            setAuthFeedback('Check your email to confirm your account.', 'success');
            saveUserProfile({
                name: fullName,
                gender,
                phone: parsedPhone.e164,
                phoneCountryCode: parsedPhone.countryCode,
                phoneNationalNumber: parsedPhone.localNumber,
                email
            });
            if (passwordInput) {
                passwordInput.value = '';
            }
            return;
        }

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            throw error;
        }

        const session = data && data.session ? data.session : null;
        applyAuthSession(session);
        setAuthFeedback('Signed in successfully.', 'success');
        closeAuthModal();
        if (TOKA_AUTH_STATE.pendingScreenId) {
            const nextScreen = TOKA_AUTH_STATE.pendingScreenId;
            TOKA_AUTH_STATE.pendingScreenId = '';
            showScreen(nextScreen);
        } else {
            renderHome();
            renderDiscover();
            renderTickets();
            renderProfile();
            renderCalendarScreen();
        }
    } catch (error) {
        const message = error && error.message ? error.message : 'Could not sign in. Please try again.';
        setAuthFeedback(message);
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

async function handleForgotPassword() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    const emailInput = qs('#auth-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!client || !client.auth) {
        setAuthFeedback('Supabase auth is not configured in this browser session.');
        return;
    }
    if (!email) {
        setAuthFeedback('Enter your email first.');
        return;
    }

    try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: getAuthRedirectUrl()
        });
        if (error) {
            throw error;
        }
        setAuthFeedback('Password reset email sent. Check your inbox.', 'success');
    } catch (error) {
        const message = error && error.message ? error.message : 'Could not send password reset email.';
        setAuthFeedback(message);
    }
}

async function handleResendConfirmation() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    const emailInput = qs('#auth-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!client || !client.auth) {
        setAuthFeedback('Supabase auth is not configured in this browser session.');
        return;
    }
    if (!email) {
        setAuthFeedback('Enter your email first.');
        return;
    }

    try {
        const { error } = await client.auth.resend({
            type: 'signup',
            email,
            options: {
                emailRedirectTo: getAuthRedirectUrl()
            }
        });
        if (error) {
            throw error;
        }
        setAuthFeedback('Confirmation email resent. Check inbox and spam folders.', 'success');
    } catch (error) {
        const message = error && error.message ? error.message : 'Could not resend confirmation email.';
        setAuthFeedback(message);
    }
}

async function applyAuthSession(session) {
    TOKA_AUTH_STATE.session = session || null;
    TOKA_AUTH_STATE.user = session && session.user ? session.user : null;
    TOKA_AUTH_STATE.isAuthenticated = Boolean(TOKA_AUTH_STATE.user && TOKA_AUTH_STATE.user.id);
    TOKA_AUTH_STATE.isLoading = false;

    if (typeof window.setSupabaseOwnerUserId === 'function') {
        window.setSupabaseOwnerUserId(TOKA_AUTH_STATE.isAuthenticated ? TOKA_AUTH_STATE.user.id : '');
    }

    renderAuthHeader();
    renderProfile();

    if (TOKA_AUTH_STATE.isAuthenticated && typeof window.initializeSupabaseSync === 'function') {
        await window.initializeSupabaseSync();
    }

    if (!TOKA_AUTH_STATE.isAuthenticated && TOKA_PROTECTED_SCREENS.has(TOKA_APP_STATE.currentScreen)) {
        TOKA_APP_STATE.currentScreen = 'screen-home';
        showScreen('screen-home');
    }

    renderHome();
    renderDiscover();
    renderTickets();
    if (TOKA_APP_STATE.currentScreen === 'screen-calendar') {
        renderCalendarScreen();
    }
    if (TOKA_APP_STATE.currentScreen === 'screen-host-dashboard') {
        renderHostDashboard();
    }
}

const TOKA_EVENT_THUMBNAILS = {
    Music: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    Sports: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
    Business: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
    Art: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80',
    Faith: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80',
    'Food & Drinks': 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1200&q=80',
    Tech: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    Campus: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80',
    Community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80'
};

function getDefaultEventThumbnail(event) {
    return TOKA_EVENT_THUMBNAILS[event && event.category] || TOKA_EVENT_THUMBNAILS.Community;
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

function isEventPast(event) {
    if (!event || !event.date) {
        return false;
    }

    const eventDate = new Date(`${event.date}T12:00:00`);
    if (Number.isNaN(eventDate.getTime())) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
}

function getTicketQrPayload(ticket, event) {
    const safeEvent = event || {};
    return JSON.stringify({
        ticketCode: ticket.ticketCode,
        attendee: ticket.fullName,
        eventId: ticket.eventId,
        eventName: safeEvent.name || '',
        date: safeEvent.date || '',
        time: safeEvent.time || '',
        venue: safeEvent.venue || ''
    });
}

function renderQrCode(container, payload) {
    if (!container) {
        return;
    }

    container.innerHTML = '';
    container.dataset.qrPayload = payload;

    if (window.QRCode && typeof window.QRCode === 'function') {
        try {
            const qr = new window.QRCode(container, {
                text: payload,
                width: 160,
                height: 160,
                colorDark: '#0D0D0D',
                colorLight: '#FAF7F2',
                correctLevel: window.QRCode.CorrectLevel.M
            });

            if (qr && typeof qr.makeCode === 'function') {
                qr.makeCode(payload);
                return;
            }
        } catch (error) {
            console.warn('QR render failed', error);
        }
    }

    container.innerHTML = `<div class="qr-fallback"><div class="qr-mark">T</div><small>QR unavailable</small></div>`;
}

function getSharableEventCardMarkup(event) {
    const thumbnail = getEventThumbnail(event);
    const hostName = escapeHtml(event.organiser || 'Toka Host');
    return `
    <article class="share-card" style="--share-card-gradient: ${event.gradient || 'linear-gradient(135deg, #2E2E2E, #F4500A)'}">
    <div class="share-card-cover">
      <img class="share-card-image" src="${escapeHtml(thumbnail)}" alt="${escapeHtml(event.name)} cover image" loading="lazy" decoding="async" />
      <div class="share-card-overlay"></div>
      <span class="badge share-card-badge">Event Card</span>
    </div>
    <div class="share-card-body">
      <p class="eyebrow">Shareable for organisers</p>
      <h3>${escapeHtml(event.name)}</h3>
      <p class="share-card-meta">${escapeHtml(formatDateTime(event))}</p>
      <p class="share-card-meta">${escapeHtml(event.venue)} · ${escapeHtml(event.city)}</p>
      <div class="share-card-footer">
      <span>${hostName}</span>
      <strong>${escapeHtml(formatPrice(event.price, event.currency))}</strong>
      </div>
    </div>
    </article>
  `;
}

function isLoggedInUser() {
    return isAuthenticatedUser();
}

function getCalendarSavedEntry(eventId) {
    return getCalendarEntries().find((entry) => entry.eventId === eventId) || null;
}

function hasTicketForEvent(eventId) {
    return getTickets().some((ticket) => ticket.eventId === eventId);
}

function recordEventCardImpression(eventId, context = 'feed') {
    const key = `${context}:${eventId}`;
    if (TOKA_APP_STATE.recordedImpressions[key]) {
        return;
    }
    TOKA_APP_STATE.recordedImpressions[key] = true;
    incrementEventImpression(eventId);
}

function getEventThumbnail(event) {
    if (!event) {
        return '';
    }

    return event.thumbnailDataUrl || event.thumbnailUrl || getDefaultEventThumbnail(event);
}

function getUpcomingEvents(count = 3) {
    return getEvents().filter((event) => !isEventPast(event)).slice(0, count);
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
    if (TOKA_PROTECTED_SCREENS.has(screenId) && !isAuthenticatedUser()) {
        TOKA_AUTH_STATE.pendingScreenId = screenId;
        openAuthModal('signin', 'Sign in to continue.');
        return;
    }

    if (TOKA_PROTECTED_SCREENS.has(screenId) && isAuthenticatedUser() && !hasCompletedUserProfile()) {
        TOKA_APP_STATE.postOnboardingScreen = screenId;
        startOnboarding();
        toast('Complete onboarding to continue.');
        return;
    }

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

    syncHashWithScreen(screenId);

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
    if (screenId === 'screen-calendar') {
        renderCalendarScreen();
    }
    if (screenId === 'screen-host-dashboard') {
        renderHostDashboard();
    }
}

function syncHashWithScreen(screenId) {
    const mapping = {
        'screen-home': '#/home',
        'screen-discover': '#/discover',
        'screen-calendar': '#/calendar',
        'screen-my-tickets': '#/tickets',
        'screen-profile': '#/profile',
        'screen-host': '#/host',
        'screen-host-dashboard': '#/host/dashboard'
    };
    let nextHash = mapping[screenId];
    if (screenId === 'screen-host-dashboard') {
        const currentHash = (window.location.hash || '').toLowerCase();
        if (currentHash.startsWith('#/host/') && currentHash !== '#/host/') {
            nextHash = currentHash;
        } else {
            nextHash = '#/host/dashboard';
        }
    }
    if (!nextHash || window.location.hash === nextHash) {
        return;
    }
    window.location.hash = nextHash;
}

function resolveScreenFromHash() {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash.startsWith('#/host/')) {
        TOKA_APP_STATE.hostDashboardRoute = hash.replace('#/host/', '').split('?')[0] || 'dashboard';
        return 'screen-host-dashboard';
    }
    if (hash === '#/host/dashboard') return 'screen-host-dashboard';
    if (hash === '#/calendar') return 'screen-calendar';
    if (hash === '#/discover') return 'screen-discover';
    if (hash === '#/tickets') return 'screen-my-tickets';
    if (hash === '#/profile') return 'screen-profile';
    if (hash === '#/host') return 'screen-host';
    return 'screen-home';
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

function getAvailableCategories() {
    const events = getEvents();
    const seen = new Set();
    const categories = [];

    TOKA_CATEGORY_OPTIONS.forEach((category) => {
        seen.add(String(category).toLowerCase());
        categories.push(category);
    });

    events.forEach((event) => {
        const category = String(event && event.category ? event.category : '').trim();
        if (!category) {
            return;
        }
        const key = category.toLowerCase();
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        categories.push(category);
    });

    return categories;
}

function getFilteredEvents() {
    const events = getEvents();
    const query = TOKA_APP_STATE.discoverQuery.trim().toLowerCase();
    const normalizedActiveCategory = String(TOKA_APP_STATE.discoverCategory || 'All').trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.filter((event) => {
        const searchableText = [
            event.name,
            event.venue,
            event.city,
            event.organiser,
            event.description,
            event.eventType,
            event.deliveryMode,
            ...(event.tags || [])
        ].join(' ').toLowerCase();
        const matchesQuery = !query || searchableText.includes(query);

        const eventCategory = String(event.category || '').trim().toLowerCase();
        const matchesCategory = normalizedActiveCategory === 'all' || eventCategory === normalizedActiveCategory;

        const eventDate = new Date(`${event.date}T12:00:00`);
        const isValidEventDate = !Number.isNaN(eventDate.getTime());
        const diffDays = Math.floor((eventDate - today) / 86400000);

        let matchesTime = true;
        if (TOKA_APP_STATE.discoverTimeFilter === 'Today') {
            matchesTime = isValidEventDate && diffDays === 0;
        } else if (TOKA_APP_STATE.discoverTimeFilter === 'This Week') {
            matchesTime = isValidEventDate && diffDays >= 0 && diffDays <= 6;
        } else if (TOKA_APP_STATE.discoverTimeFilter === 'This Weekend') {
            const dayOfWeek = eventDate.getDay();
            matchesTime = isValidEventDate && diffDays >= 0 && (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0);
        } else if (TOKA_APP_STATE.discoverTimeFilter === 'Free') {
            matchesTime = Number(event.price) === 0;
        } else if (TOKA_APP_STATE.discoverTimeFilter === 'Paid') {
            matchesTime = Number(event.price) > 0;
        }

        return !isEventPast(event) && matchesQuery && matchesCategory && matchesTime;
    });
}

function renderCategoryChips(container, activeCategory, onClickHandler) {
    if (!container) {
        return;
    }

    const chips = ['All', ...getAvailableCategories()];
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
        const thumbnail = getEventThumbnail(event);
        const savedEntry = getCalendarSavedEntry(event.id);
        const calendarIndicator = savedEntry ? `<span class="event-cal-indicator ${savedEntry.withTicket ? 'with-ticket' : 'without-ticket'}" title="Saved to calendar">${savedEntry.withTicket ? '🎫 Saved' : '○ Saved'}</span>` : '';
        recordEventCardImpression(event.id, options.impressionContext || 'event-grid');
        return `
      <article class="event-card" style="--card-gradient: ${event.gradient || 'linear-gradient(135deg, #2E2E2E, #F4500A)'}">
        <div class="event-cover">
          <img class="event-cover-image" src="${escapeHtml(thumbnail)}" alt="${escapeHtml(event.name)} cover image" loading="lazy" decoding="async" />
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
            <span class="event-capacity">${escapeHtml(String(event.registered || 0))} going ${calendarIndicator}</span>
            <button type="button" class="button button-primary button-small" onclick="openEventDetail('${event.id}')">Get Ticket</button>
          </div>
        </div>
      </article>
    `;
    }).join('');
}

function getTrendingEvents(limit = 8) {
    const events = getEvents().filter((event) => !isEventPast(event));
    const now = Date.now();
    const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);

    return events
        .map((event) => {
            const metric = getEventMetric(event.id);
            const history = Array.isArray(metric.ticketSalesHistory) ? metric.ticketSalesHistory : [];
            const recentSales = history.filter((point) => new Date(point.timestamp).getTime() >= fortyEightHoursAgo).length;
            const score =
                (recentSales * 5) +
                (Number(metric.ticketSalesCount || 0) * 3) +
                (Number(metric.calendarAddsWithTicket || 0) * 2) +
                Number(metric.calendarAddsWithoutTicket || 0) +
                (Number(metric.impressions || 0) * 0.12);
            return {...event, trendingScore: score };
        })
        .sort((left, right) => right.trendingScore - left.trendingScore)
        .slice(0, limit);
}

function renderTrendingRow(containerId) {
    const container = qs(`#${containerId}`);
    if (!container) {
        return;
    }

    const trending = getTrendingEvents(10);
    if (!trending.length) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = trending.map((event) => {
        const thumbnail = getEventThumbnail(event);
        recordEventCardImpression(event.id, containerId);
        return `
      <article class="trending-card" style="--card-gradient: ${event.gradient || 'linear-gradient(135deg, #2E2E2E, #F4500A)'}">
        <div class="trending-thumb-wrap">
          <img class="trending-thumb" src="${escapeHtml(thumbnail)}" alt="${escapeHtml(event.name)} cover image" loading="lazy" decoding="async" />
          <span class="badge trending-badge">🔥 Trending</span>
        </div>
        <div class="trending-body">
          <h4>${escapeHtml(event.name)}</h4>
          <p class="event-meta">${escapeHtml(formatDate(event.date))}</p>
          <p class="event-meta">${escapeHtml(event.city)} · ${escapeHtml(event.venue)}</p>
          <div class="trending-bottom">
            <strong>${escapeHtml(formatPrice(event.price, event.currency))}</strong>
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
    renderEventCards(getUpcomingEvents(3), upcomingContainer, { impressionContext: 'home-upcoming' });
    renderTrendingRow('home-trending-row');
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
    renderEventCards(activeEvents, resultsContainer, { impressionContext: 'discover-results' });
    renderTrendingRow('discover-trending-row');
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
        const detailThumbnail = getEventThumbnail(event);
        cover.style.backgroundImage = detailThumbnail ? `linear-gradient(135deg, rgba(46,46,46,0.32), rgba(244,80,10,0.35)), url('${detailThumbnail}')` : '';
        cover.style.backgroundSize = detailThumbnail ? 'cover' : '';
        cover.style.backgroundPosition = detailThumbnail ? 'center' : '';
        cover.style.backgroundRepeat = 'no-repeat';
        cover.querySelector('.detail-hero-emoji').textContent = event.emoji || '🎫';
        cover.querySelector('.detail-hero-emoji').classList.toggle('is-thumb', Boolean(detailThumbnail));
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
        const eventEnded = isEventPast(event);
        ticketButton.textContent = eventEnded ? 'Ticket sales closed' : (event.price > 0 ? `Get Ticket · ${formatPrice(event.price, event.currency)}` : 'Get Free Ticket');
        ticketButton.disabled = eventEnded;
        ticketButton.setAttribute('aria-disabled', String(eventEnded));
    }
    const calendarButton = qs('#detail-calendar-button');
    if (calendarButton) {
        const savedEntry = getCalendarSavedEntry(event.id);
        if (savedEntry && savedEntry.withTicket) {
            calendarButton.textContent = 'Saved with Ticket ✓';
        } else if (savedEntry) {
            calendarButton.textContent = 'Saved to Calendar ✓';
        } else {
            calendarButton.textContent = 'Save to Calendar';
        }
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
  recordEventCardImpression(eventId, 'event-detail-open');
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

function saveEventToCalendar(eventId, withTicket = false, showToastMessage = true) {
  const event = getEventById(eventId);
  if (!event) {
    return;
  }

  const existing = getCalendarSavedEntry(eventId);
  const nextWithTicket = Boolean(withTicket || hasTicketForEvent(eventId) || (existing && existing.withTicket));
  saveCalendarEntry({ eventId, withTicket: nextWithTicket, savedAt: new Date().toISOString() });

  if (!existing) {
    recordCalendarAddMetric(eventId, nextWithTicket);
  }

  if (showToastMessage) {
    toast(nextWithTicket ? 'Saved to calendar with ticket.' : 'Saved to calendar.');
  }

  if (TOKA_APP_STATE.currentScreen === 'screen-calendar') {
    renderCalendarScreen();
  }
  renderHome();
  renderDiscover();
  if (TOKA_APP_STATE.selectedEventId === eventId) {
    renderDetailScreen(event);
  }
}

function saveSelectedEventToCalendar(withTicket) {
  if (!TOKA_APP_STATE.selectedEventId) {
    return;
  }

  if (!isAuthenticatedUser()) {
    TOKA_AUTH_STATE.pendingScreenId = 'screen-calendar';
    openAuthModal('signin', 'Sign in to save events to your calendar.');
    return;
  }

  if (!hasCompletedUserProfile()) {
    TOKA_APP_STATE.postOnboardingScreen = 'screen-calendar';
    startOnboarding();
    toast('Complete onboarding to unlock calendar.');
    return;
  }

  saveEventToCalendar(TOKA_APP_STATE.selectedEventId, withTicket);
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

  if (isEventPast(event)) {
    toast('Ticket sales for this event have closed.');
    return;
  }

  if (!isAuthenticatedUser()) {
    TOKA_AUTH_STATE.pendingScreenId = 'screen-register';
    openAuthModal('signin', 'Sign in to register and get your ticket.');
    return;
  }

  if (!hasCompletedUserProfile()) {
    TOKA_APP_STATE.postOnboardingScreen = 'screen-register';
    TOKA_APP_STATE.selectedRegisterEventId = event.id;
    startOnboarding();
    toast('Complete onboarding before getting tickets.');
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
      <label class="payment-option radio-card radio-row ${isFreeEvent ? 'active' : ''}">
        <input type="radio" name="paymentMethod" value="Free" ${isFreeEvent ? 'checked' : ''} />
        <span>
          <strong>Free</strong>
          <small>Skip payment and confirm instantly.</small>
        </span>
      </label>
    ` : '';

    methodContainer.innerHTML = `
      <label class="payment-option radio-card radio-row ${isFreeEvent ? '' : 'active'}">
        <input type="radio" name="paymentMethod" value="MTN Mobile Money" ${isFreeEvent ? '' : 'checked'} />
        <span>
          <strong>MTN Mobile Money</strong>
          <small>Default mobile money option.</small>
        </span>
      </label>
      <label class="payment-option radio-card radio-row">
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
    renderQrCode(qrEl, getTicketQrPayload(ticket, event));
  }

  const shareButton = qs('#confirmed-share-button');
  if (shareButton) {
    shareButton.onclick = () => shareTicket(ticket.ticketCode, event.name);
  }

  const copyButton = qs('#confirmed-copy-button');
  if (copyButton) {
    copyButton.onclick = () => copyToClipboard(`toka.app/ref/${ticket.referralCode}`);
  }

  updateInstallCtaVisibility();
}

function submitRegistration(event) {
  const form = qs('#register-form');
  if (!form) {
    return;
  }

  if (isEventPast(event)) {
    toast('Ticket sales for this event have closed.');
    return;
  }

  const fullName = qs('#register-name')?.value.trim();
  const phoneRaw = qs('#register-phone')?.value.trim();
  const email = qs('#register-email')?.value.trim();
  const source = qs('#register-source')?.value || 'WhatsApp';
  const paymentMethod = qs('input[name="paymentMethod"]:checked')?.value || 'MTN Mobile Money';
  const paymentPhoneRaw = qs('#payment-phone')?.value.trim();
  const agreed = qs('#register-terms')?.checked;

  if (!fullName || !phoneRaw || !agreed) {
    toast('Please complete the required fields and accept the terms.');
    return;
  }

  const normalizedPhone = validateAndNormalizePhoneInput(phoneRaw, getUserProfile().phoneCountryCode || '+256');
  if (!normalizedPhone.ok) {
    toast(normalizedPhone.error);
    return;
  }

  const normalizedPaymentPhone = paymentPhoneRaw ? validateAndNormalizePhoneInput(paymentPhoneRaw, normalizedPhone.countryCode) : normalizedPhone;
  if (!normalizedPaymentPhone.ok) {
    toast('Payment phone is invalid. Include country code and valid digits.');
    return;
  }

  if (event.price > 0 && paymentMethod !== 'Free' && !paymentPhoneRaw) {
    toast('Enter the number to charge.');
    return;
  }

  const profile = saveUserProfile({
    name: fullName,
    phone: normalizedPhone.e164,
    phoneCountryCode: normalizedPhone.countryCode,
    phoneNationalNumber: normalizedPhone.localNumber,
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
    gender: profile.gender || '',
    phone: normalizedPhone.e164,
    phoneCountryCode: normalizedPhone.countryCode,
    phoneNationalNumber: normalizedPhone.localNumber,
    email,
    source,
    paymentMethod,
    paymentPhone: normalizedPaymentPhone.e164,
    createdAt: new Date().toISOString(),
    status: 'Confirmed',
    referralCode: getReferralCode() || generateReferralCode(fullName)
  };

  saveTicket(ticket);
  recordTicketSaleMetric(event.id, event.price, ticket.createdAt);
  saveEventToCalendar(event.id, true, false);

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
    const hasHostedEvents = getHostedEvents().length > 0;
    settings.innerHTML = `
      <button type="button" class="settings-item" onclick="editProfile()"><span>Edit Profile</span><span>›</span></button>
      <button type="button" class="settings-item" onclick="toggleNotifications()"><span>Notifications</span><span>${profile.notificationsEnabled === false ? 'Off' : 'On'}</span></button>
      <button type="button" class="settings-item" onclick="${hasHostedEvents ? 'openHostDashboard()' : "showScreen('screen-host')"}"><span>${hasHostedEvents ? 'Host Dashboard' : 'Start Hosting'}</span><span>${hasHostedEvents ? '↗' : '›'}</span></button>
      <button type="button" class="settings-item js-install-app-btn hidden" onclick="promptInstallApp()"><span>Install Toka App</span><span>↓</span></button>
      <div class="settings-item static-item">
        <span>Language</span>
        <span>${escapeHtml(profile.language || 'English')}</span>
      </div>
      <div class="settings-item static-item">
        <span>Gender</span>
        <span>${escapeHtml(profile.gender || 'Not set')}</span>
      </div>
      <button type="button" class="settings-item" onclick="shareTokaApp()"><span>Share Toka</span><span>↗</span></button>
      <button type="button" class="settings-item" onclick="aboutToka()"><span>About Toka</span><span>i</span></button>
      <button type="button" class="settings-item danger" onclick="logoutUser()"><span>Logout</span><span>⎋</span></button>
    `;
    updateInstallCtaVisibility();
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
  const gender = window.prompt('Update your gender', profile.gender || '');
  if (gender === null) {
    return;
  }
  const normalizedPhone = validateAndNormalizePhoneInput(phone.trim(), profile.phoneCountryCode || '+256');
  if (!normalizedPhone.ok) {
    toast(normalizedPhone.error);
    return;
  }
  saveUserProfile({
    name: name.trim(),
    phone: normalizedPhone.e164,
    phoneCountryCode: normalizedPhone.countryCode,
    phoneNationalNumber: normalizedPhone.localNumber,
    email: email.trim(),
    gender: gender.trim()
  });
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

async function shareEventCard(event) {
  if (!event) {
    return;
  }

  const shareBase = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : window.location.href.replace(/\/[^/]*$/, '/');
  const shareUrl = `${shareBase.replace(/\/$/, '')}/e/${event.id}`;
  const shareText = `${event.name} on ${formatDateTime(event)} at ${event.venue}, ${event.city}. Ticket: ${formatPrice(event.price, event.currency)}.`;
  const shareData = {
    title: event.name,
    text: shareText,
    url: shareUrl
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await copyToClipboard(`${shareText} ${shareData.url}`);
    }
  } catch (error) {
    await copyToClipboard(`${shareText} ${shareData.url}`);
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

async function logoutUser() {
  const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
  if (client && client.auth) {
    try {
      await client.auth.signOut();
    } catch (error) {
      // Fall back to local state cleanup even if Supabase sign-out fails.
    }
  }

  if (typeof window.setSupabaseOwnerUserId === 'function') {
    window.setSupabaseOwnerUserId('');
  }
  if (typeof window.stopSupabaseAutoSync === 'function') {
    window.stopSupabaseAutoSync();
  }

  TOKA_AUTH_STATE.session = null;
  TOKA_AUTH_STATE.user = null;
  TOKA_AUTH_STATE.isAuthenticated = false;
  TOKA_AUTH_STATE.pendingScreenId = '';
  TOKA_AUTH_STATE.feedbackMessage = '';
  TOKA_AUTH_STATE.feedbackType = '';
  closeAuthModal();
  setAuthFeedback('');
  renderAuthHeader();
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
  const preview = qs('#host-preview');
  const success = qs('#host-success');
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
    if (TOKA_APP_STATE.hostStep === 3) {
      const isLocked = TOKA_APP_STATE.isPublishingHostEvent || TOKA_APP_STATE.hostSubmitted;
      publishButton.disabled = isLocked;
      publishButton.textContent = TOKA_APP_STATE.isPublishingHostEvent ? 'Publishing...' : (TOKA_APP_STATE.hostSubmitted ? 'Published ✓' : 'Publish Event');
    }
  }
  if (preview) {
    preview.classList.toggle('hidden', TOKA_APP_STATE.hostSubmitted && TOKA_APP_STATE.hostStep === 3);
  }
  if (success) {
    success.classList.toggle('hidden', !TOKA_APP_STATE.hostSubmitted || TOKA_APP_STATE.hostStep !== 3);
  }
  renderHostPreview();
  renderHostThumbnailPreview();
}

function getHostPublishFingerprint(formData) {
  return [
    formData.name,
    formData.category,
    formData.eventType,
    formData.deliveryMode,
    formData.date,
    formData.startTime,
    formData.endTime,
    formData.venue,
    formData.city,
    formData.free ? '1' : '0',
    String(formData.price),
    String(formData.capacity),
    formData.description,
    formData.thumbnailDataUrl ? 'thumb' : 'no-thumb'
  ].join('|').toLowerCase();
}

function setHostPublishButtonState({ disabled, label }) {
  const publishButton = qs('#host-publish-button');
  if (!publishButton) {
    return;
  }
  publishButton.disabled = Boolean(disabled);
  if (label) {
    publishButton.textContent = label;
  }
}

function resetHostPublishGuard() {
  TOKA_APP_STATE.hostSubmitted = false;
  TOKA_APP_STATE.isPublishingHostEvent = false;
  setHostPublishButtonState({ disabled: false, label: 'Publish Event' });

  const preview = qs('#host-preview');
  if (preview) {
    preview.classList.remove('hidden');
  }

  const success = qs('#host-success');
  if (success) {
    success.classList.add('hidden');
    success.innerHTML = '';
  }
}

function getHostFormData() {
  return {
    name: qs('#host-name')?.value.trim() || '',
    category: qs('#host-category')?.value || 'Music',
    eventType: qs('#host-event-type')?.value || 'other',
    deliveryMode: qs('#host-delivery-mode')?.value || 'in-person',
    date: qs('#host-date')?.value || '',
    startTime: qs('#host-start')?.value || '',
    endTime: qs('#host-end')?.value || '',
    venue: qs('#host-venue')?.value.trim() || '',
    city: qs('#host-city')?.value.trim() || '',
    free: qs('#host-free')?.checked || false,
    price: Number(qs('#host-price')?.value || 0),
    capacity: Number(qs('#host-capacity')?.value || 0),
    description: qs('#host-description')?.value.trim() || '',
    thumbnailDataUrl: TOKA_APP_STATE.hostThumbnailDataUrl || ''
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
        <img class="event-cover-image" src="${escapeHtml(getEventThumbnail(data))}" alt="Event thumbnail preview" loading="lazy" decoding="async" />
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
        <p class="event-meta">${escapeHtml(data.eventType)} · ${escapeHtml(data.deliveryMode)}</p>
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
  if (TOKA_APP_STATE.isPublishingHostEvent) {
    toast('Publishing in progress. Please wait.');
    return;
  }

  const formData = getHostFormData();
  if (!formData.name || !formData.date || !formData.venue || !formData.city || !formData.capacity) {
    toast('Please complete the required event details.');
    return;
  }

  const now = Date.now();
  const fingerprint = getHostPublishFingerprint(formData);
  if (
    TOKA_APP_STATE.lastPublishedFingerprint === fingerprint &&
    now - Number(TOKA_APP_STATE.lastPublishedAt || 0) < TOKA_HOST_PUBLISH_DUPLICATE_WINDOW_MS
  ) {
    toast('This event was already published. Edit details before publishing again.');
    return;
  }

  TOKA_APP_STATE.isPublishingHostEvent = true;
  setHostPublishButtonState({ disabled: true, label: 'Publishing...' });

  try {
    const profile = getUserProfile();
    const createdEvent = {
      id: `evt-${Date.now()}`,
      name: formData.name,
      category: formData.category,
      eventType: formData.eventType,
      deliveryMode: formData.deliveryMode,
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
      tags: [formData.category.toLowerCase(), formData.eventType, formData.deliveryMode],
      attendees: profile.name ? [profile.name] : [],
      createdBy: 'user',
      thumbnailDataUrl: formData.thumbnailDataUrl || ''
    };

    saveEvent(createdEvent);
    const success = qs('#host-success');
    if (success) {
      success.classList.remove('hidden');
      success.innerHTML = `
        <div class="publish-success-layout">
          <div class="publish-success-copy">
            <p class="eyebrow">Published</p>
            <h3>Your event is live</h3>
            <p class="text-muted">Share the organiser card or the link. People can open the event faster from either one.</p>
            <div class="publish-success-actions">
              <button type="button" class="button button-secondary button-small" onclick="copyToClipboard('toka.app/e/${createdEvent.id}')">Copy Link</button>
              <button type="button" class="button button-primary button-small" id="host-share-card-button">Share Card</button>
            </div>
            <div class="share-link-row publish-success-link-row">
              <code>toka.app/e/${createdEvent.id}</code>
            </div>
          </div>
          ${getSharableEventCardMarkup(createdEvent)}
        </div>
      `;
      const shareCardButton = qs('#host-share-card-button');
      if (shareCardButton) {
        shareCardButton.onclick = () => shareEventCard(createdEvent);
      }
    }

    TOKA_APP_STATE.hostSubmitted = true;
    TOKA_APP_STATE.lastPublishedFingerprint = fingerprint;
    TOKA_APP_STATE.lastPublishedAt = now;
    setHostPublishButtonState({ disabled: true, label: 'Published ✓' });

    const preview = qs('#host-preview');
    if (preview) {
      preview.classList.add('hidden');
    }

    TOKA_APP_STATE.homeCategory = 'All';
    TOKA_APP_STATE.discoverCategory = 'All';
    TOKA_APP_STATE.discoverTimeFilter = 'All';
    TOKA_APP_STATE.discoverQuery = '';

    renderHome();
    renderDiscover();
    renderCalendarScreen();
    renderProfile();
    toast('Event published.');
  } catch (error) {
    toast('Could not publish event. Please try again.');
    setHostPublishButtonState({ disabled: false, label: 'Publish Event' });
  } finally {
    TOKA_APP_STATE.isPublishingHostEvent = false;
  }
}

function renderHostThumbnailPreview() {
  const preview = qs('#host-thumbnail-preview');
  if (!preview) {
    return;
  }

  if (!TOKA_APP_STATE.hostThumbnailDataUrl) {
    preview.classList.add('hidden');
    preview.innerHTML = '';
    return;
  }

  preview.classList.remove('hidden');
  preview.innerHTML = `
    <img src="${escapeHtml(TOKA_APP_STATE.hostThumbnailDataUrl)}" alt="Selected event thumbnail" />
    <button type="button" class="button button-ghost button-small" onclick="clearHostThumbnail()">Remove</button>
  `;
}

function handleHostThumbnailFile(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    toast('Please choose an image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    TOKA_APP_STATE.hostThumbnailDataUrl = String(reader.result || '');
    renderHostThumbnailPreview();
    renderHostPreview();
  };
  reader.onerror = () => toast('Could not read image file.');
  reader.readAsDataURL(file);
}

function clearHostThumbnail() {
  TOKA_APP_STATE.hostThumbnailDataUrl = '';
  const input = qs('#host-thumbnail-input');
  if (input) {
    input.value = '';
  }
  renderHostThumbnailPreview();
  renderHostPreview();
}

function openHostDashboard() {
  TOKA_APP_STATE.hostDashboardRoute = 'dashboard';
  window.location.hash = '#/host/dashboard';
  showScreen('screen-host-dashboard');
}

function getHostedEvents() {
  const allEvents = getEvents();
  return allEvents.filter((event) => userIsOrganiser(event));
}

function getRevenueSeries(eventId, points = 7) {
  const metric = getEventMetric(eventId);
  const history = Array.isArray(metric.ticketSalesHistory) ? metric.ticketSalesHistory : [];
  const dayBuckets = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = points - 1; index >= 0; index -= 1) {
    const day = new Date(today.getTime() - (index * dayMs));
    const key = day.toISOString().slice(0, 10);
    dayBuckets.push({ key, label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: 0 });
  }

  history.forEach((entry) => {
    const dayKey = new Date(entry.timestamp).toISOString().slice(0, 10);
    const bucket = dayBuckets.find((item) => item.key === dayKey);
    if (bucket) {
      bucket.revenue += Number(entry.amount || 0);
    }
  });

  return dayBuckets;
}

function getEventStatusBadge(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(`${event.date}T12:00:00`);
  const diffDays = Math.floor((eventDate - today) / 86400000);

  if (diffDays < 0) {
    return { label: 'Past', className: 'is-past' };
  }
  if (diffDays === 0) {
    return { label: 'Today', className: 'is-today' };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}d away`, className: 'is-soon' };
  }
  return { label: 'Upcoming', className: 'is-upcoming' };
}

function renderHostDashboard() {
  if (window.TokaHostDashboardController && typeof window.TokaHostDashboardController.render === 'function') {
    window.TokaHostDashboardController.render();
    return;
  }

  const guard = qs('#host-dashboard-guard');
  const content = qs('#host-dashboard-content');
  if (!guard || !content) {
    return;
  }

  const hosted = getHostedEvents();
  if (!hosted.length) {
    guard.classList.remove('hidden');
    guard.innerHTML = `
      <h3>Host access only</h3>
      <p class="text-muted">Publish at least one event from this profile to unlock dashboard analytics.</p>
      <button type="button" class="button button-primary" onclick="showScreen('screen-host')">Create Event</button>
    `;
    content.innerHTML = '';
    return;
  }

  guard.classList.add('hidden');
  const totalImpressions = hosted.reduce((sum, event) => sum + Number(getEventMetric(event.id).impressions || 0), 0);
  const totalTicketSales = hosted.reduce((sum, event) => sum + Number(getEventMetric(event.id).ticketSalesCount || 0), 0);
  const totalRevenue = hosted.reduce((sum, event) => sum + Number(getEventMetric(event.id).ticketRevenueTotal || 0), 0);
  const totalRegistrations = hosted.reduce((sum, event) => sum + Number(event.registered || 0), 0);

  const headerSummary = `
    <section class="dashboard-summary-grid" aria-label="Host overview metrics">
      <article class="stat-card"><strong>${hosted.length}</strong><span>Hosted Events</span></article>
      <article class="stat-card"><strong>${totalRegistrations}</strong><span>Total Registered</span></article>
      <article class="stat-card"><strong>${totalTicketSales}</strong><span>Total Tickets Sold</span></article>
      <article class="stat-card"><strong>${formatPrice(totalRevenue, 'UGX')}</strong><span>Total Revenue</span></article>
      <article class="stat-card"><strong>${totalImpressions}</strong><span>Total Impressions</span></article>
    </section>
  `;

  const eventCards = hosted.map((event) => {
    const metric = getEventMetric(event.id);
    const impressions = Number(metric.impressions || 0);
    const sold = Number(metric.ticketSalesCount || 0);
    const registered = Number(event.registered || 0);
    const capacity = Number(event.capacity || 0);
    const remaining = capacity > 0 ? Math.max(capacity - registered, 0) : 0;
    const fillRate = capacity > 0 ? ((registered / capacity) * 100).toFixed(1) : '0.0';
    const conversion = impressions > 0 ? ((sold / impressions) * 100).toFixed(1) : '0.0';
    const entries = getCalendarEntries().filter((entry) => entry.eventId === event.id);
    const withTicket = entries.filter((entry) => entry.withTicket).length;
    const withoutTicket = entries.filter((entry) => !entry.withTicket).length;
    const thumb = getEventThumbnail(event);
    const status = getEventStatusBadge(event);

    return `
      <article class="dashboard-card card" aria-label="Dashboard card for ${escapeHtml(event.name)}">
        <div class="dashboard-top">
          ${thumb ? `<img class="dashboard-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(event.name)} thumbnail" />` : `<div class="dashboard-thumb-fallback">${escapeHtml(event.emoji || '🎫')}</div>`}
          <div>
            <div class="dashboard-title-row">
              <h3>${escapeHtml(event.name)}</h3>
              <span class="dashboard-pill ${status.className}">${escapeHtml(status.label)}</span>
            </div>
            <p class="text-muted">${escapeHtml(event.city)} · ${escapeHtml(formatDate(event.date))}</p>
            <p class="dashboard-event-meta">Capacity ${capacity || 0} · Remaining ${remaining} · Fill ${fillRate}%</p>
          </div>
        </div>
        <div class="dashboard-metrics">
          <div class="stat-card"><strong>${formatPrice(metric.ticketRevenueTotal || 0, event.currency || 'UGX')}</strong><span>Total Revenue</span></div>
          <div class="stat-card"><strong>${registered}</strong><span>Registered People</span></div>
          <div class="stat-card"><strong>${sold}</strong><span>Tickets Sold</span></div>
          <div class="stat-card"><strong>${remaining}</strong><span>Remaining Slots</span></div>
          <div class="stat-card"><strong>${withTicket} / ${withoutTicket}</strong><span>Calendar Adds (With/Without Ticket)</span></div>
          <div class="stat-card"><strong>${impressions}</strong><span>Impressions</span></div>
          <div class="stat-card"><strong>${conversion}%</strong><span>Conversion Rate</span></div>
        </div>
        <div class="dashboard-actions">
          <button type="button" class="button button-secondary button-small" onclick="openEventDetail('${event.id}')">View Event</button>
          <button type="button" class="button button-ghost button-small" onclick="copyToClipboard('toka.app/e/${event.id}')">Copy Event Link</button>
        </div>
        <div class="dashboard-chart-wrap">
          <canvas id="host-chart-${escapeHtml(event.id)}" height="120" role="img" aria-label="Revenue chart for ${escapeHtml(event.name)}"></canvas>
        </div>
      </article>
    `;
  }).join('');

  content.innerHTML = `${headerSummary}${eventCards}`;

  Object.values(TOKA_APP_STATE.hostChartInstances).forEach((chart) => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
  TOKA_APP_STATE.hostChartInstances = {};

  hosted.forEach((event) => {
    const ctx = qs(`#host-chart-${event.id}`);
    if (!ctx || typeof Chart === 'undefined') {
      return;
    }
    const series = getRevenueSeries(event.id, 7);
    TOKA_APP_STATE.hostChartInstances[event.id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map((point) => point.label),
        datasets: [{
          label: 'Revenue',
          data: series.map((point) => point.revenue),
          borderColor: '#F4500A',
          backgroundColor: 'rgba(244, 80, 10, 0.16)',
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: {
              color: '#888888'
            },
            grid: {
              color: 'rgba(255,255,255,0.08)'
            }
          },
          x: {
            ticks: {
              color: '#888888'
            },
            grid: {
              color: 'rgba(255,255,255,0.06)'
            }
          }
        }
      }
    });
  });
}

function getCalendarDayPayload(year, month, day) {
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const holidays = getPublicHolidays().filter((holiday) => holiday.date === dateString);
  const entries = getCalendarEntries();
  const events = entries
    .map((entry) => ({ ...entry, event: getEventById(entry.eventId) }))
    .filter((entry) => entry.event && entry.event.date === dateString);

  return { dateString, holidays, events };
}

function renderCalendarScreen() {
  const authGuard = qs('#calendar-auth-guard');
  const shell = qs('#calendar-shell');
  const monthLabel = qs('#calendar-month-label');
  const weekdays = qs('#calendar-weekdays');
  const grid = qs('#calendar-grid');

  if (!authGuard || !shell || !monthLabel || !weekdays || !grid) {
    return;
  }

  const isLoggedIn = isLoggedInUser();
  authGuard.classList.toggle('hidden', isLoggedIn);
  shell.classList.toggle('hidden', !isLoggedIn);
  if (!isLoggedIn) {
    return;
  }

  monthLabel.textContent = new Date(TOKA_APP_STATE.calendarYear, TOKA_APP_STATE.calendarMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  weekdays.innerHTML = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => `<span>${name}</span>`).join('');

  const firstDayIndex = new Date(TOKA_APP_STATE.calendarYear, TOKA_APP_STATE.calendarMonth, 1).getDay();
  const daysInMonth = new Date(TOKA_APP_STATE.calendarYear, TOKA_APP_STATE.calendarMonth + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);
  const cells = [];

  for (let index = 0; index < firstDayIndex; index += 1) {
    cells.push('<div class="calendar-day empty"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const payload = getCalendarDayPayload(TOKA_APP_STATE.calendarYear, TOKA_APP_STATE.calendarMonth, day);
    const isToday = payload.dateString === todayIso;
    const holidayMarkers = payload.holidays.map((holiday) => `
      <button type="button" class="calendar-marker holiday" onclick="openCalendarEventModal('${holiday.id}', 'holiday')">${escapeHtml(holiday.name)}</button>
    `).join('');
    const eventMarkers = payload.events.map((entry) => `
      <button type="button" class="calendar-marker ${entry.withTicket ? 'ticket' : 'ghost'}" onclick="openCalendarEventModal('${entry.eventId}', 'event')">
        ${entry.withTicket ? '🎫' : '○'} ${escapeHtml(entry.event.name)}
      </button>
    `).join('');

    cells.push(`
      <div class="calendar-day ${isToday ? 'today' : ''}">
        <div class="calendar-day-number">${day}</div>
        <div class="calendar-day-events">${holidayMarkers}${eventMarkers}</div>
      </div>
    `);
  }

  grid.innerHTML = cells.join('');
}

function changeCalendarMonth(offset) {
  TOKA_APP_STATE.calendarMonth += Number(offset || 0);
  if (TOKA_APP_STATE.calendarMonth < 0) {
    TOKA_APP_STATE.calendarMonth = 11;
    TOKA_APP_STATE.calendarYear -= 1;
  }
  if (TOKA_APP_STATE.calendarMonth > 11) {
    TOKA_APP_STATE.calendarMonth = 0;
    TOKA_APP_STATE.calendarYear += 1;
  }
  renderCalendarScreen();
}

function goToTodayCalendarMonth() {
  const now = new Date();
  TOKA_APP_STATE.calendarMonth = now.getMonth();
  TOKA_APP_STATE.calendarYear = now.getFullYear();
  renderCalendarScreen();
}

function openCalendarEventModal(refId, type) {
  const modal = qs('#calendar-event-modal');
  const content = qs('#calendar-modal-content');
  if (!modal || !content) {
    return;
  }

  if (type === 'holiday') {
    const holiday = getPublicHolidays().find((item) => item.id === refId);
    if (!holiday) {
      return;
    }
    content.innerHTML = `
      <p class="eyebrow">Public Holiday</p>
      <h3>${escapeHtml(holiday.name)}</h3>
      <p class="text-muted">${escapeHtml(formatDate(holiday.date))}</p>
      <p class="text-muted">Scope: ${escapeHtml(holiday.scope || 'National')}</p>
    `;
  } else {
    const event = getEventById(refId);
    if (!event) {
      return;
    }
    const savedEntry = getCalendarSavedEntry(event.id);
    const thumb = getEventThumbnail(event);
    content.innerHTML = `
      ${thumb ? `<img class="calendar-modal-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(event.name)} thumbnail" />` : ''}
      <span class="badge">${savedEntry && savedEntry.withTicket ? 'Saved with Ticket' : 'Saved (No Ticket)'}</span>
      <h3>${escapeHtml(event.name)}</h3>
      <p class="text-muted">${escapeHtml(formatDateTime(event))}</p>
      <p class="text-muted">${escapeHtml(event.city)} · ${escapeHtml(event.venue)}</p>
      <div class="calendar-modal-actions">
        <button type="button" class="button button-secondary" onclick="openEventDetail('${event.id}'); closeCalendarEventModal();">View Details</button>
        <button type="button" class="button button-primary" onclick="openRegistration('${event.id}'); closeCalendarEventModal();">Get Ticket</button>
      </div>
    `;
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeCalendarEventModal() {
  const modal = qs('#calendar-event-modal');
  if (!modal) {
    return;
  }
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function startOnboarding() {
  if (!isAuthenticatedUser()) {
    TOKA_AUTH_STATE.pendingScreenId = TOKA_APP_STATE.postOnboardingScreen || TOKA_AUTH_STATE.pendingScreenId || 'screen-home';
    openAuthModal('signin', 'Sign in first, then complete onboarding.');
    return;
  }

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
  const phoneRaw = qs('#onboarding-phone')?.value.trim();
  const profile = getUserProfile();
  if (!name || !phoneRaw || !(profile.interests || []).length) {
    toast('Add your name, phone, and at least one interest.');
    return;
  }

  const normalizedPhone = validateAndNormalizePhoneInput(phoneRaw, profile.phoneCountryCode || '+256');
  if (!normalizedPhone.ok) {
    toast(normalizedPhone.error);
    return;
  }

  saveUserProfile({
    name,
    phone: normalizedPhone.e164,
    phoneCountryCode: normalizedPhone.countryCode,
    phoneNationalNumber: normalizedPhone.localNumber,
    interests: profile.interests || []
  });
  setOnboardingComplete(true);
  if (!getReferralCode()) {
    setReferralCode(generateReferralCode(name));
  }
  renderHome();
  renderDiscover();
  renderTickets();
  renderProfile();
  const nextScreen = TOKA_APP_STATE.postOnboardingScreen || TOKA_AUTH_STATE.pendingScreenId || 'screen-home';
  TOKA_APP_STATE.postOnboardingScreen = '';
  TOKA_AUTH_STATE.pendingScreenId = '';
  showScreen(nextScreen);
  toast('Welcome to Toka.');
}

function goOnboardingBack() {
  if (TOKA_APP_STATE.onboardingStep > 1) {
    TOKA_APP_STATE.onboardingStep -= 1;
    renderOnboarding();
  }
}

function bindGlobalEvents() {
  const authForm = qs('#auth-form');
  if (authForm) {
    authForm.addEventListener('submit', handleAuthSubmit);
  }

  const authToggle = qs('#auth-toggle-mode');
  if (authToggle) {
    authToggle.addEventListener('click', toggleAuthMode);
  }

  const authForgot = qs('#auth-forgot-password');
  if (authForgot) {
    authForgot.addEventListener('click', handleForgotPassword);
  }

  const authResend = qs('#auth-resend-confirmation');
  if (authResend) {
    authResend.addEventListener('click', handleResendConfirmation);
  }

  const authClose = qs('#auth-close');
  if (authClose) {
    authClose.addEventListener('click', closeAuthModal);
  }

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
      hostForm.addEventListener(eventType, () => {
        resetHostPublishGuard();
        renderHostPreview();
      });
    });
  }

  const hostThumbnailInput = qs('#host-thumbnail-input');
  const hostDropzone = qs('#host-thumbnail-dropzone');
  if (hostThumbnailInput && hostDropzone) {
    hostDropzone.addEventListener('click', () => hostThumbnailInput.click());
    hostDropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        hostThumbnailInput.click();
      }
    });
    hostThumbnailInput.addEventListener('change', () => {
      const file = hostThumbnailInput.files && hostThumbnailInput.files[0];
      handleHostThumbnailFile(file);
    });
    hostDropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      hostDropzone.classList.add('dragging');
    });
    hostDropzone.addEventListener('dragleave', () => hostDropzone.classList.remove('dragging'));
    hostDropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      hostDropzone.classList.remove('dragging');
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      handleHostThumbnailFile(file);
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

  window.addEventListener('hashchange', () => {
    const screen = resolveScreenFromHash();
    if (screen !== TOKA_APP_STATE.currentScreen) {
      showScreen(screen);
    }
  });
}

function initializeLandingState() {
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
  const screenFromHash = resolveScreenFromHash();
  showScreen(screenFromHash || 'screen-home');
}

async function initApp() {
  registerPwaInstallHandlers();
  await registerServiceWorker();
  bindGlobalEvents();
  window.addEventListener('toka:cloud-events-updated', () => {
    renderHome();
    renderDiscover();
    if (TOKA_APP_STATE.currentScreen === 'screen-host-dashboard') {
      renderHostDashboard();
    }
  });
  renderAuthHeader();

  if (typeof getSupabaseClient === 'function') {
    const client = getSupabaseClient();
    if (client && client.auth) {
      const { data } = await client.auth.getSession();
      await applyAuthSession(data ? data.session : null);
      client.auth.onAuthStateChange((event, session) => {
        applyAuthSession(session);
        if (event === 'SIGNED_OUT') {
          closeAuthModal();
        }
      });
    }
  }

  renderAuthHeader();

  if (TOKA_AUTH_STATE.isAuthenticated && typeof window.initializeSupabaseSync === 'function') {
    await window.initializeSupabaseSync();
  }

  seedMockComments();
  syncCalendarEntriesFromTickets();
  initializeLandingState();
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

  const hostInputs = ['#host-name', '#host-category', '#host-event-type', '#host-delivery-mode', '#host-date', '#host-start', '#host-end', '#host-venue', '#host-city', '#host-price', '#host-capacity', '#host-description'];
  hostInputs.forEach((selector) => {
    const element = qs(selector);
    if (element) {
      element.addEventListener('input', renderHostPreview);
      element.addEventListener('change', renderHostPreview);
    }
  });

  renderHostScreen();
  renderCalendarScreen();
  if (qs('#host-price') && qs('#host-free')?.checked) {
    qs('#host-price').closest('.field-group')?.classList.add('hidden');
  }

  if (!TOKA_AUTH_STATE.isAuthenticated) {
    renderAuthHeader();
  }

  updateInstallCtaVisibility();
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
window.saveSelectedEventToCalendar = saveSelectedEventToCalendar;
window.changeCalendarMonth = changeCalendarMonth;
window.goToTodayCalendarMonth = goToTodayCalendarMonth;
window.openCalendarEventModal = openCalendarEventModal;
window.closeCalendarEventModal = closeCalendarEventModal;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.openHostDashboard = openHostDashboard;
window.clearHostThumbnail = clearHostThumbnail;
window.startOnboarding = startOnboarding;
window.promptInstallApp = promptInstallApp;