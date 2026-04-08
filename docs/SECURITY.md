# Security and Access Policies

## Goal

Define baseline security controls for the current frontend + Supabase architecture.

## Core principles

- Least privilege by default.
- No secret keys in frontend code.
- Row-level ownership controls for all user-scoped data.
- Fast credential rotation and audit on exposure.

## Authentication and identity

- Supabase anonymous auth is used for lightweight identity.
- auth.uid() is the primary user identity for policy decisions.

## Authorization model

- Tables with user-owned data include owner_user_id.
- RLS policies should enforce:
  - read only when owner_user_id = auth.uid()
  - write only when owner_user_id = auth.uid()
- Public browsing data should be separated from owner-only host data when needed.

## Key handling policy

Allowed in frontend:

- Project URL
- Publishable anon key

Never in frontend:

- Service role key
- Database password
- Any long-lived privileged token

## Operational checklist

- Confirm RLS enabled on every public schema app table.
- Verify no broad allow-all policies exist.
- Review auth logs for unusual anonymous session spikes.
- Audit owner_user_id population on newly inserted rows.

## Incident response

If credentials or data access is suspected compromised:

1. Rotate affected keys immediately.
2. Review recent API/auth activity.
3. Disable risky integrations temporarily.
4. Tighten or patch RLS policies.
5. Validate with fresh anonymous session tests.
6. Document root cause and prevention action.

## Hardening roadmap

- Add backend API layer for trust-critical operations.
- Add server-side verification for ticket validation workflows.
- Introduce rate limiting and abuse detection.
- Add periodic security review checklist to release process.