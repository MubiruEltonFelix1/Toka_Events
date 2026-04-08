# GitHub Pages Deployment Guide

## Goal

Deploy the static app to GitHub Pages while keeping Supabase integration safe and stable.

## One-time deployment setup

1. Push this repository to GitHub.
2. Open repository settings.
3. Go to Pages.
4. Select Deploy from a branch.
5. Choose branch: main (or your deploy branch).
6. Choose folder: /(root).
7. Save and wait for the build.

## URL patterns

Your site will usually be available as one of these:

- https://username.github.io
- https://username.github.io/repository-name

## Supabase compatibility checklist

- supabase-config.js uses only publishable key
- Anonymous Auth provider enabled
- Site URL and redirect settings include your Pages domain
- RLS enabled for all app tables

## Static routing note

This app uses hash routes, which are safe for static hosting because route state stays client-side.

## Post-deploy validation

1. Open deployed URL in private browser window.
2. Confirm onboarding loads.
3. Confirm event list renders.
4. Confirm registration flow completes.
5. Confirm profile/tickets are visible.
6. If Supabase is enabled, verify rows are written.

## Cache refresh tips

- Hard refresh after each deployment.
- If service worker caching causes stale assets, increment asset references or update service worker versioning.

## Common issues

- Blank page after deploy:
  - Check console for missing asset paths
  - Verify files are in selected branch/folder
- App runs but no cloud sync:
  - Re-check supabase-config.js
  - Verify schema and auth settings
- Permission denied from Supabase:
  - Inspect RLS policies and owner_user_id mapping