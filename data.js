// Toka data layer and localStorage helpers

const TOKA_STORAGE_KEYS = {
    onboardingComplete: 'toka_onboarding_complete',
    userProfile: 'toka_user_profile',
    tickets: 'toka_tickets',
    events: 'toka_events',
    referralCode: 'toka_referral_code',
    calendarEntries: 'toka_calendar_entries',
    eventMetrics: 'toka_event_metrics'
};

const TOKA_PUBLIC_HOLIDAYS = [
    { id: 'hol-2026-01-01', date: '2026-01-01', name: "New Year's Day", scope: 'National' },
    { id: 'hol-2026-01-26', date: '2026-01-26', name: 'NRM Liberation Day', scope: 'National' },
    { id: 'hol-2026-03-08', date: '2026-03-08', name: "International Women's Day", scope: 'National' },
    { id: 'hol-2026-04-03', date: '2026-04-03', name: 'Good Friday', scope: 'National' },
    { id: 'hol-2026-04-06', date: '2026-04-06', name: 'Easter Monday', scope: 'National' },
    { id: 'hol-2026-05-01', date: '2026-05-01', name: 'Labour Day', scope: 'National' },
    { id: 'hol-2026-06-03', date: '2026-06-03', name: "Martyrs' Day", scope: 'National' },
    { id: 'hol-2026-06-09', date: '2026-06-09', name: 'National Heroes Day', scope: 'National' },
    { id: 'hol-2026-10-09', date: '2026-10-09', name: 'Independence Day', scope: 'National' },
    { id: 'hol-2026-12-25', date: '2026-12-25', name: 'Christmas Day', scope: 'National' },
    { id: 'hol-2026-12-26', date: '2026-12-26', name: 'Boxing Day', scope: 'National' }
];

const TOKA_CATEGORY_OPTIONS = [
    'Music',
    'Sports',
    'Business',
    'Art',
    'Faith',
    'Food & Drinks',
    'Tech',
    'Campus',
    'Community'
];

const TOKA_INTEREST_OPTIONS = [
    'Music',
    'Sports',
    'Business',
    'Art',
    'Faith',
    'Food & Drinks',
    'Tech',
    'Campus',
    'Community'
];

