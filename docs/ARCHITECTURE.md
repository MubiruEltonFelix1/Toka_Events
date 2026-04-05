# Architecture Notes

## Purpose

This file explains system structure and major technical decisions.

## Current Snapshot

Current app architecture:

1. Frontend: HTML, CSS, vanilla JavaScript.
2. UI logic and state: [app.js](../app.js).
3. Data and sync helpers: [data.js](../data.js).
4. Persistence model:
	1. local storage for fast client experience
	2. Supabase sync for cloud persistence

## What Is Strong

1. Clear MVP core journey: discover, register, confirm, tickets.
2. Good visual consistency and mobile-first approach.
3. Feature breadth sufficient for early user validation.
4. Data helpers are separated from screen rendering logic.

## Key Limits

1. Large app.js file has many responsibilities.
2. Validation and analytics instrumentation still basic.
3. Automated test coverage is not yet in place.
4. Accessibility has not had a full audit pass.

## Recommended Evolution Path

### Immediate

1. Tighten form validations and edge-case handling.
2. Add key funnel analytics events.
3. Keep backend data contract documented and stable.

### Near-Term

1. Split frontend into modules:
	1. state
	2. renderers
	3. services
	4. feature modules
2. Add baseline unit and integration tests.
3. Do accessibility and performance passes.

### Later

1. Move full trust-critical flows backend-side.
2. Add server-side ticket verification and fraud controls.
3. Expand organizer analytics and community features.

## Status

Living architecture notes.
