# Security and Access Policies

## Purpose

This file captures authentication, authorization, and data access rules.

## Current Security Model

1. Frontend uses Supabase publishable key only.
2. Client signs in anonymously via Supabase Auth.
3. Data rows are scoped by owner_user_id with authenticated RLS policies.

## RLS Policy Principle

All app tables use owner-based access:

1. Read allowed only when owner_user_id equals auth.uid().
2. Write allowed only when owner_user_id equals auth.uid().

## Key Handling Rules

1. Publishable key can be in frontend config.
2. Secret keys must never be stored in frontend files.
3. If a secret key is exposed, rotate immediately.

## Incident Response Checklist

1. Rotate affected credentials.
2. Review recent API activity and table writes.
3. Revoke risky sessions if needed.
4. Confirm RLS policies are active on all public tables.
5. Verify no open allow-all policies remain.

## Production Hardening Checklist

1. Enforce HTTPS only.
2. Add request rate limiting at API layer when backend is introduced.
3. Keep backups enabled and tested.
4. Add monitoring for auth and write anomalies.

## Status

Active security baseline.
