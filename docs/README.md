# Documentation Index

This folder contains the technical and operational documentation for Toka Events.

The root README gives the product-level overview.
This docs folder contains implementation details, setup playbooks, and operational guidance.

## Documents

- SETUP.md: local setup, prerequisites, and troubleshooting
- ARCHITECTURE.md: current frontend architecture and refactor direction
- SUPABASE.md: Supabase setup, schema rollout, and ownership model
- GITHUB_PAGES.md: deployment checklist for static hosting
- SECURITY.md: key handling, RLS policy principles, and incident response
- ML_DATA.md: ML feature views, labels, splits, and data quality checks

## Maintenance rule

When product behavior changes, update docs in this order:

1. Relevant detailed doc in this folder.
2. Root README summary section if user-facing behavior changed.
3. SQL guides when schema, policies, or ML views change.