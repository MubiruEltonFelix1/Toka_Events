# Architecture Notes

## Goal

Describe the current system layout and the practical evolution path.

## Current architecture

The application is a static, client-rendered web app.

- index.html contains screen shells and static structure.
- app.js contains route handling, rendering orchestration, and core UI flow logic.
- host-dashboard-controller.js isolates host dashboard route/controller behavior.
- data.js manages local state persistence and optional Supabase synchronization.
- style.css defines visual system and responsive behavior.

## Routing model

- Hash-based navigation for static hosting compatibility.
- Host routes live under #/host/*.
- Profile and host tools are connected through organizer access paths.

## Data model strategy

- localStorage-first for fast perceived performance.
- Supabase mirror for persistence and cross-session continuity.
- owner_user_id ownership model for secure multi-user row isolation.

## Strengths

- Minimal runtime complexity (no build step required).
- Fast startup and lightweight deployment.
- Clear separation between host dashboard controller and main UI flow.
- Static hosting friendly.

## Known limits

- app.js still carries broad responsibilities.
- Limited automated test coverage.
- Accessibility and observability need deeper passes.
- Client-side trust boundaries remain for some workflows.

## Recommended evolution

### Short term

- Continue extracting feature-specific modules from app.js.
- Add stronger validation around registration/hosting forms.
- Add structured analytics events for funnel visibility.

### Mid term

- Introduce test baseline (unit + integration smoke checks).
- Improve offline/cache behavior with explicit update strategy.
- Add accessibility pass across core user journeys.

### Long term

- Move trust-critical actions to backend APIs.
- Add server-side ticket verification endpoints.
- Expand organizer analytics and community features with stronger data contracts.