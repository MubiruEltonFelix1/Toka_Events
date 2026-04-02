# Toka Events MVP: Pros, Limitations, and Improvement Plan

## Why this document
This document reviews the current state of the Toka Events web app (MVP), highlighting what is already strong, where the product is still limited, and what we should prioritize next.

The focus is practical: what needs urgent attention in the next days, and what can be scheduled for later iterations.

## Current Application Snapshot
From the current codebase, the app is a front-end MVP built with:
- HTML, CSS, and vanilla JavaScript
- Local in-browser storage (`localStorage`) for profile, onboarding state, tickets, events, and referral code
- Seeded mock event data with support for user-created events
- Multi-screen UX including onboarding, discovery, event detail, registration, ticket confirmation, my tickets, host flow, and profile

## Pros (What is working well)

### 1. Clear MVP scope and working core journey
The core user flow is already implemented end-to-end:
- Discover events
- View event details
- Register
- Receive ticket confirmation
- View ticket history

This is a strong foundation for demos, user interviews, and early validation.

### 2. Strong mobile-first and visual execution
The UI is visually consistent and brand-forward:
- Cohesive color system
- Good typography hierarchy
- Responsive layout patterns and reusable components (chips, cards, toasts, buttons)

This helps the product feel real even at MVP stage.

### 3. Good feature breadth for an MVP
The app already includes:
- Interest-based onboarding
- Category and time-based discovery filters
- Event hosting flow (3-step form)
- Profile customization
- Referral code generation and sharing

That breadth gives us multiple angles to test value with users.

### 4. State and data helpers are separated reasonably
`data.js` centralizes storage keys and helper methods, while `app.js` handles most UI logic. This is not fully modular yet, but it is a good start and easier to improve than a fully tangled single file.

### 5. Built-in fallback behavior for sharing and clipboard
Features like sharing and copy-to-clipboard include fallback logic. This improves reliability across browsers where APIs may differ.

## Limitations (Current risks and gaps)

### 1. No backend or real persistence
All data is browser-local:
- Data is tied to one device/browser
- No account sync across devices
- Data can be lost when browser storage is cleared

This is the biggest product limitation right now.

### 2. Payments are simulated, not integrated
The app presents payment choices (MTN/Airtel), but no real payment processing exists. This creates a gap between demo and production reality.

### 3. Validation and data quality are basic
Some critical inputs (phone format, date sanity, pricing constraints) rely on light checks. This can create bad data and inconsistent records.

### 4. Security and trust controls are missing
Because it is client-only:
- No authenticated users
- No secure ticket verification backend
- No anti-fraud controls for tickets/referrals

This blocks production launch for paid events.

### 5. Scalability and maintainability concerns
`app.js` contains many responsibilities in one large file (UI state, rendering, business logic, event handling). As features grow, this will become harder to maintain and test.

### 6. Accessibility and inclusive UX are not fully audited
The interface is visually strong, but there is no complete accessibility pass yet (keyboard coverage, ARIA consistency, contrast checks in every state, screen reader flow).

### 7. Missing analytics and observability
There is no telemetry for key funnel stages (view -> register -> confirm), errors, or drop-off points. Without this, product decisions become guesswork.

### 8. Limited test coverage
There are no automated tests currently (unit/integration/e2e). This increases regression risk as we make frequent changes.

## Improvement Plan: Urgent vs Later

## Urgent (Next 1-3 days)
These are highest-priority tasks we should tackle immediately.

### A. Stabilize critical user flows
- Tighten validation for registration and host forms
- Add clear inline error messages
- Prevent invalid event publish states (e.g., missing required fields, zero/negative paid prices)

Why urgent: prevents broken experiences during demos and first user trials.

### B. Add lightweight analytics instrumentation
Track key events:
- Event card viewed
- Registration started
- Registration completed
- Ticket viewed
- Host flow submitted

Why urgent: gives immediate insight into where users drop off.

### C. Improve reliability and edge-case handling
- Handle storage quota/full failures more visibly
- Guard against malformed or partial stored records
- Improve empty-state messaging for no results/no tickets

Why urgent: reduces silent failures and confusion.

### D. Ship a backend-ready data contract draft
Define a simple API contract document for:
- Users/profile
- Events
- Tickets
- Registrations
- Referrals

Why urgent: unblocks backend work and reduces rework later.

## Near-term (Next 4-10 days)
These are still important, but can begin after urgent stability work.

### A. Modular refactor of front-end code
Split logic into focused modules (for example):
- `state`
- `renderers`
- `services/storage`
- `features/onboarding`, `features/registration`, `features/host`

Why: easier debugging, cleaner collaboration, safer future changes.

### B. Add automated test baseline
- Unit tests for pure helpers (formatters, filters, storage guards)
- Basic UI integration tests for happy path flows

Why: protects us from regression as velocity increases.

### C. Accessibility pass
- Keyboard navigation check for all flows
- Label/ARIA improvements
- Contrast and focus-state audit

Why: improves usability and readiness for broader user groups.

### D. Performance cleanup
- Reduce unnecessary rerenders
- Review large DOM updates
- Optimize expensive filter/render operations

Why: keeps UX smooth on lower-end devices.

## Later (2-6 weeks)
These can be phased in after the platform is stable.

### A. Real backend and authentication
- User accounts and identity
- Server-side event/ticket storage
- Cross-device continuity

### B. Real payment integrations
- MTN Mobile Money and Airtel Money transaction flows
- Payment status callbacks and reconciliation

### C. Ticket verification system
- QR generation/validation linked to server records
- Check-in/attendance tools for organizers

### D. Organiser analytics dashboard
- Registrations over time
- Conversion by source
- Attendance trends

### E. Real referral attribution and rewards
- Track referral source reliably server-side
- Prevent abuse and duplicate claims

### F. Community layer features
- Pre-event attendee interactions
- Post-event memories and engagement

## Priority Matrix (Quick View)

### Must do now
- Validation hardening
- Analytics events
- Reliability guardrails
- Backend API contract definition

### Do soon
- JS modular refactor
- Test baseline
- Accessibility improvements
- Performance tuning

### Do later
- Backend + auth
- Live payments
- Ticket verification
- Advanced organizer/referral/community features

## Final recommendation
The current application is a strong MVP with a compelling user experience and enough implemented surface area to validate product demand.

The most important next move is not adding many new features immediately; it is stabilizing trust-critical flows, collecting usage data, and preparing backend integration. Once that is done, scaling into real payments, secure tickets, and community functionality will be much smoother and less risky.
