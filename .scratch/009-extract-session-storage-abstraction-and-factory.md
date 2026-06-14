---
number: 009
title: Extract session storage abstraction and factory
status: open
labels: [ready-for-agent]
---

## Parent

- Plan: `.kilo/plans/supabase-migration.md`

## What to build

Define a `StorageBackend` interface (`createSession`, `getSession`, `updateSession`), extract the current `fs`-based logic from `SessionStore` into a `FileSessionBackend` that implements the interface, then rewrite `SessionStore` as a factory that picks the correct backend based on the `STORAGE_BACKEND` environment variable (defaulting to `"file"`).

This is a pure internal refactor — no behavioral change, no new dependencies. All existing API routes call `new SessionStore()` as before and the factory returns `FileSessionBackend` by default. All 14 existing tests must continue to pass.

Also set `STORAGE_BACKEND=file` in `vitest.config.ts` so tests explicitly target the file backend regardless of the host environment.

## Acceptance criteria

- [ ] `StorageBackend` interface exists in `lib/session/backend.ts` with `createSession`, `getSession`, `updateSession` signatures.
- [ ] `FileSessionBackend` in the same file contains the existing `fs` logic (ensure-directory, read/write JSON, Zod validation).
- [ ] `SessionStore` in `lib/session/store.ts` is rewritten as a factory: reads `STORAGE_BACKEND` env, returns `FileSessionBackend` (and throws a clear error for unknown values).
- [ ] Public API of `SessionStore` (`createSession`, `createSeededSession`, `getSession`, `updateSession`) is unchanged — all 5 API route files compile without modification.
- [ ] `vitest.config.ts` has `STORAGE_BACKEND=file` in the test env definition.
- [ ] All 14 existing tests pass (`npx vitest run`).

## Blocked by

None — can start immediately.
