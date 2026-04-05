# Supabase Guide

## Purpose

This file is dedicated to Supabase configuration, schema rollout, and operational checks.

## Project Setup

1. Create project in region closest to users.
2. Enable Data API.
3. Enable automatic RLS.
4. In Authentication providers, enable Anonymous Auth.

## Key Configuration

1. Use Project URL plus publishable key in [supabase-config.js](../supabase-config.js).
2. Never use secret key in browser code.

## Schema Rollout

1. Run [supabase-schema.sql](../supabase-schema.sql).
2. Optional: run [supabase-ml-admin.sql](../supabase-ml-admin.sql).

## Validation Flow

1. Complete onboarding in app.
2. Publish one event.
3. Register one ticket.
4. Add one comment or organizer update.
5. Confirm rows in:
	1. toka_profiles
	2. toka_events
	3. toka_tickets
	4. toka_event_metrics

## Operations and Maintenance

1. Rotate exposed credentials immediately.
2. Monitor table growth and index performance.
3. Keep periodic exports or backups for critical data.
4. Re-run schema scripts after controlled updates.

## Status

Active operational guide.
