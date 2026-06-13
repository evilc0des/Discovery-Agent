# Product Requirements Document: Client Requirement Intake Agent

## Product overview

The Client Requirement Intake Agent is a product-discovery system that captures rough client input through typed text, spoken input, or uploaded requirement material, then guides the client through a structured clarification dialogue until the product definition is clear, consistent, and approval-ready. The design of the agent follows common requirements-elicitation and UX discovery practice: start from the problem, identify users and workflows, document functional expectations, and explicitly surface design preferences and constraints rather than assuming they will emerge implicitly.[cite:34][cite:36][cite:20][cite:25]

This product is intentionally limited to product and design discovery. It must not discuss budget, timeline, delivery planning, staffing, contracts, or project management; those topics are deferred to human staff.

## Problem statement

Clients often arrive with incomplete briefs, subjective design language, and partially formed feature requests. As a result, teams lose time translating vague statements such as “make it modern” or “we need a dashboard” into actual user flows, interface constraints, and concrete requirements. Discovery guidance consistently recommends structured questioning around user needs, workflows, desired outcomes, and design direction to reduce ambiguity and avoid misunderstandings.[cite:20][cite:34][cite:36]

## Product goal

Create an intake agent that:

- Accepts requirement input by upload, typed text, or speech.
- Conducts a guided back-and-forth discovery session.
- Produces a validated product brief focused only on the product being built.
- Maintains a 20/40/40 discovery balance:
  - 20% product context
  - 40% functional requirements
  - 40% aesthetics, brand identity, and UI/UX constraints

## Non-goals

The system will not:

- Ask about budget.
- Ask about delivery dates or timelines.
- Ask about staffing, resourcing, or project plans.
- Produce commercial estimates or proposals.
- Replace final human approval of scope.

## Target users

- Client stakeholders who want to describe a product idea naturally.
- Business analysts or solution consultants who need a structured discovery artifact.
- Designers who need brand, visual, and UX direction captured early.
- Product teams who need a clean handoff from discovery to scoping.

## Core principles

- Keep every question focused on the product, users, workflows, or design.
- Treat aesthetics as a first-class requirement domain, not a side note. Brand and design questionnaires commonly ask about personality, references, visual preferences, dislikes, and communication style because these shape the eventual design outcome.[cite:25]
- Convert subjective language into observable constraints. UX discovery is stronger when abstract preferences are translated into explicit patterns, examples, and behaviors.[cite:20][cite:34]
- Ask one question at a time.
- Summarize often.
- Do not close the session while critical gaps remain.

## Architecture

- **Frontend:** Next.js 14+ (App Router), TypeScript.
- **AI Orchestration:** Vercel AI SDK with OpenAI GPT-4o via `streamObject` and a Zod schema.
- **Persistence:** Flat JSON files (`sessions/{sessionId}.json`) on the local filesystem; no database for MVP.
- **Deployment:** Self-hosted Docker container with a mounted volume.
- **Speech-to-Text:** Browser native Web Speech API.
- **File Parsing:** Plain text, Markdown, and PDF (server-side synchronous extraction).
- **Image Storage:** Uploaded images stored in `uploads/` directory. Base64-encoded and sent to GPT-4o as image parts.
- **Website Fetching:** Simple HTTP fetch for text extraction (title, meta description, visible text). No screenshots for MVP. Links are detected and fetched by the backend before the LLM call, not via tool calling.

## Product scope

The product includes five major capabilities:

1. Multi-modal intake
2. Requirement extraction
3. Guided discovery dialogue
4. Structured requirement modeling
5. Approval-ready output generation

## Session lifecycle

- A **Project** is a client engagement containing exactly one **Session**.
- A **Session** starts at intake and ends when the structured brief is approved.
- Once a brief is approved, the Project is closed. New requirements require a **new Project**.
- Sessions can be created implicitly when a client starts chatting, or pre-seeded by staff via an internal API.

## Pre-seeding API

- **Endpoint:** `POST /api/projects` (multipart/form-data)
- **Body:**
  - `client_name` (optional, string)
  - `project_name` (optional, string)
  - `requirement_doc` (optional, file: .txt, .md, .pdf)
  - `initial_text` (optional, string)
- **Response:** `201 Created` with JSON:
  ```json
  {
    "projectId": "uuid",
    "sessionId": "uuid",
    "shareableUrl": "https://<host>/session/{sessionId}",
    "initialState": { /* parsed brief if doc/text provided */ },
    "status": "ready"
  }
  ```
- Document parsing is synchronous. The staff can review the `initialState` before sharing the link.

## User stories

### Client

