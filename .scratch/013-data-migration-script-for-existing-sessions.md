---
number: 013
title: Data migration script for existing sessions
status: open
labels: [ready-for-human]
---

## Parent

- Plan: `.kilo/plans/supabase-migration.md`

## What to build

Create a runnable script (`scripts/migrate-to-supabase.ts`) that reads all JSON session files from the `sessions/` directory, maps each to the Supabase row format (camelCase fields in Session type → snake_case columns in the `sessions` table), and inserts them into the Supabase database. Handle conflicts gracefully with `ON CONFLICT` (skip existing rows) and report a summary of inserted, skipped, and failed sessions.

The mapping must handle all nested fields: `chat_history`, `structured_brief`, `coverage`, `contradictions`, `assumptions`, `open_questions`, `recap_history`, `out_of_scope_topics`, `uploaded_images`, and `fetched_websites` — all stored as JSONB in the database. Scalar fields (`session_id`, `project_id`, `status`, `brief_markdown`, `llm_reasoning`, `last_recap_turn`, `shareable_url`, `created_at`, `updated_at`) are mapped directly. The `metadata` object must be serialized to JSONB.

## Acceptance criteria

- [ ] `scripts/migrate-to-supabase.ts` reads all `.json` files from the `sessions/` directory.
- [ ] Each session is mapped from camelCase (Session type) to snake_case (database columns) correctly, including nested JSONB fields.
- [ ] The script inserts rows into the Supabase `sessions` table using the service role client.
- [ ] `ON CONFLICT (id) DO NOTHING` handles duplicate session IDs without errors.
- [ ] The script prints a summary: total files found, inserted, skipped, and failed.
- [ ] The script runs with `npx tsx scripts/migrate-to-supabase.ts` and exits with a non-zero code on critical failure.
- [ ] After running, migrated sessions are retrievable via `SupabaseSessionBackend.getSession()`.

## Blocked by

- #011 — needs the Supabase client and `sessions` table to exist
