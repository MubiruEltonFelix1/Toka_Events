# Setup Guide

## Purpose

This file holds local setup instructions and environment preparation steps.

## Local Frontend Setup

1. Clone the repository.
2. Open the project in VS Code.
3. Run from a local server (for example, Live Server extension).
4. Open the served URL in your browser.

## Environment and Keys

1. Keep browser-safe keys in [supabase-config.js](../supabase-config.js).
2. Never place secret keys in frontend files.
3. Rotate keys immediately if exposed.

## Backend Transition Plan

When moving from MVP frontend-only architecture:

1. Create FastAPI project structure.
2. Add environment configuration and CORS.
3. Define core tables and API contract:
	1. users
	2. events
	3. registrations
	4. payments
	5. tickets
	6. referrals
4. Connect frontend registration and ticket flow to backend APIs.

## Common Startup Troubleshooting

1. If Supabase does not sync, check URL and publishable key in [supabase-config.js](../supabase-config.js).
2. If writes fail under RLS, confirm Anonymous Auth provider is enabled.
3. If data appears missing, refresh and verify table filters in Supabase dashboard.

## Status

Active working guide.
