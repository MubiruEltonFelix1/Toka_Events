# Toka Events 30/60/90-Day Roadmap

## Objective
Ship the next stage of Toka with maximum impact and minimum risk, focused on trust, payments, ticket validity, and production reliability.

## Prioritization Method
- Impact first: does this directly increase trust, revenue, or reliability?
- Effort aware: can we realistically ship this in the window?
- Risk controlled: security and payment correctness before growth features.

## Day 0-30: Foundation + Trust (Highest Priority)

### Goals
- Make ticketing/payment flows trustworthy
- Lock down critical security paths
- Prepare for safe scaling

### Must Ship
- [ ] Real payment integration (replace simulation)
  - [ ] Initialize payment through backend endpoint
  - [ ] Verify callback/webhook before confirming ticket as paid
  - [ ] Handle pending, failed, success states clearly in UI

- [ ] Server-side authority for critical actions
  - [ ] Ticket status validated on backend
  - [ ] Role-based access enforcement for organiser/admin actions
  - [ ] Remove any client-only trust assumptions for sensitive logic

- [ ] Ticket verification MVP
  - [ ] QR check endpoint
  - [ ] Basic organiser check-in flow (validate once, prevent duplicate check-in)

- [ ] Event lifecycle controls
  - [ ] Draft -> Live -> Ended -> Archived states
  - [ ] Prevent ticket sales for ended events at backend level

- [ ] Observability baseline
  - [ ] Structured backend logs
  - [ ] Error tracking
  - [ ] Payment and ticket verification monitoring

### Exit Criteria (Day 30)
- [ ] No ticket is marked valid without verified payment (for paid events)
- [ ] Critical admin/organiser actions are protected server-side
- [ ] QR validation works in real check-in conditions
- [ ] Core event states are enforceable in backend and visible in UI

## Day 31-60: Operations + Moderation + Reliability

### Goals
- Improve operational control and abuse resistance
- Stabilize release process
- Reduce production incidents

### Must Ship
- [ ] Admin dashboard MVP (moderation-first)
  - [ ] Queue for pending/reported events
  - [ ] Mark legit/illegitimate with reason codes
  - [ ] Hide/suspend/remove actions with audit logging

- [ ] Audit + compliance controls
  - [ ] Immutable moderation/action history
  - [ ] Role-based admin permissions (`super_admin`, `moderator`, etc.)
  - [ ] Organiser notification on moderation decisions

- [ ] CI/CD hardening
  - [ ] PR checks (lint/test/build)
  - [ ] Staging environment with production-like config
  - [ ] Rollback plan documented and tested

- [ ] Data and migration discipline
  - [ ] Migration scripts for schema changes
  - [ ] Backfill strategy for new columns/statuses
  - [ ] Seed/fixture strategy for test environments

### Exit Criteria (Day 60)
- [ ] Moderation can be performed without direct DB edits
- [ ] Every enforcement action has actor, timestamp, reason, and state change
- [ ] Team can test in staging before production release
- [ ] Rollback path is proven at least once

## Day 61-90: Growth Features + Product Maturity

### Goals
- Improve attendee and organiser retention
- Increase conversion while keeping trust high
- Build decision-making analytics

### Must Ship
- [ ] Growth analytics
  - [ ] Funnel: impression -> detail -> registration -> paid -> attended
  - [ ] Organiser dashboard metrics tied to conversion and attendance
  - [ ] Weekly product KPI report

- [ ] Engagement features
  - [ ] Event reminders (pre-event/day-of)
  - [ ] Better post-event feedback/memory prompts
  - [ ] Smarter discover ranking (signals + recency + quality)

- [ ] Trust enhancements
  - [ ] Organiser verification badges
  - [ ] Duplicate/fraud event heuristics
  - [ ] Dispute/refund handling workflow

- [ ] Documentation + operations readiness
  - [ ] Runbooks for payments, moderation incidents, deployment incidents
  - [ ] Onboarding guide for managers/moderators
  - [ ] Security review checklist per release

### Exit Criteria (Day 90)
- [ ] Product team can explain key conversion drop-offs from analytics
- [ ] Organisers receive actionable insights, not just vanity metrics
- [ ] Trust signals and fraud checks are visible and effective
- [ ] Operational playbooks are complete and in use

## Weekly Execution Rhythm (Recommended)
- [ ] Monday: planning and dependency unblock
- [ ] Wednesday: integration checkpoint + risk review
- [ ] Friday: demo + production readiness review
- [ ] End of week: metrics snapshot and next-week re-prioritization

## Risk Register (Track Weekly)
- [ ] Payment callback edge cases causing false confirmations
- [ ] Role misconfiguration exposing privileged endpoints
- [ ] Check-in race conditions (duplicate scans)
- [ ] Moderation false positives hurting legitimate organisers
- [ ] Breaking deploys due to schema drift

## What We Intentionally Defer Until After Day 90
- [ ] Multi-language full localization rollout
- [ ] Native mobile apps
- [ ] Advanced AI recommendation stack
- [ ] Multi-country payment expansion beyond first live rails

## Fast Summary
- Day 0-30: Trust and correctness
- Day 31-60: Control and reliability
- Day 61-90: Retention and growth
