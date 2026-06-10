<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d0d14,40:1a0d2e,80:0d1a15,100:0d0d14&height=140&section=header&text=Toka%20Events&fontSize=44&fontColor=eeedfe&fontAlignY=55&desc=Discover.%20Register.%20Show%20up.&descAlignY=80&descSize=15&animation=fadeIn" width="100%"/>
</div>

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-000000?style=flat-square&logo=vercel&logoColor=white)](#)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/MubiruEltonFelix1)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5a2d9c?style=flat-square&logo=pwa&logoColor=white)](#)
[![MIT License](https://img.shields.io/badge/License-MIT-1d9e75?style=flat-square)](#)
[![Status](https://img.shields.io/badge/Status-Active-1d9e75?style=flat-square)](#)

</div>

---

**Toka Events** is a mobile-first web app for discovering local events, registering fast, and managing host workflows — built with African event realities at the center: mobile money expectations, lightweight onboarding, and practical organiser tooling.

This project is being built in public. Every architectural decision, every tradeoff, every SQL view — documented and open.

---

## What it does

| Feature | Detail |
|---|---|
| **Event discovery** | Personalised onboarding flow + browsable event feed |
| **Registration & tickets** | One-tap registration with QR-code ticket generation |
| **Profile & history** | Ticket history and personal event timeline |
| **Host dashboard** | Organiser metrics, attendee management, hash-based subroutes |
| **Local-first UX** | Instant UI from browser storage — no loading spinner hell |
| **Optional cloud sync** | Supabase mirror for persistence across devices |
| **Static deployment** | GitHub Pages compatible — zero server required |

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | HTML · CSS · Vanilla JS | Zero build step, works on low-end devices |
| **Data** | `localStorage` → Supabase | Local-first, cloud is opt-in |
| **Auth** | Supabase anonymous sessions | No account friction at entry |
| **Hosting** | GitHub Pages | Free, fast, reliable static serving |
| **PWA** | Manifest + service worker | Installable, works offline |

---

## Project structure

```text
Toka_Events/
├── index.html
├── app.js
├── data.js
├── host-dashboard-controller.js    ← organiser routing via hash subroutes
├── style.css
├── supabase-config.js
├── supabase-schema.sql
├── supabase-ml-admin.sql
└── docs/
    ├── README.md          documentation index
    ├── SETUP.md           local setup and troubleshooting
    ├── ARCHITECTURE.md    frontend architecture and evolution path
    ├── SUPABASE.md        schema rollout and ownership model
    ├── GITHUB_PAGES.md    static hosting deployment checklist
    ├── SECURITY.md        key handling, RLS, response playbook
    └── ML_DATA.md         ML feature views and training data notes
```

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/MubiruEltonFelix1/toka-events.git
cd toka-events

# 2. Serve locally (VS Code Live Server or any static server)
# Open the local URL and run through the core flow:
#   → onboarding
#   → browse events
#   → register for an event
#   → check profile / tickets
#   → open host dashboard (if organiser access is enabled)
```

Detailed setup: [`docs/SETUP.md`](docs/SETUP.md)

---

## Supabase integration

Supabase is **optional**. The app runs fully offline without it.

When you do connect it:

- Use only publishable credentials in `supabase-config.js` — never service keys in the frontend
- Keep RLS enabled at all times
- Scope all rows to `owner_user_id` through anonymous auth sessions
- Run schema scripts before expecting sync behaviour

Full guide: [`docs/SUPABASE.md`](docs/SUPABASE.md)

---

## What's changed recently

- Dedicated host dashboard controller routing through hash subroutes
- Stronger owner-based Supabase row access patterns
- ML feature and training SQL views for analytics workflows
- Public event browsing cache separated from organiser private access

---

## Contributing

Practical improvements are the most welcome kind.

Good places to start:

- **UX** — registration flow clarity, host workflow improvements
- **Accessibility** — keyboard nav, screen reader support, contrast
- **Performance** — load time on low-end Android devices
- **Tests** — coverage for registration logic and ticket generation
- **Docs** — onboarding improvements, clearer setup steps

Open an issue first if you're making a significant change. No surprises.

---

## Documentation

| File | What's in it |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | Local setup and troubleshooting |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Frontend architecture and evolution path |
| [`docs/SUPABASE.md`](docs/SUPABASE.md) | Schema rollout, ownership model, operations |
| [`docs/GITHUB_PAGES.md`](docs/GITHUB_PAGES.md) | Static hosting deployment checklist |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Key handling, RLS, response playbook |
| [`docs/ML_DATA.md`](docs/ML_DATA.md) | ML feature views and training data notes |

---

<div align="center">

MIT License · Built in public by [Elton Felix](https://github.com/MubiruEltonFelix1)

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1a15,50:1a0d2e,100:0d0d14&height=100&section=footer" width="100%"/>

</div>
