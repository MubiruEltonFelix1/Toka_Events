# ML Data and Training Notes

## Purpose

This file documents data contracts for model training and analytics workflows.

## Data Sources

1. Event features view from Supabase:
	1. toka_ml_event_features
2. Training rows view from Supabase:
	1. toka_ml_training_rows
3. Admin split and checks from [supabase-ml-admin.sql](../supabase-ml-admin.sql).

## Core Features

1. Category, event_type, delivery_mode.
2. City, starts_at, price_amount, capacity.
3. Engagement signals:
	1. impressions
	2. comment_count
	3. avg_likes_per_comment
4. Outcome signals:
	1. ticket_sales_count
	2. ticket_revenue_total
	3. ticket_count

## Labels

Current label banding is sales_band:

1. high: ticket_sales_count greater or equal to 10
2. medium: between 3 and 9
3. low: below 3

## Split Strategy

Use deterministic split from toka_ml_training_split:

1. train: 80 percent
2. validation: 10 percent
3. test: 10 percent

This avoids random reshuffling between model runs.

## Data Quality Checks

Use toka_ml_quality_checks for quick diagnostics:

1. missing category
2. missing starts_at
3. missing city
4. missing price_amount
5. invalid capacity

## Reproducible Snapshots

For reproducibility, persist daily snapshots using:

1. public.toka_ml_refresh_daily_snapshot(current_date)

This writes to partitioned table:

1. toka_ml_event_daily

## Status

Active ML data contract notes.
