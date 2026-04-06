# Toka Supabase Schema - Full System Guide

## 1. Why this schema exists
I designed this schema to do two things at the same time:

1. Keep the app simple and backward-compatible by storing raw payload JSON from the frontend.
2. Expose typed SQL columns that are clean for analytics, dashboards, and future ML workflows.

This means frontend engineers can continue shipping features quickly with JSON payloads, while data/ML engineers can query structured columns without parsing JSON every time.

## 2. Core design pattern
Every main table has:

1. Identity columns (`device_id`, table key fields, `owner_user_id`).
2. `payload jsonb` as source-of-truth compatibility envelope.
3. Typed feature columns (for BI, ML, and reporting).
4. `updated_at` for sync consistency and recency logic.

Typed columns are auto-populated by trigger functions (`toka_sync_*_columns`) before insert/update.

## 3. Security model
### 3.1 Row ownership
Rows are ownership-scoped with `owner_user_id`.

1. `toka_assign_owner_user_id()` sets `owner_user_id = auth.uid()` on insert when missing.
2. RLS policies enforce owner-only read/write on personal tables.
3. Events have an extra authenticated-read policy for discovery use cases.

### 3.2 RLS status
RLS is enabled on:

1. `toka_profiles`
2. `toka_events`
3. `toka_tickets`
4. `toka_comments`
5. `toka_updates`
6. `toka_calendar_entries`
7. `toka_event_metrics`

## 4. Table-by-table breakdown
## 4.1 `public.toka_profiles`
### Purpose
Stores user profile and onboarding state.

### Key fields
1. `device_id` (PK)
2. `owner_user_id` (auth owner)
3. `onboarding_complete`
4. `referral_code`
5. `payload`

### Typed profile fields
1. `name`
2. `gender`
3. `phone`
4. `phone_country_code`
5. `phone_national_number`
6. `email`
7. `language`
8. `notifications_enabled`
9. `interests text[]`

### Why this matters for ML
This captures demographic and preference features for personalization and audience modeling.

## 4.2 `public.toka_events`
### Purpose
Stores hosted events and event metadata.

### Key fields
1. `(device_id, id)` composite PK
2. `owner_user_id`
3. `payload`

### Typed event fields
1. `event_name`, `category`, `event_type`, `delivery_mode`
2. `city`, `country`, `venue`, `organiser`
3. `starts_at`, `ends_at`
4. `price_amount`, `currency`, `capacity`
5. `inventory_reserve_percent`
6. `ticket_tiers jsonb`
7. `is_placeholder`
8. `language`, `tags`, `metadata`

### Why this matters for ML
Event-level features are the backbone for forecasting attendance, conversion, and revenue.

## 4.3 `public.toka_tickets`
### Purpose
Stores registrations/tickets and payment/refund metadata.

### Key fields
1. `(device_id, id)` composite PK
2. `owner_user_id`
3. `event_id`
4. `payload`

### Typed attendee and commerce fields
1. `attendee_name`
2. `attendee_gender`
3. `attendee_phone`
4. `attendee_phone_country_code`
5. `attendee_phone_national_number`
6. `attendee_email`
7. `amount_paid`
8. `payment_method`
9. `purchased_at`
10. `referral_code_used`

### Typed refund fields
1. `refund_amount`
2. `refund_status`
3. `refund_reason`
4. `refund_requested_at`
5. `refund_resolved_at`

### Why this matters for ML
This table powers audience segmentation, LTV-style features, refund behavior analysis, and campaign modeling.

## 4.4 `public.toka_comments`
### Purpose
Event social feedback stream.

### Typed fields
1. `author`
2. `text_body`
3. `likes_count`
4. `commented_at`

### ML relevance
Natural language and engagement signals for sentiment/features later.

## 4.5 `public.toka_updates`
### Purpose
Organizer event updates/announcements.

### Typed fields
1. `update_type`
2. `text_body`
3. `posted_at`

### ML relevance
Can support churn prevention and communication effectiveness modeling.

## 4.6 `public.toka_calendar_entries`
### Purpose
Tracks save-to-calendar actions.

### Typed fields
1. `saved_at`
2. `with_ticket`

### ML relevance
Intent signal before purchase and post-purchase behavior.

## 4.7 `public.toka_event_metrics`
### Purpose
Stores event-level behavioral aggregates.

### Typed fields
1. `impressions`
2. `ticket_sales_count`
3. `ticket_revenue_total`
4. `calendar_adds_with_ticket`
5. `calendar_adds_without_ticket`

