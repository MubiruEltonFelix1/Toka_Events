# APP_CAPABILITIES.md
> Last updated: 2026-04-12  
> Version / Commit: 3e4c91a

---

## ✅ What This App Can Do
<!-- List every working feature with a one-line description -->
- **Mobile-first event discovery**: Browse, search, and filter events with a responsive, phone-friendly interface.
- **Personalized onboarding**: Collect user interests and profile details before unlocking protected actions.
- **Event detail browsing**: Open event pages with organiser context, metadata, comments, and organiser updates.
- **Event registration and ticketing**: Register for events, generate tickets, and surface QR-based ticket support.
- **Profile and ticket history**: View the user profile, saved state, and ticket history from dedicated screens.
- **Calendar saves**: Save events to a personal calendar, including the option to mark entries as saved with a ticket.
- **Host dashboard**: Manage organiser workflows, view KPIs, inspect audience ticket records, and handle basic refund status actions.
- **Ticketing controls for hosts**: Configure ticket tiers and reserve settings for hosted events.
- **Optional Supabase sync**: Mirror local app state to Supabase for persistence and cross-session continuity when configured.
- **Public event browsing cache**: Serve public event reads from a separate cache while keeping owner-scoped host data isolated.
- **PWA support**: Installable app shell with manifest and service worker support for repeat visits.
- **Hash-based navigation**: Use route fragments for static hosting compatibility, including host subroutes.

---

## ❌ What This App Cannot Do (Known Limitations)
<!-- Hard limits — things that are architecturally or intentionally out of scope -->
- **Real payment processing**: The app does not yet have a backend-verified payment flow or webhook-confirmed ticket finalization.
- **Server-side ticket validation**: QR/check-in verification is not enforced by a dedicated backend authority yet.
- **Strong trust-critical enforcement on the client alone**: Sensitive actions still rely on frontend logic and Supabase policy discipline.
- **Guaranteed instant cross-device consistency**: localStorage remains the fast source of truth, so cloud updates can lag until sync or refresh.
- **Full offline conflict resolution**: There is no dedicated queued-action or conflict-resolution UI for offline edits.
- **Production moderation tooling**: Admin/moderation workflows are still limited and not backed by a dedicated server admin layer.
- **Large-scale test automation**: Automated coverage is still thin compared with the amount of UI and sync logic in the app.

---

## ⚠️ Known Bugs & Edge Cases
<!-- Things that are broken, flaky, or only work under specific conditions -->
- **Supabase auth setup failures**: Anonymous sign-in can fail if the provider, site URL, or anon key is misconfigured.
- **Local cache masking remote changes**: localStorage can temporarily hide newer remote data until the app refreshes or sync catches up.
- **Startup fallback timing**: A hard loading fallback is used so skeleton screens do not hang indefinitely during hydration.
- **Owner-scoped reads can look like missing data**: If `owner_user_id` policies are wrong, host data may appear empty instead of showing a clear access error.
- **Client-managed host edits can drift**: Ticketing and refund state updates depend on the current browser session and can diverge if sync fails.
- **Performance degrades with larger local datasets**: Host metrics, attendee summaries, and client-side derivations will get heavier as ticket volumes grow.

---

## 📈 Performance Notes
<!-- Load times, memory usage, API latency, concurrency limits, etc. -->
- **Startup**: The app is static and build-free, so initial load is lightweight compared with server-rendered stacks.
- **Perceived speed**: localStorage-first rendering keeps the UI responsive even when Supabase is unavailable or slow.
- **Sync cadence**: Supabase sync runs on a 20-second interval when enabled.
- **Hydration safety**: A 3-second fallback prevents loading states from hanging forever during cloud bootstrap.
- **Repeat visits**: Service worker and static asset caching should improve revisit performance on supported browsers.
- **Scalability note**: Client-side aggregation is fine for small and medium event volumes, but host analytics will need backend support to scale cleanly.

---

## 🔄 Recent Changes (Last Session)
<!-- Rolling log of what changed — most recent first -->
### 2026-04-12
- Created `APP_CAPABILITIES.md` as the living source of truth for app capabilities and limits.
- Captured the current frontend-first feature set, including discovery, onboarding, tickets, calendar saves, host tools, and optional Supabase sync.
- Recorded confirmed limits around backend payments, ticket verification, offline conflict handling, moderation, and test coverage.

---

## 🚧 In Progress / Next Steps
<!-- What was planned or started but not finished -->
- [ ] Replace simulated or client-managed payment flow with backend verification.
- [ ] Add server-side QR ticket validation and check-in support.
- [ ] Expand automated tests for registration, host actions, and sync edge cases.
- [ ] Add clearer sync and offline-status UI for local-first behavior.

---

## 🗑️ Deprecated / Removed
<!-- Features that existed before but were removed — so we don't re-add them -->
- **None documented yet**: No deliberately removed product capability has been recorded in the repo notes so far.