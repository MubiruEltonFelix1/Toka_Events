# Toka Events Admin Dashboard Rollout To-Do

## Objective
Ship an Admin Dashboard safely and quickly so application managers can:
- Flag legitimate vs illegitimate events
- Moderate, hide, suspend, or remove events
- Handle reports and disputes
- Enforce trust and policy with a full audit trail

## Rollout Principles
- Start read-only first, then add low-risk actions, then enforce hard actions.
- Keep organiser flow independent from admin flow.
- Every admin action must be server-authorized and logged.
- Prefer reversible actions before destructive actions.

## Phase 0: Alignment and Scope Lock (1-2 days)

- [ ] Define moderation policy and decision reasons
  - [ ] Legitimate event criteria (identity, venue clarity, realistic details)
  - [ ] Illegitimate event criteria (fraud signals, impersonation, spam)
  - [ ] Standard reason codes (spam, unsafe, duplicate, scam, policy violation)

- [ ] Define admin roles and permissions
  - [ ] `super_admin`
  - [ ] `moderator`
  - [ ] `support_admin`
  - [ ] `analyst_read_only`

- [ ] Define event status model
  - [ ] `pending_review`
  - [ ] `approved`
  - [ ] `verified`
  - [ ] `needs_changes`
  - [ ] `hidden`
  - [ ] `suspended`
  - [ ] `removed`
  - [ ] `archived`

- [ ] Define success metrics and SLOs
  - [ ] Median review time target
  - [ ] Abuse removal time target
  - [ ] False-positive moderation rate target

## Phase 1: Data + Security Foundation (2-4 days)

- [ ] Add moderation data model
  - [ ] `admin_users` (or role mapping)
  - [ ] `event_reports`
  - [ ] `moderation_actions`
  - [ ] `event_status_history`
  - [ ] `organiser_flags` (optional)

- [ ] Add strict server-side authorization
  - [ ] Role checks on every admin endpoint
  - [ ] Ensure frontend role checks are not the only control

- [ ] Add immutable audit logging
  - [ ] Who acted, when, what changed, reason, previous state, next state
  - [ ] Correlation ID for debugging

- [ ] Add safeguards
  - [ ] Soft-delete/hide default before hard delete
  - [ ] Confirmation prompts and required reason for enforcement actions

### Exit Criteria
- [ ] Unauthorized users cannot call admin actions
- [ ] All admin actions create audit records
- [ ] Event status transitions are validated

## Phase 2: Read-Only Admin Console (Fast MVP UI) (2-3 days)

- [ ] Build admin shell (separate route/screen)
  - [ ] Overview KPIs
  - [ ] Moderation queue list
  - [ ] Event detail review drawer/page

- [ ] Add filters and search
  - [ ] Status, category, date, organiser, report count
  - [ ] Quick high-risk filter (reported > N)

- [ ] Add reports inbox (read-only first)
  - [ ] Group reports by event
  - [ ] Show severity and recency

### Exit Criteria
- [ ] Managers can see all pending/reported events quickly
- [ ] No write actions yet (safe observation stage)

## Phase 3: Low-Risk Moderation Actions (2-4 days)

- [ ] Enable non-destructive actions
  - [ ] Mark `approved`
  - [ ] Mark `verified`
  - [ ] Mark `needs_changes`
  - [ ] Mark `hidden`

- [ ] Notify organiser on status updates
  - [ ] Message template with reason and next steps

- [ ] Add notes for internal collaboration
  - [ ] Private moderation notes (not user-facing)

### Exit Criteria
- [ ] Actions are reversible
- [ ] Organisers receive clear decision feedback
- [ ] Audit log coverage is 100% for these actions

## Phase 4: Enforcement and Risk Controls (3-5 days)

- [ ] Enable high-impact actions
  - [ ] Suspend organiser
  - [ ] Remove event (hard action)
  - [ ] Reinstate event/organiser

- [ ] Add dual-control for destructive actions (recommended)
  - [ ] Require second approver for `removed` in production

- [ ] Add abuse/risk automations
  - [ ] Auto-flag duplicate event text patterns
  - [ ] Auto-flag rapid multi-event spam from one organiser
  - [ ] Auto-flag repeated report spikes

### Exit Criteria
- [ ] High-risk actions require stronger checks
- [ ] No direct permanent delete without policy path

## Phase 5: Operations Hardening (2-3 days)

- [ ] Add dashboards and alerts
  - [ ] Queue backlog alerts
  - [ ] SLA breach alerts
  - [ ] Suspicious activity alerts

- [ ] Add review QA cadence
  - [ ] Weekly random audit of moderation decisions
  - [ ] False-positive review and policy tuning

- [ ] Add incident playbook
  - [ ] Fraud wave response
  - [ ] Compromised organiser response
  - [ ] Legal/compliance escalation flow

### Exit Criteria
- [ ] Team can operate dashboard reliably under load
- [ ] Playbooks exist for top moderation incidents

## Fast Launch Path (Recommended)

- [ ] Week 1: Phase 0 + Phase 1 + Phase 2
- [ ] Week 2: Phase 3
- [ ] Week 3: Phase 4 (limited release to super admins)
- [ ] Week 4: Phase 5 + full rollout

## Release Strategy

- [ ] Internal alpha (admin team only)
- [ ] Beta with action limits (no hard delete)
- [ ] Production rollout with role restrictions
- [ ] Post-launch review after 7 days and 30 days

## Go/No-Go Checklist

- [ ] Admin auth + role checks validated
- [ ] Audit logs validated end-to-end
- [ ] Reversible actions tested
- [ ] Organiser notification templates approved
- [ ] Incident response contact list finalized
- [ ] Monitoring and alerts active

## Risk Register (Track Weekly)

- [ ] False positives harming legitimate organisers
- [ ] Moderator inconsistency in decisions
- [ ] Missing audit logs for edge-case actions
- [ ] Role misconfiguration exposing admin actions
- [ ] Queue overload during event spikes

## Nice-to-Have (After Stabilization)

- [ ] Moderation confidence score per event
- [ ] Human-in-the-loop AI triage suggestions
- [ ] Appeal workflow portal for organisers
- [ ] Bulk moderation tools for spam campaigns
- [ ] Case management timeline per event