const MOCK_EVENTS = [{
        id: 'evt001',
        name: 'Kampala Jazz Night',
        category: 'Music',
        emoji: '🎷',
        gradient: 'linear-gradient(135deg, #F4500A, #F7B731)',
        date: '2026-04-18',
        time: '7:00 PM',
        endTime: '11:00 PM',
        venue: 'Serena Hotel Ballroom',
        city: 'Kampala',
        price: 25000,
        currency: 'UGX',
        capacity: 200,
        registered: 147,
        description: 'An evening of soulful jazz with Uganda’s finest musicians, warm lighting, and a crowd that knows how to stay for one more set.',
        organiser: 'Kampala Arts Collective',
        tags: ['jazz', 'music', 'nightlife'],
        attendees: ['Amina K', 'Brian T', 'Joan M', 'David K', 'Nora S']
    },
    {
        id: 'evt002',
        name: 'Mbarara Campus Tech Jam',
        category: 'Tech',
        emoji: '💻',
        gradient: 'linear-gradient(135deg, #0D0D0D, #F4500A)',
        date: '2026-04-12',
        time: '2:00 PM',
        endTime: '6:00 PM',
        venue: 'Nkokonjeru Innovation Hub',
        city: 'Mbarara',
        price: 0,
        currency: 'UGX',
        capacity: 300,
        registered: 214,
        description: 'A free campus tech meet-up for builders, founders, and curious students. Expect demos, networking, and practical talks that keep things moving.',
        organiser: 'Mbarara Tech Circle',
        tags: ['tech', 'students', 'innovation'],
        attendees: ['Ibrahim S', 'Patricia N', 'Kevin R', 'Faith A']
    },
    {
        id: 'evt003',
        name: 'Founders Breakfast Forum',
        category: 'Business',
        emoji: '📈',
        gradient: 'linear-gradient(135deg, #F7B731, #F4500A)',
        date: '2026-04-22',
        time: '8:00 AM',
        endTime: '11:00 AM',
        venue: 'The Square, Kololo',
        city: 'Kampala',
        price: 30000,
        currency: 'UGX',
        capacity: 120,
        registered: 89,
        description: 'A focused morning for founders, operators, and investors to trade ideas, sharpen pitches, and build useful connections over breakfast.',
        organiser: 'Rise Africa Network',
        tags: ['founders', 'business', 'networking'],
        attendees: ['Sheila B', 'Martin O', 'Jude P', 'Leah C']
    },
    {
        id: 'evt004',
        name: 'Sunset Beach Games',
        category: 'Sports',
        emoji: '🏆',
        gradient: 'linear-gradient(135deg, #C6F135, #F7B731)',
        date: '2026-04-27',
        time: '4:00 PM',
        endTime: '8:30 PM',
        venue: 'Lido Beach Grounds',
        city: 'Entebbe',
        price: 15000,
        currency: 'UGX',
        capacity: 500,
        registered: 305,
        description: 'A high-energy sports afternoon with beach games, team challenges, music, and a sunset finish that feels like a proper weekend reset.',
        organiser: 'Entebbe Active Crew',
        tags: ['sports', 'beach', 'fun'],
        attendees: ['Kelvin D', 'Sandra U', 'Mike A', 'Ruth K', 'Lydia P']
    },
    {
        id: 'evt005',
        name: 'Harvest Praise Conference',
        category: 'Faith',
        emoji: '🙏',
        gradient: 'linear-gradient(135deg, #F4500A, #0D0D0D)',
        date: '2026-05-03',
        time: '9:00 AM',
        endTime: '5:00 PM',
        venue: 'Redeemed Centre',
        city: 'Kampala',
        price: 0,
        currency: 'UGX',
        capacity: 800,
        registered: 621,
        description: 'A free faith gathering with worship, teaching, and a welcoming atmosphere for anyone looking to reconnect and recharge.',
        organiser: 'City Faith Partners',
        tags: ['faith', 'conference', 'worship'],
        attendees: ['Grace N', 'Moses B', 'Eunice T', 'Peter W']
    },
    {
        id: 'evt006',
        name: 'Late Plate Food Bazaar',
        category: 'Food & Drinks',
        emoji: '🍔',
        gradient: 'linear-gradient(135deg, #2E2E2E, #F7B731)',
        date: '2026-05-10',
        time: '5:00 PM',
        endTime: '11:30 PM',
        venue: 'Plot 16 Rooftop',
        city: 'Kampala',
        price: 20000,
        currency: 'UGX',
        capacity: 250,
        registered: 176,
        description: 'A food and drinks popup with street food, cocktails, and slow beats. Built for people who love a strong plate and a longer conversation.',
        organiser: 'Tasty Streets UG',
        tags: ['food', 'drinks', 'popup'],
        attendees: ['Alex J', 'Mariam Q', 'Dennis L', 'Tracy H']
    },
    {
        id: 'evt007',
        name: 'Canvas & Clay Expo',
        category: 'Art',
        emoji: '🎨',
        gradient: 'linear-gradient(135deg, #F7B731, #C6F135)',
        date: '2026-05-15',
        time: '11:00 AM',
        endTime: '6:00 PM',
        venue: 'Makerere Art Court',
        city: 'Kampala',
        price: 0,
        currency: 'UGX',
        capacity: 180,
        registered: 93,
        description: 'An art exhibition and creative market featuring painters, ceramic artists, live sketches, and open conversations about making and meaning.',
        organiser: 'Kati Kati Art Space',
        tags: ['art', 'exhibition', 'creative'],
        attendees: ['Nelly S', 'Kato R', 'Abigail P']
    },
    {
        id: 'evt008',
        name: 'Mbarara Green Cleanup Drive',
        category: 'Community',
        emoji: '🌍',
        gradient: 'linear-gradient(135deg, #C6F135, #0D0D0D)',
        date: '2026-05-18',
        time: '8:30 AM',
        endTime: '1:00 PM',
        venue: 'Mbarara Town Centre',
        city: 'Mbarara',
        price: 0,
        currency: 'UGX',
        capacity: 250,
        registered: 168,
        description: 'A community cleanup and social impact day bringing volunteers, local businesses, and civic groups together for visible change.',
        organiser: 'Mbarara Green Volunteers',
        tags: ['community', 'cleanup', 'volunteering'],
        attendees: ['Gloria A', 'James K', 'Ben O', 'Hellen M', 'Isaac T']
    }
];

