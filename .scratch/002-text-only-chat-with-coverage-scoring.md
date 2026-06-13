---
number: 002
title: Text-only chat with coverage scoring
status: closed
labels: [ready-for-agent]
---

## Parent

- PRD: Client Requirement Intake Agent
- Issue 001

## What to build

Build a simple chat UI with an input box, send button, and message history. The backend receives text messages, calls OpenAI GPT-4o via Vercel AI SDK with a minimal structured output schema, and updates the session file after each turn.

The UI must display a single progress bar with three marked segments (Product Context, Functional, Aesthetics) showing the current coverage percentages. The backend computes objective coverage scores based on a simple rubric (e.g., required fields filled in the structured brief).

If the LLM fails to produce valid structured JSON, the backend retries once. If the retry fails, it falls back to a simple text response (streamText) and continues the chat without updating the structured brief for that turn.

## Acceptance criteria

- [x] Client can type a message and press Send.
- [x] Agent responds with a natural language question.
- [x] The session file is updated with the new turn in chatHistory.
- [x] The progress bar updates based on the backend-computed coverage scores.
- [x] Structured output is validated against a Zod schema before saving.
- [x] LLM failure triggers one retry; second failure falls back to text-only response.
- [x] The chat history persists across page refreshes (read from session file).

## Blocked by

- Issue 001
