// Toka data layer and localStorage helpers

const TOKA_STORAGE_KEYS = {
    onboardingComplete: 'toka_onboarding_complete',
    userProfile: 'toka_user_profile',
    tickets: 'toka_tickets',
    events: 'toka_events',
    referralCode: 'toka_referral_code',
    calendarEntries: 'toka_calendar_entries',
    eventMetrics: 'toka_event_metrics',
    deviceId: 'toka_device_id'
};

const TOKA_SUPABASE_TABLES = {
    profiles: 'toka_profiles',
    events: 'toka_events',
    tickets: 'toka_tickets',
    comments: 'toka_comments',
    updates: 'toka_updates',
    calendarEntries: 'toka_calendar_entries',
    eventMetrics: 'toka_event_metrics'
};

let TOKA_SUPABASE_CLIENT = null;
let TOKA_SUPABASE_BOOTSTRAPPED = false;
let TOKA_SUPABASE_USER_ID = '';
let TOKA_SUPABASE_SYNC_INTERVAL_ID = null;
const TOKA_SUPABASE_SYNC_INTERVAL_MS = 20000;

function reportSupabaseError(context, error) {
    const message = error && (error.message || error.details || error.hint) ? (error.message || error.details || error.hint) : String(error || 'Unknown Supabase error');
    const payload = {
        context,
        message,
        at: new Date().toISOString()
    };
    window.TOKA_LAST_SUPABASE_ERROR = payload;
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error('[TOKA][Supabase]', context, error || message);
    }
}

function getDeviceId() {
    const existing = readStorage(TOKA_STORAGE_KEYS.deviceId, '');
    if (existing) {
        return existing;
    }
    const nextId = `device-${Date.now()}-${generateRandomSegment(8)}`;
    writeStorage(TOKA_STORAGE_KEYS.deviceId, nextId);
    return nextId;
}

function getSupabaseConfig() {
    const config = window.TOKA_SUPABASE_CONFIG || {};
    return {
        url: String(config.url || '').trim(),
        anonKey: String(config.anonKey || '').trim()
    };
}

function getSupabaseClient() {
    if (TOKA_SUPABASE_CLIENT) {
        return TOKA_SUPABASE_CLIENT;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        return null;
    }

    const config = getSupabaseConfig();
    if (!config.url || !config.anonKey) {
        return null;
    }

    TOKA_SUPABASE_CLIENT = window.supabase.createClient(config.url, config.anonKey);
    return TOKA_SUPABASE_CLIENT;
}

function getSupabaseOwnerUserId() {
    return TOKA_SUPABASE_USER_ID || (window.TOKA_AUTH_STATE && window.TOKA_AUTH_STATE.user ? window.TOKA_AUTH_STATE.user.id : '') || '';
}

function setSupabaseOwnerUserId(userId) {
    TOKA_SUPABASE_USER_ID = String(userId || '');
}

async function ensureSupabaseAuth() {
    const client = getSupabaseClient();
    if (!client || !client.auth) {
        return '';
    }

    const authStateUser = window.TOKA_AUTH_STATE && window.TOKA_AUTH_STATE.user ? window.TOKA_AUTH_STATE.user : null;
    const { data: sessionData } = await client.auth.getSession();
    const activeUser = authStateUser || (sessionData && sessionData.session && sessionData.session.user);
    if (activeUser && activeUser.id) {
        setSupabaseOwnerUserId(activeUser.id);
        return TOKA_SUPABASE_USER_ID;
    }

    setSupabaseOwnerUserId('');
    return '';
}

function queueSupabaseWrite(operation) {
    Promise.resolve()
        .then(operation)
        .catch((error) => {
            reportSupabaseError('queueSupabaseWrite', error);
        });
}

function mapById(items) {
    const map = new Map();
    (items || []).forEach((item) => {
        if (item && item.id) {
            map.set(item.id, item);
        }
    });
    return map;
}

function mergeById(localItems, remoteItems) {
    const map = mapById(localItems);
    (remoteItems || []).forEach((item) => {
        if (item && item.id) {
            map.set(item.id, item);
        }
    });
    return Array.from(map.values());
}