function safeJsonParse(value, fallback) {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function readStorage(key, fallback) {
    try {
        return safeJsonParse(localStorage.getItem(key), fallback);
    } catch (error) {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        return false;
    }
    return true;
}

function getTickets() {
    return readStorage(TOKA_STORAGE_KEYS.tickets, []);
}

function saveTicket(ticket) {
    const tickets = getTickets();
    const existingIndex = tickets.findIndex((item) => item.id === ticket.id);
    if (existingIndex >= 0) {
        tickets[existingIndex] = ticket;
    } else {
        tickets.unshift(ticket);
    }
    writeStorage(TOKA_STORAGE_KEYS.tickets, tickets);
    return ticket;
}

function getSavedEvents() {
    return readStorage(TOKA_STORAGE_KEYS.events, []);
}

function saveEvent(event) {
    const events = getSavedEvents();
    const existingIndex = events.findIndex((item) => item.id === event.id);
    if (existingIndex >= 0) {
        events[existingIndex] = event;
    } else {
        events.unshift(event);
    }
    writeStorage(TOKA_STORAGE_KEYS.events, events);
    return event;
}

function getEvents() {
    const savedEvents = getSavedEvents();
    const mergedEvents = new Map();

    MOCK_EVENTS.forEach((event) => {
        mergedEvents.set(event.id, {...event });
    });

    savedEvents.forEach((event) => {
        mergedEvents.set(event.id, {...mergedEvents.get(event.id), ...event });
    });

    return Array.from(mergedEvents.values()).sort((left, right) => new Date(left.date) - new Date(right.date));
}

function getUserProfile() {
    return readStorage(TOKA_STORAGE_KEYS.userProfile, {
        name: '',
        phone: '',
        email: '',
        interests: [],
        notificationsEnabled: true,
        language: 'English'
    });
}

function saveUserProfile(profile) {
    const currentProfile = getUserProfile();
    const nextProfile = {...currentProfile, ...profile };
    writeStorage(TOKA_STORAGE_KEYS.userProfile, nextProfile);
    return nextProfile;
}

function generateRandomSegment(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let output = '';
    for (let index = 0; index < length; index += 1) {
        output += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return output;
}

function generateTicketCode() {
    return 'TOKA-' + generateRandomSegment(6);
}

function slugifyName(name) {
    return String(name || 'friend')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'friend';
}

function generateReferralCode(name) {
    return slugifyName(name) + '-' + generateRandomSegment(4);
}

function getOnboardingComplete() {
    try {
        return localStorage.getItem(TOKA_STORAGE_KEYS.onboardingComplete) === 'true';
    } catch (error) {
        return false;
    }
}

function setOnboardingComplete(isComplete) {
    try {
        localStorage.setItem(TOKA_STORAGE_KEYS.onboardingComplete, String(Boolean(isComplete)));
    } catch (error) {
        return false;
    }
    return true;
}

function getReferralCode() {
    try {
        return localStorage.getItem(TOKA_STORAGE_KEYS.referralCode) || '';
    } catch (error) {
        return '';
    }
}

function setReferralCode(code) {
    try {
        localStorage.setItem(TOKA_STORAGE_KEYS.referralCode, code);
    } catch (error) {
        return false;
    }
    return true;
}

// -- KEY FORMAT -----------------------------------------------------------
// Comments for event "evt001" -> localStorage key: "toka_comments_evt001"
// Updates  for event "evt001" -> localStorage key: "toka_updates_evt001"

function getComments(eventId) {
    try {
        const raw = localStorage.getItem('toka_comments_' + eventId);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function saveComment(eventId, comment) {
    const comments = getComments(eventId);
    comments.push(comment);
    localStorage.setItem('toka_comments_' + eventId, JSON.stringify(comments));
}

function getUpdates(eventId) {
    try {
        const raw = localStorage.getItem('toka_updates_' + eventId);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function saveUpdate(eventId, update) {
    const updates = getUpdates(eventId);
    updates.push(update);
    localStorage.setItem('toka_updates_' + eventId, JSON.stringify(updates));
}

function toggleLike(eventId, commentId) {
    const comments = getComments(eventId);
    const profile = getUserProfile();
    if (!profile || !profile.name) {
        return;
    }

    const comment = comments.find((item) => item.id === commentId);
    if (!comment) {
        return;
    }

    comment.likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
    comment.likes = Number(comment.likes || 0);

    const alreadyLiked = comment.likedBy.indexOf(profile.name) !== -1;
    if (alreadyLiked) {
        comment.likedBy = comment.likedBy.filter((name) => name !== profile.name);
        comment.likes = Math.max(0, comment.likes - 1);
    } else {
        comment.likedBy.push(profile.name);
        comment.likes += 1;
    }

    localStorage.setItem('toka_comments_' + eventId, JSON.stringify(comments));
    return comment.likes;
}

function userHasTicket(eventId) {
    // Returns true if the current user has a ticket for this event.
    const tickets = getTickets();
    return tickets.some((ticket) => ticket.eventId === eventId);
}

function userIsOrganiser(event) {
    // Returns true if the current user created this event.
    const profile = getUserProfile();
    if (!profile) {
        return false;
    }
    return event.createdBy === 'user' ||
        event.organiser === profile.name ||
        event.organiserName === profile.name ||
        event.organiserPhone === profile.phone;
}

// Pre-seed 2-3 comments per featured event so the feature
// does not look empty on first load. Call seedMockComments() once on init.
function seedMockComments() {
    // Only seed once.
    if (localStorage.getItem('toka_comments_seeded')) {
        return;
    }

    const mockComments = {
        evt001: [{
                id: 'cmt_001',
                eventId: 'evt001',
                author: 'Amara K',
                initials: 'AK',
                color: '#F4500A',
                text: 'Been waiting for this all year. The lineup is incredible! 🎷',
                timestamp: Date.now() - 7200000,
                likes: 4,
                likedBy: []
            },
            {
                id: 'cmt_002',
                eventId: 'evt001',
                author: 'David M',
                initials: 'DM',
                color: '#F7B731',
                text: 'Anyone going alone? Would love to link up beforehand.',
                timestamp: Date.now() - 3600000,
                likes: 2,
                likedBy: []
            }
        ],
        evt002: [{
            id: 'cmt_003',
            eventId: 'evt002',
            author: 'Grace T',
            initials: 'GT',
            color: '#C6F135',
            text: 'Free entry AND top speakers? Toka really came through.',
            timestamp: Date.now() - 86400000,
            likes: 7,
            likedBy: []
        }]
    };

    Object.keys(mockComments).forEach((eventId) => {
        if (getComments(eventId).length === 0) {
            localStorage.setItem('toka_comments_' + eventId, JSON.stringify(mockComments[eventId]));
        }
    });

    if (getUpdates('evt001').length === 0) {
        saveUpdate('evt001', {
            id: 'upd_001',
            eventId: 'evt001',
            text: '🎉 We just confirmed a second performer. This evening just got even better - details dropping soon.',
            timestamp: Date.now() - 10800000,
            type: 'exciting'
        });
    }

    localStorage.setItem('toka_comments_seeded', 'true');
}

function getPublicHolidays() {
    return TOKA_PUBLIC_HOLIDAYS.slice();
}

function getCalendarEntries() {
    return readStorage(TOKA_STORAGE_KEYS.calendarEntries, []);
}

function saveCalendarEntry(entry) {
    const entries = getCalendarEntries();
    const existingIndex = entries.findIndex((item) => item.eventId === entry.eventId);
    const nextEntry = {
        eventId: entry.eventId,
        savedAt: entry.savedAt || new Date().toISOString(),
        withTicket: Boolean(entry.withTicket)
    };

    if (existingIndex >= 0) {
        entries[existingIndex] = {
            ...entries[existingIndex],
            ...nextEntry,
            withTicket: entries[existingIndex].withTicket || nextEntry.withTicket
        };
    } else {
        entries.unshift(nextEntry);
    }

    writeStorage(TOKA_STORAGE_KEYS.calendarEntries, entries);
    return nextEntry;
}

function getEventMetrics() {
    return readStorage(TOKA_STORAGE_KEYS.eventMetrics, {});
}

function saveEventMetrics(metrics) {
    writeStorage(TOKA_STORAGE_KEYS.eventMetrics, metrics || {});
}

function getEventMetric(eventId) {
    const metrics = getEventMetrics();
    return metrics[eventId] || {
        impressions: 0,
        ticketSalesCount: 0,
        ticketRevenueTotal: 0,
        ticketSalesHistory: [],
        calendarAddsWithTicket: 0,
        calendarAddsWithoutTicket: 0
    };
}

function incrementEventImpression(eventId) {
    const metrics = getEventMetrics();
    const current = getEventMetric(eventId);
    metrics[eventId] = {
        ...current,
        impressions: Number(current.impressions || 0) + 1
    };
    saveEventMetrics(metrics);
}

function recordTicketSaleMetric(eventId, amount, timestamp) {
    const metrics = getEventMetrics();
    const current = getEventMetric(eventId);
    metrics[eventId] = {
        ...current,
        ticketSalesCount: Number(current.ticketSalesCount || 0) + 1,
        ticketRevenueTotal: Number(current.ticketRevenueTotal || 0) + Number(amount || 0),
        ticketSalesHistory: [
            ...(Array.isArray(current.ticketSalesHistory) ? current.ticketSalesHistory : []),
            { timestamp: timestamp || new Date().toISOString(), amount: Number(amount || 0) }
        ]
    };
    saveEventMetrics(metrics);
}

function recordCalendarAddMetric(eventId, withTicket) {
    const metrics = getEventMetrics();
    const current = getEventMetric(eventId);
    metrics[eventId] = {
        ...current,
        calendarAddsWithTicket: Number(current.calendarAddsWithTicket || 0) + (withTicket ? 1 : 0),
        calendarAddsWithoutTicket: Number(current.calendarAddsWithoutTicket || 0) + (withTicket ? 0 : 1)
    };
    saveEventMetrics(metrics);
}