- As a client, I want to upload a requirement file, type a brief, or speak naturally so I can start from whatever material I already have.
- As a client, I want the system to ask focused follow-up questions so vague ideas become clear product decisions.
- As a client, I want to review a structured recap before the session ends so I can confirm that the product direction is understood correctly.

### Analyst

- As an analyst, I want the system to highlight missing information, contradictions, and assumptions so the final brief is cleaner and faster to review.
- As an analyst, I want the output organized by product context, functionality, and aesthetics so the handoff is immediately usable.

### Designer

- As a designer, I want brand personality, visual references, tone, interaction preferences, and UI constraints captured explicitly so design exploration starts with real direction.

## Functional requirements

### 1. Intake capture

The system must support four starting modes:

- Upload a requirement document or reference file.
- Upload an image reference (PNG, JPG, GIF).
- Enter free-form typed text.
- Speak a requirement description through audio capture.

Additionally, during the session, the client may paste a website link. The system must fetch and extract the page text (title, meta description, visible text) and pass it to the LLM as context.

The system must normalize all inputs into a single session record.

### 2. Input interpretation

The system must parse the initial input and extract:

- Problem statements
- User types
- Mentioned features
- Implied workflows
- Brand or style keywords
- Named product references
- Constraints and exclusions
- Ambiguous phrases needing follow-up

### 3. Discovery orchestration

The system must run a question-driven session that balances three domains:

- Product context: 20%
- Functional requirements: 40%
- Aesthetics and UX: 40%

The orchestrator must:

- Ask one question at a time.
- Choose the next question based on missing coverage, ambiguity, contradiction, or low confidence.
- Shift toward aesthetics when brand or UI direction is underspecified.
- Refuse to end while any domain remains critically incomplete.
- Use coverage scores as a guide, not a rigid rule. Allow creative exploration when the client offers high-signal material.

### 3a. Coverage scoring

- The backend computes objective coverage scores for each domain based on a rubric (e.g., required fields filled).
- Scores are presented to the LLM as context in the system prompt.
- The LLM uses scores as a recommendation, not a command. It can override for 1–2 turns to follow a valuable tangent.

### 3b. Contradiction detection

- The LLM must detect contradictions between client statements in real time.
- When a contradiction is detected, the LLM must immediately challenge it politely and ask for clarification.
- Detected contradictions are stored in the structured brief for staff visibility.

### 3c. Out-of-scope handling

- Out-of-scope topics (budget, timeline, staffing, delivery, commercials, meeting cadence) are deflected with a brief acknowledgment.
- Each deflected topic is logged in `outOfScopeTopics` with the turn number and client quote.
- The LLM returns immediately to product discovery after deflection.

### 4. Product-context discovery

The system must ask questions that clarify:

- What problem the product solves
- Who the intended users are
- What context the product is used in
- What success looks like for the end user
- What the product should definitely not include
- What is must-have versus nice-to-have

### 5. Functional discovery

The system must ask questions that clarify:

- User journeys and task flows
- Core actions users must complete
- Inputs, outputs, and stored information
- Roles and permissions
- Integrations with external systems
- System responses and edge cases
- Acceptance criteria for key features

### 6. Aesthetic and UX discovery

The system must ask questions that clarify:

- Brand personality
- Tone of voice
- Desired user emotions
- Visual style keywords
- Reference products or brands
- Liked and disliked design patterns
- Color preferences and avoidances
- Typography direction
- Imagery and iconography direction
- Interaction style and motion expectations
- Accessibility expectations
- UI density, device, or platform constraints

Branding and UX discovery sources consistently recommend asking for references, style preferences, audience alignment, and dislikes because these convert vague creative language into design direction that a team can act on.[cite:25][cite:20]

### 7. Summary and validation

The system must summarize whenever a major topic or domain has been sufficiently explored, using:

- What is known
- What is assumed
- What is still unclear
- What should be confirmed next

Before closing, the system must generate a final recap grouped into:

- Product context
- Functional requirements
- Aesthetics and UX
- Open questions
- Assumptions
- Risks to product fit

### 8. Session rules

The system must never ask about:

- Budget
- Timeline
- Delivery sequence
- Staffing
- Commercial terms
- Meeting cadence

If a client raises those topics, the system must:

- Acknowledge briefly
- Mark the topic as “handled by human team”
- Return immediately to product discovery

## Conversation design

### Dialogue behavior

The agent should behave like a senior discovery analyst with strong product and design instincts.

It should:

- Start broad, then narrow.
- Ask for examples when the client is vague.
- Challenge contradictions directly.
- Translate abstract words into specific constraints.
- Separate must-haves, nice-to-haves, and must-avoids.
- Prefer clarity over speed.

### Example conversion rules

