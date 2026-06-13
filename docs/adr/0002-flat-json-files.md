# ADR 0002: Flat JSON Files for Session Persistence

## Status

Accepted

## Context

The structured state of each session is a deeply nested JSON object (the discovery brief and turn history). The PRD does not require complex querying or multi-user concurrency for the MVP. The user also expressed a future intention to migrate to Supabase for multi-project separation.

## Decision

We will persist sessions as **flat JSON files** on the local filesystem (`sessions/{sessionId}.json`). The Next.js API routes will read and write these files directly. This is the absolute minimal persistence layer for the MVP.

## Consequences

- **Simplicity**: No database setup, no ORM, no schema migrations.
- **Inspectability**: Developers can read and edit session state directly in the file system.
- **Limited concurrency**: Simultaneous writes to the same file could corrupt state. For the single-user MVP, this is acceptable.
- **Migration path**: A flat JSON structure is trivially portable to a document store (e.g., Supabase Postgres with a JSONB column) or any other database later. The file format serves as the canonical schema.

## Alternatives considered

- **SQLite with JSONB**: More robust for concurrent writes and metadata indexing, but adds unnecessary complexity for the MVP.

## Related

- ADR 0001: LLM-Driven Orchestration
- PRD: Data Model
