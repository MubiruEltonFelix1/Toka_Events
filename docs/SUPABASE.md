# Supabase Guide

## Goal

Configure Supabase as the optional cloud sync and analytics backend for this frontend-first app.

## Integration model

- UI remains local-first for speed.
- Supabase mirrors key entities for persistence and analytics.
- Access is controlled with anonymous auth sessions plus owner_user_id RLS rules.

## Required setup

1. Create a Supabase project near your target users.
2. Enable Anonymous Auth provider.
3. Confirm Row Level Security is enabled for app tables.
4. Run SQL scripts:
   - supabase-schema.sql
   - supabase-ml-admin.sql (optional)

## Frontend configuration

Update supabase-config.js with:

- Project URL
- Publishable (anon/public) key

Do not place service role or secret keys in frontend code.

## Data ownership model

- Each row stores owner_user_id.
- Policies scope reads and writes to auth.uid().
- Public browsing paths can use dedicated public-read tables/views where needed.

## Typical sync scope

The app can mirror data such as:

- profiles
- events
- tickets
- comments
- organizer updates
- calendar entries
- event metrics

Exact mirrored fields are defined by current app/data layer implementation.

## Validation checklist

1. Open app and complete onboarding.
2. Create or update profile details.
3. Publish a host event.
4. Register for an event.
5. Add a comment or organizer update.
6. Confirm expected rows in Supabase tables/views.

## Troubleshooting

- Anonymous sign-in fails:
  - Verify provider is enabled
  - Check auth settings and site URL
- RLS policy errors:
  - Confirm owner_user_id is populated
  - Confirm policy predicates use auth.uid()
- Data appears only locally:
  - Check browser console for Supabase errors
  - Verify config values and schema deployment

## Operational recommendations

- Rotate exposed publishable keys if misuse is detected.
- Periodically review RLS policies and indexes.
- Snapshot critical tables before major schema changes.
- Keep schema files in repo as source of truth.