### ML relevance
Core label and performance indicators for supervised learning tasks.

## 5. Trigger pipeline (critical)
### 5.1 Pattern
Each table has `before insert or update` sync trigger:

1. Read from `payload jsonb`.
2. Coalesce into typed columns.
3. Keep schema resilient when payload evolves.

### 5.2 Important examples
1. Profile trigger maps `gender`, normalized phone fields, interests.
2. Event trigger maps ticketing config and `is_placeholder`.
3. Ticket trigger maps app payload keys (`fullName`, phone parts, refund fields).

## 6. Helper functions
1. `toka_try_timestamptz(text)`:
   Parses ISO text, unix seconds, unix milliseconds safely.
2. `toka_parse_event_start(payload)` and `toka_parse_event_end(payload)`:
   Build event timestamps from date/time payload combinations.

These keep ingestion robust when frontend date formats vary.

## 7. Views for analytics and ML
## 7.1 `public.toka_ml_event_features`
Feature-level view for event modeling.

Includes:
1. Event descriptors.
2. Time-derived features (`start_day_of_week`, `start_hour`).
3. Revenue and engagement metrics.
4. `had_sales` label.
5. `is_placeholder` visibility and placeholder filtering.

Current filter excludes placeholder events:
`where coalesce(e.is_placeholder, false) = false`

## 7.2 `public.toka_ml_training_rows`
Training-oriented rowset with joined aggregates.

Includes:
1. Event features.
2. Performance labels (`sales_band`).
3. Comments aggregates.
4. Ticket aggregates.
5. Audience-gender aggregates:
   `female_attendee_count`, `male_attendee_count`, `unknown_attendee_count`.

Also excludes placeholders using the same filter.

## 8. Index strategy
Current indexes prioritize:

1. Event lookups (`device_id`, `event_id`, `category`, `starts_at`).
2. Ownership filtering (`owner_user_id` across core tables).
3. JSON/tag search (`GIN` indexes).
4. Refund queue performance (`owner_user_id, refund_status`).
5. Demographic analytics (`attendee_gender`, `profiles.gender`, `profiles.phone`).
6. Placeholder-aware event filtering (`owner_user_id, is_placeholder`).

## 9. Frontend contract assumptions
### 9.1 Signup payload (profile)
Expected keys:
1. `name`
2. `gender`
3. `phone` (E.164)
4. `phoneCountryCode`
5. `phoneNationalNumber`
6. `email`

### 9.2 Ticket payload (registration)
Expected keys:
1. `fullName`
2. `gender`
3. `phone`
4. `phoneCountryCode`
5. `phoneNationalNumber`
6. `refundStatus`, `refundReason`, timestamps when applicable

### 9.3 Event payload (hosting)
Expected keys:
1. Standard event fields
2. `metadata.ticketing` object with reserve/tiers
3. `isPlaceholder` boolean when event is synthetic

## 10. Placeholder-event handling
The app now removes placeholder/mock events from production dashboards by default.

Schema support (`is_placeholder`) ensures we can:
1. Keep synthetic data for testing when needed.
2. Exclude synthetic rows from production analytics and ML views.

## 11. Migration and rollout checklist
1. Run `supabase-schema.sql` in Supabase SQL Editor.
2. Verify triggers exist for all `toka_sync_*` functions.
3. Verify RLS policies were created and no old anon policies remain.
4. Confirm app writes include new profile/ticket payload fields.
5. Confirm ML views return only non-placeholder events.

## 12. Future ML capability roadmap enabled by this schema
### 12.1 Near-term
1. Conversion prediction by event category/city/timing.
2. Demand forecasting and inventory reserve recommendations.
3. Audience segmentation and retention prediction.
4. Refund propensity scoring.

### 12.2 Mid-term
1. Dynamic pricing recommendations by segment and event type.
2. Personalized notification timing based on behavior.
3. Event similarity embeddings from metadata + outcomes.

### 12.3 Data quality guardrails to add next
1. SQL `check` constraints for valid gender values and phone pattern.
2. Materialized feature tables for stable model-training snapshots.
3. Label-generation jobs with explicit train/validation time windows.

## 13. What another developer should remember first
1. Payload JSON is for compatibility and speed.
2. Typed columns are the analytic truth layer.
3. Triggers are mandatory - if they break, downstream analytics degrade.
4. RLS is owner-centric and should stay strict.
5. Placeholder rows must remain excluded from production analytics.
