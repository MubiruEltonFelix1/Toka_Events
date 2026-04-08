# Setup Guide

## Goal

Get the app running locally with optional Supabase sync enabled.

## Prerequisites

- VS Code
- A modern browser (Chrome, Edge, Firefox)
- A static file server extension or CLI server
- Optional: Supabase project for cloud sync

## Local run

1. Clone the repository.
2. Open the folder in VS Code.
3. Start a local static server from the project root.
4. Open the served URL in your browser.

## First functional check

Run through this sequence after startup:

1. Complete onboarding.
2. Browse or search events.
3. Open an event detail page.
4. Register for an event.
5. Confirm ticket appears in profile/tickets.
6. If organizer access is available, open host dashboard.

## Optional Supabase configuration

1. Create a Supabase project.
2. Run schema scripts in this order:
   - supabase-schema.sql
   - supabase-ml-admin.sql (optional, for ML/admin views)
3. Add project URL and publishable key to supabase-config.js.
4. Ensure Anonymous Auth provider is enabled.
5. Reload app and verify data sync.

## Troubleshooting

- App loads but no data sync:
  - Verify URL/key in supabase-config.js
  - Confirm schema script completed without errors
  - Confirm RLS policies are active
- Permission denied from Supabase:
  - Confirm user has an anonymous auth session
  - Confirm owner_user_id policies match auth.uid()
- Host dashboard data looks stale:
  - Reload page once to refresh local cache
  - Check if event rows exist for the current owner_user_id

## Notes

- localStorage is used for fast UX and can mask remote changes until refresh.
- Never place secret/service keys in frontend files.