---
number: 011
title: Add Supabase client, session backend, and DB migration
status: open
labels: [ready-for-agent]
---

## Parent

- Plan: `.kilo/plans/supabase-migration.md`

## What to build

Install `@supabase/supabase-js`, create a Supabase server client utility, implement the `SupabaseSessionBackend` against the `StorageBackend` interface (from #009), and write the database migration SQL so sessions can be stored in PostgreSQL instead of the filesystem.

The `SupabaseSessionBackend` must:
- Map between the Session type's camelCase fields and the database's snake_case columns.
- Handle `INSERT`, `SELECT`, and `UPDATE` operations using the Supabase JS client with the service role key.
- Throw the same "Session not found" error as the file backend for missing sessions.

The database migration must create a single `sessions` table with TEXT primary key, JSONB columns for nested structures (`chat_history`, `structured_brief`, `coverage`, etc.), TEXT columns for scalar values, and appropriate defaults. Include indexes on `project_id` and `updated_at`, and an RLS policy granting full access to the service role.

## Acceptance criteria

- [ ] `@supabase/supabase-js` is added to `package.json` dependencies.
- [ ] `lib/supabase/client.ts` exports a Supabase server client (using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`) and typed helpers for session CRUD.
- [ ] `lib/session/supabase-backend.ts` implements `StorageBackend` — `createSession` inserts, `getSession` selects, `updateSession` updates.
- [ ] `supabase/migrations/001_create_sessions.sql` creates the `sessions` table with correct columns, defaults, indexes, and RLS policy.
- [ ] With `STORAGE_BACKEND=supabase` and valid Supabase credentials, a session can be created, read, and updated end-to-end (manual verification or integration test).
- [ ] Existing file-backend tests still pass (`STORAGE_BACKEND=file`).

## Blocked by

- #009 — needs the `StorageBackend` interface and factory to exist
