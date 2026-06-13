---
number: 007
title: Discovery orchestration
status: open
labels: [ready-for-agent]
---

## Parent

- PRD: Client Requirement Intake Agent
- Issue 002

## What to build

Implement the full system prompt with all behavioral rules: one question at a time, topic-based recaps (not turn-based), contradiction detection, out-of-scope deflection, 70% coverage guideline, and creative exploration.

The LLM must emit structured output via `streamObject` with fields: message (natural language), state_update (coverage, extracted, contradictions, open_questions, assumptions, out_of_scope_topics), reasoning, is_recap, and is_final.

The backend enforces a recap ceiling: if 7 turns pass without a recap, the backend forces is_recap: true. The backend computes objective coverage scores and presents them to the LLM as context, but the LLM uses them as a guide, not a command.

If the LLM fails to produce valid structured JSON, the backend retries once. If the retry fails, it falls back to streamText (text-only response). The session continues without manual intervention.

## Acceptance criteria

- [ ] Agent asks exactly one question per turn.
- [ ] Agent detects contradictions between client statements and immediately challenges them politely.
- [ ] Agent deflects out-of-scope topics (budget, timeline, etc.) with brief acknowledgment and logs them.
- [ ] Agent recaps when a major topic is sufficiently explored (not on a fixed turn count).
- [ ] Agent proposes the final brief when coverage is sufficient (guideline: ~70% across all domains).
- [ ] Backend enforces a max of 7 turns without a recap.
- [ ] LLM output is validated against the Zod schema.
- [ ] Failure triggers one retry; second failure falls back to text-only response.

## Blocked by

- Issue 002
