---
number: 008
title: Final brief generation and Markdown export
status: open
labels: [ready-for-agent]
---

## Parent

- PRD: Client Requirement Intake Agent
- Issue 007

## What to build

When the LLM judges coverage sufficient (or the client explicitly says stop), the system generates a formatted Markdown document from the structured brief. The UI prompts the client: "Are you ready to review the structured brief?"

If the client accepts, the system generates a Markdown file with sections for Product Context, Functional Requirements, Aesthetics and UX, Open Questions, Assumptions, and Risks to Product Fit. The client can click **Approve** or **Revise**.

- **Approve:** The session status changes to `approved`. The brief is read-only. The Project is closed. A downloadable `.md` file is generated.
- **Revise:** The client returns to the chat. The LLM asks what to change or what is missing.

If the client explicitly says stop before coverage is sufficient, the system generates the brief with a warning about incomplete areas.

## Acceptance criteria

- [ ] When `is_final` is true, the UI prompts the client to review the brief.
- [ ] The Markdown file is generated with all sections from the structured brief.
- [ ] Client can click **Approve** to close the session, or **Revise** to return to the chat.
- [ ] On approval, the session status changes to `approved` and the brief is read-only.
- [ ] On revise, the LLM asks what needs to change.
- [ ] If the client stops early, the brief includes a warning about incomplete areas.
- [ ] The Markdown file is downloadable.

## Blocked by

- Issue 007
