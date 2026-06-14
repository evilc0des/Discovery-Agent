---
number: 012
title: Refactor image storage to abstraction layer
status: open
labels: [ready-for-agent]
---

## Parent

- Plan: `.kilo/plans/supabase-migration.md`

## What to build

Define an `ImageStorage` interface for uploading images, wrap the current `lib/files.ts` disk-based logic in a `FileImageStorage` implementation, create a `SupabaseImageStorage` that uploads to a Supabase Storage bucket (`client-uploads`, path `{sessionId}/{filename}`), and update the chat API route to use the abstracted storage instead of calling `storeImage()` directly.

Both implementations must return the same metadata shape (`id`, `originalName`, `storedPath`, `mimeType`, `uploadedAt`) so the session schema and UI continue to work unchanged. The `storedPath` for Supabase-backed images should be the storage bucket path or a signed URL, not a local filesystem path.

## Acceptance criteria

- [ ] `lib/storage/image-storage.ts` defines the `ImageStorage` interface with a `storeImage` method (same signature as the existing `storeImage` in `lib/files.ts`).
- [ ] `FileImageStorage` implements `ImageStorage` by delegating to the existing `storeImage` in `lib/files.ts`.
- [ ] `SupabaseImageStorage` implements `ImageStorage` via Supabase Storage bucket upload, returning the expected metadata shape.
- [ ] `app/api/session/[id]/chat/route.ts` uses the abstracted image storage (picked by `STORAGE_BACKEND` env) instead of importing `storeImage` directly.
- [ ] Existing image upload tests pass with `STORAGE_BACKEND=file`.
- [ ] With `STORAGE_BACKEND=supabase`, an image upload stores to the Supabase bucket and the session record contains the storage reference.

## Blocked by

- #009 — needs the factory pattern to pick the storage backend
