# Context: Client Requirement Intake Agent

## Domain

A product-discovery system that captures rough client input through typed text, spoken input, or uploaded requirement material, then guides the client through a structured clarification dialogue until the product definition is clear, consistent, and approval-ready.

## Ubiquitous language

| Term | Definition |
|------|------------|
| **Session** | A single discovery conversation between a client and the agent, from intake through to final recap. |
| **Intake** | The initial client input (upload, text, or speech) that starts a session. |
| **Turn** | A single back-and-forth exchange in the session: one client message and one agent response. |
| **Domain** | One of the three discovery areas tracked by the agent: Product Context, Functional Requirements, or Aesthetics and UX. |
| **Coverage** | The completeness score of a domain within the current session, expressed as a percentage. |
| **Structured brief** | The final, validated, exportable artifact produced at the end of a session. |
| **Recap** | A mid-session or end-of-session summary of knowns, assumptions, open questions, and contradictions. |
| **Out-of-scope topic** | Any topic the agent is forbidden to discuss (budget, timeline, staffing, delivery, commercials, meeting cadence). |
| **Project** | A client engagement for which exactly one product is discovered; contains exactly one Session. Once the Session brief is approved, the Project is closed and new requirements require a new Project. |

## Bounded contexts

- **Discovery Orchestration** (single context): Manages the conversation flow, coverage tracking, and structured brief generation.

## Invariants

- The agent must never ask about budget, timeline, staffing, delivery, commercials, or meeting cadence.
- The agent must ask only one question per turn.
- The agent must not end the session while any domain remains critically incomplete.
- The agent must produce a recap whenever a major topic or domain has been sufficiently explored, not on a fixed turn count.
- Coverage is computed objectively by the backend, but the LLM uses it as a guide, not a rigid rule, preserving creative exploration.

## Glossary

- **Product Context** (20%): The domain covering core problem, user need, target audience, success definition, use environment, product boundaries, and must-have vs nice-to-have intent.
- **Functional Requirements** (40%): The domain covering user segments, jobs to be done, workflows, features, system responses, integrations, data, roles/permissions, edge cases, and acceptance criteria.
- **Aesthetics and UX** (40%): The domain covering brand personality, tone, emotions, visual style, references, likes/dislikes, color, typography, imagery, interaction, accessibility, and UI constraints.

## Canonical scenarios

- **Intake → Discovery → Recap → Approval**: A client uploads a document, the agent asks follow-up questions, produces a mid-session recap, and finally generates a structured brief for review.
- **Pre-seeded project**: A staff member calls an internal API endpoint to create a Project and Session, optionally supplying an initial requirement document. The system returns a shareable link that the client uses to open the session directly. The client does not authenticate; the link is the credential.
- **Out-of-scope deflection**: A client asks about budget; the agent acknowledges, marks it as handled by the human team, and returns immediately to product discovery.
- **Vague-to-concrete translation**: A client says "make it modern"; the agent asks about density, typography, whitespace, motion, component style, and references.

## Related docs

- PRD: `PRD.md`
- Architecture decisions: `docs/adr/`
