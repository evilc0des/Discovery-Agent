# ADR 0001: LLM-Driven Orchestration

## Status

Accepted

## Context

The PRD requires a discovery orchestrator that balances three domains (20/40/40), asks one question at a time, detects contradictions, and produces periodic recaps. We needed to decide whether the orchestration logic (choosing the next question, tracking coverage, detecting gaps) should be built as a rule engine or delegated to the LLM.

## Decision

We will use **LLM-driven orchestration**. The LLM is given the full state, coverage rules, and domain definitions via the system prompt. It acts as the senior discovery analyst, deciding the next question, summarizing progress, and detecting gaps. The backend is a thin wrapper around the LLM API. The frontend receives structured data from the LLM's output to update the live coverage dashboard.

## Consequences

- **Faster to build**: No complex rule engine or state machine needed in the backend.
- **More flexible**: The LLM can handle unexpected edge cases and vague inputs naturally.
- **Risk of drift**: The LLM might occasionally drift from the rules (e.g., ask two questions, or forget the 20/40/40 balance). We mitigate this by enforcing a strict JSON schema for state updates and validating the LLM's output before streaming it to the client.
- **Less auditable**: It's harder to explain exactly why the LLM chose a particular question. We mitigate this by requiring the LLM to include reasoning in the structured output.
- **Cost**: One LLM call per turn, no additional orchestration backend needed.

## Alternatives considered

- **Rule engine + LLM**: A separate backend engine tracks coverage and pre-selects questions. The LLM only formats the question. This is more deterministic but requires building a complex backend state machine and a large question bank, which is too heavy for an MVP.

## Related

- PRD Section 3: Discovery Orchestration
- CONTEXT.md: Invariants
