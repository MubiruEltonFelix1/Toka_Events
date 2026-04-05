# GitHub Pages Deployment Guide

## Goal

Host the frontend on GitHub Pages while keeping Supabase connection stable and secure.

## Quick Publish Steps

1. Push this project to a GitHub repository.
2. In repository settings, open Pages.
3. Source:
   1. Deploy from branch
   2. Branch: main
   3. Folder: root
4. Save and wait for deployment URL.

## Frontend and Supabase Tips

1. Use only publishable key in [supabase-config.js](../supabase-config.js).
2. Never expose secret keys in frontend code.
3. Keep RLS enabled on all public tables.
4. Ensure Anonymous Auth provider is enabled if app signs in anonymously.

## CORS and Allowed Origins

1. In Supabase auth settings, add your GitHub Pages domain as an allowed site URL.
2. Add both forms if needed:
   1. https://username.github.io
   2. https://username.github.io/repository-name

## Routing Tips for Static Hosting

1. This app uses hash routes, which work well on GitHub Pages.
2. Keep links and asset paths relative unless intentionally absolute.

## Cache and Update Tips

1. After deploy, force refresh with Ctrl+F5.
2. If config changes are not visible, version bump script references or clear browser cache.

## Verification Checklist

1. App loads from GitHub Pages URL.
2. Onboarding works.
3. Event publish works.
4. Ticket registration works.
5. Supabase tables receive new rows.

## Troubleshooting

1. If app loads but no sync occurs:
   1. confirm URL and publishable key values
   2. confirm schema scripts ran successfully
   3. confirm Anonymous Auth provider is enabled
2. If you see permission errors:
   1. verify owner-based RLS policies exist
   2. verify session exists in Supabase Auth logs