- “Modern” becomes questions about density, typography, whitespace, motion, component style, and references.
- “Premium” becomes questions about tone, materials, visual restraint, imagery quality, and interaction polish.
- “Simple” becomes questions about workflow steps, cognitive load, permissions, and visible complexity.

## System prompt

```text
You are a senior product discovery and design intake analyst.

Your task is to convert rough client input into a validated product discovery brief with a 20/40/40 balance:
- 20% product context
- 40% functional requirements
- 40% brand, aesthetics, design, and UI/UX constraints

You must only discuss the product being built.
Do not ask about or discuss:
- budget
- pricing
- timelines
- delivery plans
- staffing
- project management process
- meeting cadence
- contracts or commercials

If the client raises any of those, acknowledge briefly and mark them as "Handled by human team", then return to product discovery.

Track these domains:

PRODUCT CONTEXT
- core problem
- user need
- target audience
- success definition
- use environment/context
- product boundaries
- must-have vs nice-to-have intent

FUNCTIONAL
- user segments
- jobs to be done
- current workflow
- desired workflow
- features
- system responses
- integrations
- data inputs/outputs
- roles/permissions
- edge cases
- acceptance criteria

AESTHETICS
- brand personality
- tone of voice
- emotional outcome
- visual style
- references
- likes/dislikes
- color preferences/avoidances
- typography direction
- imagery/iconography direction
- interaction style
- accessibility expectations
- UI constraints

Rules:
1. Ask one question at a time.
2. Keep the conversation centered on the product.
3. If a client uses vague words like “modern”, “premium”, or “clean”, ask for examples and observable traits.
4. Convert subjective preferences into explicit UI/UX constraints.
5. Separate must-have, nice-to-have, and must-avoid items.
6. Summarize whenever a major topic or domain has been sufficiently explored. Use coverage scores as a guide, not a rigid rule.
7. Do not end until all three domains have sufficient coverage (guideline: ~70%) or the client explicitly pauses.
8. Produce a final brief focused only on the product and design direction.
9. Detect contradictions immediately and challenge them politely.
10. Use coverage scores as a guide, not a command. If the client offers rich, high-signal material, explore it opportunistically. Return to the lowest-coverage domain within the next 1–2 turns.
```

## Data model

### Structured brief

```json
{
  "product_context": {
    "problem_statement": { "value": "", "citations": [] },
    "target_audience": [],
    "user_needs": [],
    "use_context": { "value": "", "citations": [] },
    "success_definition": { "value": "", "citations": [] },
    "product_boundaries": [],
    "must_have_goals": [],
    "nice_to_have_goals": []
  },
  "functional": {
    "user_segments": [],
    "jobs_to_be_done": [],
    "current_workflows": [],
    "desired_workflows": [],
    "features": [],
    "system_behaviors": [],
    "integrations": [],
    "data_entities": [],
    "roles_permissions": [],
    "edge_cases": [],
    "acceptance_criteria": []
  },
  "aesthetics": {
    "brand_personality": [],
    "tone_of_voice": { "value": "", "citations": [] },
    "desired_emotions": [],
    "visual_style_keywords": [],
    "reference_products": [],
    "liked_patterns": [],
    "disliked_patterns": [],
    "color_preferences": [],
    "color_avoidances": [],
    "typography_direction": [],
    "imagery_direction": [],
    "interaction_principles": [],
    "accessibility_expectations": [],
    "ui_constraints": []
  },
  "assumptions": [],
  "risks_to_product_fit": [],
  "open_questions": [],
  "out_of_scope_topics": [],
  "approval_status": "draft|reviewed|approved"
}
```

**Traceability:** Every extracted value is stored as an object with `value` and `citations` (an array of citation IDs referencing the chat history). The chat history is stored separately, allowing staff to trace any structured field back to the raw client statement that produced it.

### Session state file

Each session is persisted as a flat JSON file (`sessions/{sessionId}.json`):

```json
{
  "sessionId": "uuid",
  "projectId": "uuid",
  "status": "in_discovery|brief_ready|approved",
  "createdAt": "2026-06-13T10:00:00Z",
  "updatedAt": "2026-06-13T10:00:00Z",
  "shareableUrl": "https://<host>/session/{sessionId}",
  "metadata": {
    "clientName": "",
    "projectName": ""
  },
  "chatHistory": [
    {
      "turnNumber": 1,
      "role": "user|assistant",
      "content": "",
      "contentType": "text|image|website_link",
      "imageId": "img-1",
      "websiteUrl": "",
      "timestamp": "2026-06-13T10:00:00Z",
      "citations": ["c-1"]
    }
  ],
  "structuredBrief": { /* data model above */ },
  "coverage": {
    "productContext": 0.0,
    "functional": 0.0,
    "aesthetics": 0.0
  },
  "contradictions": [],
  "assumptions": [],
  "openQuestions": [],
  "recapHistory": [],
  "lastRecapTurn": 0,
  "outOfScopeTopics": [],
  "llmReasoning": "",
  "uploadedImages": [
    {
      "id": "img-1",
      "originalName": "reference.png",
      "storedPath": "uploads/{sessionId}/reference.png",
      "mimeType": "image/png",
      "uploadedAt": "2026-06-13T10:00:00Z"
    }
  ]
}
```

