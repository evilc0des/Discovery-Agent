---
number: 010
title: Update deployment configuration and docs for Supabase
status: open
labels: [ready-for-agent]
---

## Parent

- Plan: `.kilo/plans/supabase-migration.md`

## What to build

Add the four new Supabase environment variables to `DEPLOYMENT.md` and `docker-compose.yml` so operators know how to configure the Supabase backend when it is ready. No code changes — purely configuration and documentation.

The vars to document are: `STORAGE_BACKEND`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`. In `docker-compose.yml` they should be added as commented-out optional entries so they are visible but don't break existing setups that use the default `file` backend.

## Acceptance criteria

- [ ] `DEPLOYMENT.md` env var table includes `STORAGE_BACKEND | No | file | file or supabase`.
- [ ] `DEPLOYMENT.md` env var table includes `SUPABASE_URL | If supabase | — | Supabase project URL`.
- [ ] `DEPLOYMENT.md` env var table includes `SUPABASE_SERVICE_ROLE_KEY | If supabase | — | Supabase service role key`.
- [ ] `DEPLOYMENT.md` env var table includes `SUPABASE_STORAGE_BUCKET | No | client-uploads | Supabase storage bucket name`.
- [ ] `docker-compose.yml` has the four new env vars listed in the `environment` block, commented out with a note that they are only needed for the Supabase backend.
- [ ] `docker compose config` parses without errors.

## Blocked by

None — can start immediately.
