---
number: 001
title: Session infrastructure and project creation
status: completed
labels: [ready-for-agent]
---

## Parent

- PRD: Client Requirement Intake Agent

## What to build

Set up the Next.js 14+ project with TypeScript, Docker configuration, and the session state file schema. Implement the implicit project creation flow: when a client first visits the app, a new session file is created automatically.

The session file must follow the exact schema defined in the PRD, including all metadata fields (sessionId, projectId, status, timestamps, shareableUrl), chatHistory, structuredBrief (with empty but correctly typed fields), coverage, contradictions, assumptions, openQuestions, recapHistory, lastRecapTurn, outOfScopeTopics, and llmReasoning.

This is the foundational slice. All other slices depend on this being correct.

## Acceptance criteria

- [x] Next.js 14+ project is initialized with TypeScript and App Router.
- [x] Docker container can be built and started with a mounted volume.
- [x] Visiting `/session` creates a new session file under `sessions/{sessionId}.json`.
- [x] The created file matches the PRD schema exactly (all fields present, correct types, empty defaults).
- [x] The session file is writable by the Next.js API routes.
- [x] A `sessions/` directory is created automatically if it does not exist.

## Blocked by

None — can start immediately.