function getAllEventIdsKnown() {
    const ids = new Set();
    getEvents().forEach((event) => {
        ids.add(event.id);
    });
    return Array.from(ids);
}

async function supabaseSelect(table) {
    const client = getSupabaseClient();
    if (!client) {
        return [];
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return [];
    }

    const { data, error } = await client
        .from(table)
        .select('*')
        .eq('owner_user_id', ownerUserId);

    if (error || !Array.isArray(data)) {
        if (error) {
            reportSupabaseError(`select.${table}`, error);
        }
        return [];
    }

    return data;
}

async function supabaseSelectSharedEvents() {
    const client = getSupabaseClient();
    if (!client) {
        return [];
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return [];
    }

    const { data, error } = await client
        .from(TOKA_SUPABASE_TABLES.events)
        .select('*');

    if (error || !Array.isArray(data)) {
        if (error) {
            reportSupabaseError('select.sharedEvents', error);
        }
        return [];
    }

    return data;
}

function getRowUpdatedAt(row) {
    if (!row || !row.updated_at) {
        return 0;
    }
    const timestamp = Date.parse(row.updated_at);
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function pickLatestRow(rows) {
    let latest = null;
    let latestTs = -1;
    (rows || []).forEach((row) => {
        const ts = getRowUpdatedAt(row);
        if (!latest || ts >= latestTs) {
            latest = row;
            latestTs = ts;
        }
    });
    return latest;
}

function pickLatestRowsByKey(rows, keyField) {
    const latestByKey = new Map();
    (rows || []).forEach((row) => {
        if (!row || !row[keyField]) {
            return;
        }
        const current = latestByKey.get(row[keyField]);
        if (!current || getRowUpdatedAt(row) >= getRowUpdatedAt(current)) {
            latestByKey.set(row[keyField], row);
        }
    });
    return Array.from(latestByKey.values());
}

function upsertProfileCloud() {
    const client = getSupabaseClient();
    if (!client) {
        return;
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return;
    }

    const payload = {
        device_id: getDeviceId(),
        owner_user_id: ownerUserId,
        payload: getUserProfile(),
        onboarding_complete: getOnboardingComplete(),
        referral_code: getReferralCode(),
        updated_at: new Date().toISOString()
    };

    queueSupabaseWrite(async() => {
        await client.from(TOKA_SUPABASE_TABLES.profiles).upsert(payload, { onConflict: 'device_id' });
    });
}

function upsertEventCloud(event) {
    const client = getSupabaseClient();
    if (!client || !event || !event.id) {
        return;
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return;
    }

    const payload = {
        device_id: getDeviceId(),
        owner_user_id: ownerUserId,
        id: event.id,
        payload: event,
        updated_at: new Date().toISOString()
    };

    queueSupabaseWrite(async() => {
        await client.from(TOKA_SUPABASE_TABLES.events).upsert(payload, { onConflict: 'device_id,id' });
    });
}

function upsertTicketCloud(ticket) {
    const client = getSupabaseClient();
    if (!client || !ticket || !ticket.id) {
        return;
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return;
    }

    const payload = {
        device_id: getDeviceId(),
        owner_user_id: ownerUserId,
        id: ticket.id,
        payload: ticket,
        updated_at: new Date().toISOString()
    };

    queueSupabaseWrite(async() => {
        await client.from(TOKA_SUPABASE_TABLES.tickets).upsert(payload, { onConflict: 'device_id,id' });
    });
}

function upsertCommentCloud(eventId, comment) {
    const client = getSupabaseClient();
    if (!client || !eventId || !comment || !comment.id) {
        return;
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return;
    }

    const payload = {
        device_id: getDeviceId(),
        owner_user_id: ownerUserId,
        id: comment.id,
        event_id: eventId,
        payload: comment,
        updated_at: new Date().toISOString()
    };

    queueSupabaseWrite(async() => {
        await client.from(TOKA_SUPABASE_TABLES.comments).upsert(payload, { onConflict: 'device_id,id' });
    });
}

function upsertUpdateCloud(eventId, update) {
    const client = getSupabaseClient();
    if (!client || !eventId || !update || !update.id) {
        return;
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return;
    }

    const payload = {
        device_id: getDeviceId(),
        owner_user_id: ownerUserId,
        id: update.id,
        event_id: eventId,
        payload: update,
        updated_at: new Date().toISOString()
    };

    queueSupabaseWrite(async() => {
        await client.from(TOKA_SUPABASE_TABLES.updates).upsert(payload, { onConflict: 'device_id,id' });
    });
}

function upsertCalendarEntryCloud(entry) {
    const client = getSupabaseClient();
    if (!client || !entry || !entry.eventId) {
        return;
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return;
    }

    const payload = {
        device_id: getDeviceId(),
        owner_user_id: ownerUserId,
        event_id: entry.eventId,
        payload: entry,
        updated_at: new Date().toISOString()
    };

    queueSupabaseWrite(async() => {
        await client.from(TOKA_SUPABASE_TABLES.calendarEntries).upsert(payload, { onConflict: 'device_id,event_id' });
    });
}

function upsertEventMetricCloud(eventId, metric) {
    const client = getSupabaseClient();
    if (!client || !eventId || !metric) {
        return;
    }

    const ownerUserId = getSupabaseOwnerUserId();
    if (!ownerUserId) {
        return;
    }

    const payload = {
        device_id: getDeviceId(),
        owner_user_id: ownerUserId,
        event_id: eventId,
        payload: metric,
        updated_at: new Date().toISOString()
    };

    queueSupabaseWrite(async() => {
        await client.from(TOKA_SUPABASE_TABLES.eventMetrics).upsert(payload, { onConflict: 'device_id,event_id' });
    });
}

async function pullSupabaseIntoLocalStorage() {
    const client = getSupabaseClient();
    if (!client) {
        return;
    }

    const [profileRows, eventRows, ticketRows, commentRows, updateRows, calendarRows, metricRows] = await Promise.all([
        supabaseSelect(TOKA_SUPABASE_TABLES.profiles),
        supabaseSelectSharedEvents(),
        supabaseSelect(TOKA_SUPABASE_TABLES.tickets),
        supabaseSelect(TOKA_SUPABASE_TABLES.comments),
        supabaseSelect(TOKA_SUPABASE_TABLES.updates),
        supabaseSelect(TOKA_SUPABASE_TABLES.calendarEntries),
        supabaseSelect(TOKA_SUPABASE_TABLES.eventMetrics)
    ]);

    const remoteProfile = pickLatestRow(profileRows);
    if (remoteProfile && remoteProfile.payload) {
        const localProfile = getUserProfile();
        writeStorage(TOKA_STORAGE_KEYS.userProfile, {...localProfile, ...remoteProfile.payload });
        setOnboardingComplete(Boolean(remoteProfile.onboarding_complete));
        if (remoteProfile.referral_code) {
            setReferralCode(remoteProfile.referral_code);
        }
    }

    const remoteEvents = pickLatestRowsByKey(eventRows, 'id').map((row) => row.payload).filter(Boolean);
    if (remoteEvents.length) {
        writeStorage(TOKA_STORAGE_KEYS.events, mergeById(getSavedEvents(), remoteEvents));
    }

    const remoteTickets = pickLatestRowsByKey(ticketRows, 'id').map((row) => row.payload).filter(Boolean);
    if (remoteTickets.length) {
        writeStorage(TOKA_STORAGE_KEYS.tickets, mergeById(getTickets(), remoteTickets));
    }

    const remoteCalendarEntries = pickLatestRowsByKey(calendarRows, 'event_id').map((row) => row.payload).filter(Boolean);
    if (remoteCalendarEntries.length) {
        const localMap = new Map(getCalendarEntries().map((entry) => [entry.eventId, entry]));
        remoteCalendarEntries.forEach((entry) => {
            if (entry && entry.eventId) {
                localMap.set(entry.eventId, entry);
            }
        });
        writeStorage(TOKA_STORAGE_KEYS.calendarEntries, Array.from(localMap.values()));
    }

    const remoteMetrics = pickLatestRowsByKey(metricRows, 'event_id').reduce((accumulator, row) => {
        if (row && row.event_id && row.payload) {
            accumulator[row.event_id] = row.payload;
        }
        return accumulator;
    }, {});
    if (Object.keys(remoteMetrics).length) {
        writeStorage(TOKA_STORAGE_KEYS.eventMetrics, {
            ...getEventMetrics(),
            ...remoteMetrics
        });
    }

    const remoteCommentsByEvent = {};
    pickLatestRowsByKey(commentRows, 'id').forEach((row) => {
        if (!row || !row.event_id || !row.payload) {
            return;
        }
        if (!remoteCommentsByEvent[row.event_id]) {
            remoteCommentsByEvent[row.event_id] = [];
        }
        remoteCommentsByEvent[row.event_id].push(row.payload);
    });
    Object.keys(remoteCommentsByEvent).forEach((eventId) => {
        const merged = mergeById(getComments(eventId), remoteCommentsByEvent[eventId]);
        localStorage.setItem('toka_comments_' + eventId, JSON.stringify(merged));
    });

    const remoteUpdatesByEvent = {};
    pickLatestRowsByKey(updateRows, 'id').forEach((row) => {
        if (!row || !row.event_id || !row.payload) {
            return;
        }
        if (!remoteUpdatesByEvent[row.event_id]) {
            remoteUpdatesByEvent[row.event_id] = [];
        }
        remoteUpdatesByEvent[row.event_id].push(row.payload);
    });
    Object.keys(remoteUpdatesByEvent).forEach((eventId) => {
        const localUpdates = getUpdates(eventId);
        const mergedById = new Map(localUpdates.map((item) => [item.id, item]));
        remoteUpdatesByEvent[eventId].forEach((item) => {
            if (item && item.id) {
                mergedById.set(item.id, item);
            }
        });
        localStorage.setItem('toka_updates_' + eventId, JSON.stringify(Array.from(mergedById.values())));
    });
}

function notifyCloudEventsUpdated() {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
        return;
    }
    window.dispatchEvent(new CustomEvent('toka:cloud-events-updated'));
}