## LLM output schema

Every assistant response is streamed as a structured JSON object via `streamObject`:

```typescript
const discoverySchema = z.object({
  message: z.string(), // the natural language question to the client
  state_update: z.object({
    coverage: z.object({
      product_context: z.number().min(0).max(1),
      functional: z.number().min(0).max(1),
      aesthetics: z.number().min(0).max(1),
    }),
    extracted: z.object({ /* newly extracted entities */ }),
    contradictions: z.array(z.string()),
    open_questions: z.array(z.string()),
    assumptions: z.array(z.string()),
    out_of_scope_topics: z.array(z.object({
      topic: z.string(),
      turn_number: z.number(),
      client_quote: z.string(),
    })),
  }),
  reasoning: z.string(), // why this question was chosen
  is_recap: z.boolean(), // true if this turn is a scheduled recap
  is_final: z.boolean(), // true if the agent proposes to generate the final brief
});
```

## Error handling

- If the LLM fails to produce valid structured JSON, the backend retries once.
- If the retry fails, the system falls back to a simple text-based response (using `streamText`). The chat continues, but the structured brief and progress bar are not updated for that turn.
- The backend logs all failures. The session never requires manual intervention.

## UX and product rules

- The UI must display a single progress bar with three marked segments representing Product Context, Functional, and Aesthetics coverage.
- The UI must show unresolved questions and contradictions separately.
- The UI must allow the client to approve or revise the final recap.
- For the MVP, staff review and editing of the structured brief is performed by editing the underlying JSON file directly. A dedicated staff review UI is out of scope for v1.
- The UI must preserve traceability between raw client statements and structured outputs.

## Success criteria

A successful session produces:

- A clear problem statement
- Identified users and workflows
- A structured feature definition
- Explicit UI/UX and brand direction
- A list of assumptions and open questions
- A reviewable final discovery brief

## MVP definition

Version 1 should include:

- Text input
- File upload
- Speech-to-text intake
- Image upload and vision analysis (PNG, JPG, GIF)
- Website link fetching and text extraction
- Structured parsing of input
- Guided follow-up questioning
- Coverage scoring across the 20/40/40 model
- Mid-session summaries
- Final approval recap
- Exportable structured brief

## Out of scope for v1

- Automatic wireframe generation
- Design generation from prompts
- Project estimation
- Proposal generation
- Jira or CRM automation beyond simple export
- Multi-stakeholder live workshop mode
- JSON export of the structured brief
- Staff review UI (staff edits JSON directly)
- Client authentication (link-based access only)
- Microsoft Word (.docx) support
- Website screenshot generation (text extraction only for MVP)

## Acceptance criteria

- The system supports upload, typed entry, spoken intake, and image upload.
- The system can fetch and extract text from website links shared by the client.
- The system maintains structured coverage across Product Context, Functional, and Aesthetics.
- The system does not ask budget, timeline, or delivery questions.
- The system converts subjective aesthetic terms into explicit design constraints.
- The system summarizes progress during the conversation.
- The system produces a final structured brief and approval recap.
- The system exports the approved brief as formatted Markdown (v1 only; JSON export deferred).
- The system tracks assumptions, contradictions, and open questions.

## Final brief approval flow

1. When the LLM judges coverage sufficient (guideline: ~70% across all three domains), it proposes generating the final brief: *"I believe we have enough to produce a structured brief. Are you ready to review it, or shall we continue exploring?"*
2. If the client accepts, the system generates a formatted Markdown document from the structured brief.
3. The client can click **Approve** or **Revise**.
   - **Approve:** The session status changes to `approved`. The brief is read-only. The Project is closed.
   - **Revise:** The client returns to the chat. The LLM asks what to change or what is missing.
4. If the client explicitly says "stop" before coverage is sufficient, the system generates the brief with a warning about incomplete areas.

## Export format

- **v1:** Formatted Markdown only. The server generates a human-readable document from the structured brief.
- **JSON export deferred** to a later version.

## Final product rule

If a question does not improve product definition, functional clarity, or design direction, the agent should not ask it.
