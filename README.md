# Toka Events

Toka Events is a mobile-first web app for discovering local events, registering quickly, and managing host workflows.

I am building this project in public with a strong focus on African event realities: mobile money expectations, lightweight onboarding, and practical organizer tooling.

## What the app does today

- Personalized onboarding and event discovery
- Event detail, registration, and ticket generation with QR support
- Profile and ticket history screens
- Host dashboard with organizer metrics and management tools
- Local-first UX (fast UI from browser storage) with optional Supabase sync
- GitHub Pages compatible static deployment

## Tech stack

- Frontend: HTML, CSS, vanilla JavaScript
- Data layer: localStorage as immediate source, optional Supabase mirror
- Hosting: GitHub Pages (static)
- PWA support: manifest + service worker

## Project structure

```text
Toka_Events/
  index.html
  app.js
  data.js
  host-dashboard-controller.js
  style.css
  supabase-config.js
  supabase-schema.sql
  supabase-ml-admin.sql
  docs/
    README.md
    SETUP.md
    ARCHITECTURE.md
    SUPABASE.md
    GITHUB_PAGES.md
    SECURITY.md
    ML_DATA.md
```

## Quick start

1. Clone this repository.
2. Open it in VS Code.
3. Serve it from a local static server (for example Live Server).
4. Open the local URL and test the core flow:
   - onboarding
   - browse events
   - register for an event
   - check profile/tickets
   - if organizer access is enabled, open host dashboard

Detailed setup is in docs/SETUP.md.

## Supabase support

Supabase integration is optional and designed to be safe for frontend usage:

- Use only publishable credentials in supabase-config.js
- Keep RLS enabled
- Scope rows to owner_user_id through anonymous auth user sessions
- Run schema scripts before expecting sync behavior

Full guide: docs/SUPABASE.md.

## Documentation map

- docs/README.md: documentation index
- docs/SETUP.md: local setup and troubleshooting
- docs/ARCHITECTURE.md: current frontend architecture and evolution path
- docs/SUPABASE.md: schema rollout, ownership model, and operations
- docs/GITHUB_PAGES.md: static hosting deployment checklist
- docs/SECURITY.md: key handling, RLS, and response playbook
- docs/ML_DATA.md: ML feature views and training data notes

## Current status

This repository is active and evolving.

Recent changes include:

- Dedicated host dashboard controller routing through hash subroutes
- Stronger owner-based Supabase row access patterns
- ML feature/training SQL views for analytics workflows
- Public event browsing cache separation from organizer private access

## Contributing

Contributions are welcome.

If you want to help, start with practical improvements:

- UX clarity for event registration and host workflows
- accessibility and performance improvements
- test coverage and reliability checks
- documentation and onboarding improvements

## License

MIT