async function syncSharedEventsFromCloud() {
    const ownerUserId = await ensureSupabaseAuth();
    if (!ownerUserId) {
        return false;
    }

    const eventRows = await supabaseSelectSharedEvents();
    const remoteEvents = pickLatestRowsByKey(eventRows, 'id').map((row) => row.payload).filter(Boolean);
    if (remoteEvents.length) {
        writeStorage(TOKA_STORAGE_KEYS.events, mergeById(getSavedEvents(), remoteEvents));
        notifyCloudEventsUpdated();
    }
    return true;
}

function stopSupabaseAutoSync() {
    if (TOKA_SUPABASE_SYNC_INTERVAL_ID) {
        clearInterval(TOKA_SUPABASE_SYNC_INTERVAL_ID);
        TOKA_SUPABASE_SYNC_INTERVAL_ID = null;
    }
}

function startSupabaseAutoSync() {
    stopSupabaseAutoSync();
    TOKA_SUPABASE_SYNC_INTERVAL_ID = setInterval(() => {
        syncSharedEventsFromCloud().catch((error) => {
            reportSupabaseError('autoSync.sharedEvents', error);
        });
    }, TOKA_SUPABASE_SYNC_INTERVAL_MS);
}

function pushLocalSnapshotToSupabase() {
    if (!getSupabaseClient()) {
        return;
    }

    upsertProfileCloud();
    getSavedEvents().forEach((event) => upsertEventCloud(event));
    getTickets().forEach((ticket) => upsertTicketCloud(ticket));
    getCalendarEntries().forEach((entry) => upsertCalendarEntryCloud(entry));

    const metrics = getEventMetrics();
    Object.keys(metrics).forEach((eventId) => {
        upsertEventMetricCloud(eventId, metrics[eventId]);
    });

    getAllEventIdsKnown().forEach((eventId) => {
        getComments(eventId).forEach((comment) => upsertCommentCloud(eventId, comment));
        getUpdates(eventId).forEach((update) => upsertUpdateCloud(eventId, update));
    });
}

