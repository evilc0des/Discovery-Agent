---
number: 006
title: Pre-seeding API for staff
status: open
labels: [ready-for-agent]
---

## Parent

- PRD: Client Requirement Intake Agent
- Issue 001

## What to build

Build an internal API endpoint `POST /api/projects` that accepts multipart/form-data. Staff can use this to create a pre-seeded project and session before sharing the link with a client.

The endpoint accepts: client_name (optional), project_name (optional), requirement_doc (optional file: .txt, .md, .pdf), and initial_text (optional string). The endpoint creates a new session file, parses the document or text synchronously using the LLM to populate the initial structured brief, and returns a shareable URL.

The client can visit the link and start the conversation immediately. The session state is pre-populated with the extracted content.

## Acceptance criteria

- [ ] `POST /api/projects` accepts multipart/form-data.
- [ ] Optional fields: client_name, project_name, requirement_doc, initial_text.
- [ ] If a document or text is provided, the LLM parses it synchronously and populates the initial structured brief.
- [ ] Response includes projectId, sessionId, shareableUrl, and initialState.
- [ ] The client visiting the shareable URL sees the pre-seeded content and can start the chat.
- [ ] No authentication is required for the client-facing link.

## Blocked by

- Issue 001
