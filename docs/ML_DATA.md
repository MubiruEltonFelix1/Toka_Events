# ML Data and Training Notes

## Goal

Document the data contract used for event analytics and ML experimentation.

## Source SQL assets

- supabase-schema.sql: base ML feature and training views
- supabase-ml-admin.sql: admin helpers for training splits and checks

## Primary views

- toka_ml_event_features
- toka_ml_training_rows

These views should remain stable enough for repeatable model pipelines.

## Feature categories

- Event metadata: category, event_type, delivery_mode
- Time/location: starts_at, city
- Commercial signals: price_amount, capacity
- Engagement signals: impressions, comment_count, avg_likes_per_comment
- Outcome signals: ticket_count, ticket_sales_count, ticket_revenue_total

## Labeling

Current training label: sales_band

- high: ticket_sales_count >= 10
- medium: 3 to 9
- low: < 3

## Split strategy

Deterministic split using admin helpers:

- train: 80%
- validation: 10%
- test: 10%

Use deterministic logic to avoid random reshuffle across runs.

## Quality checks

Use quality check views/scripts to flag:

- missing category
- missing starts_at
- missing city
- missing price_amount
- invalid capacity

## Snapshotting

Recommended for reproducibility:

- Persist dated snapshots of training-ready rows.
- Keep snapshot process consistent across experiments.

## Practical workflow

1. Refresh source event/ticket metrics.
2. Recompute feature/training views.
3. Run quality checks.
4. Materialize snapshot.
5. Train/evaluate with deterministic split.
6. Log model metadata and source snapshot reference.