async function initializeSupabaseSync() {
    if (!getSupabaseClient()) {
        return false;
    }

    const ownerUserId = await ensureSupabaseAuth();
    if (!ownerUserId) {
        return false;
    }

    TOKA_SUPABASE_BOOTSTRAPPED = true;

    await pullSupabaseIntoLocalStorage();
    pushLocalSnapshotToSupabase();
    startSupabaseAutoSync();
    notifyCloudEventsUpdated();
    return true;
}

async function debugSupabaseConnection() {
    const client = getSupabaseClient();
    if (!client) {
        return {
            ok: false,
            reason: 'Supabase client not initialized. Check URL and key config.'
        };
    }

    const ownerUserId = await ensureSupabaseAuth();
    if (!ownerUserId) {
        return {
            ok: false,
            reason: 'Anonymous auth failed. Check Supabase Auth provider settings and URL config.',
            lastError: window.TOKA_LAST_SUPABASE_ERROR || null
        };
    }

    const { error } = await client
        .from(TOKA_SUPABASE_TABLES.profiles)
        .select('device_id')
        .eq('owner_user_id', ownerUserId)
        .limit(1);

    if (error) {
        reportSupabaseError('debug.selectProfiles', error);
        return {
            ok: false,
            reason: 'Profile table select failed. Likely schema mismatch or RLS policy mismatch.',
            lastError: window.TOKA_LAST_SUPABASE_ERROR || null
        };
    }

    return {
        ok: true,
        ownerUserId,
        deviceId: getDeviceId()
    };
}

window.initializeSupabaseSync = initializeSupabaseSync;
window.runFullSupabaseSync = pushLocalSnapshotToSupabase;
window.debugSupabaseConnection = debugSupabaseConnection;
window.setSupabaseOwnerUserId = setSupabaseOwnerUserId;
window.syncSharedEventsFromCloud = syncSharedEventsFromCloud;
window.startSupabaseAutoSync = startSupabaseAutoSync;
window.stopSupabaseAutoSync = stopSupabaseAutoSync;

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
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
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
        thumbnailUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
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
        thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
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
        thumbnailUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80',
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
        thumbnailUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1200&q=80',
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
        thumbnailUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80',
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
        thumbnailUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
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
    upsertTicketCloud(ticket);
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
    upsertEventCloud(event);
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
    upsertProfileCloud();
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
    upsertProfileCloud();
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
    upsertProfileCloud();
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
    upsertCommentCloud(eventId, comment);
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
    upsertUpdateCloud(eventId, update);
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
    upsertCommentCloud(eventId, comment);
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
    upsertCalendarEntryCloud(nextEntry);
    return nextEntry;
}

function syncCalendarEntriesFromTickets() {
    const entries = getCalendarEntries();
    const tickets = getTickets();
    const byEventId = new Map(entries.map((entry) => [entry.eventId, entry]));
    let added = 0;
    let upgraded = 0;

    tickets.forEach((ticket) => {
        if (!ticket || !ticket.eventId) {
            return;
        }

        const existing = byEventId.get(ticket.eventId);
        if (!existing) {
            const nextEntry = {
                eventId: ticket.eventId,
                savedAt: ticket.createdAt || new Date().toISOString(),
                withTicket: true
            };
            entries.unshift(nextEntry);
            byEventId.set(ticket.eventId, nextEntry);
            added += 1;
            return;
        }

        if (!existing.withTicket) {
            existing.withTicket = true;
            if (!existing.savedAt) {
                existing.savedAt = ticket.createdAt || new Date().toISOString();
            }
            upgraded += 1;
        }
    });

    if (added || upgraded) {
        writeStorage(TOKA_STORAGE_KEYS.calendarEntries, entries);
    }

    return { added, upgraded };
}

function getEventMetrics() {
    return readStorage(TOKA_STORAGE_KEYS.eventMetrics, {});
}

function saveEventMetrics(metrics) {
    writeStorage(TOKA_STORAGE_KEYS.eventMetrics, metrics || {});
    const safeMetrics = metrics || {};
    Object.keys(safeMetrics).forEach((eventId) => {
        upsertEventMetricCloud(eventId, safeMetrics[eventId]);
    });
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