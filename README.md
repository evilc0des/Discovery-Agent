# Client Requirement Intake Agent

A product-discovery system that captures rough client input — typed text, spoken input, uploaded documents, images, or website links — and guides the client through a structured clarification dialogue until the product definition is clear, consistent, and approval-ready.

The agent focuses on three domains with a 20/40/40 balance:

- **Product Context (20%)** — problem, users, success criteria, boundaries
- **Functional Requirements (40%)** — workflows, features, integrations, roles, edge cases
- **Aesthetics & UX (40%)** — brand personality, visual style, tone, interactions, accessibility

It deliberately avoids budget, timeline, staffing, delivery, and commercial topics — those are deferred to the human team.

## Features

- Multi-modal intake: text, speech (Web Speech API), file upload (`.txt`, `.md`, `.pdf`), image upload (`.png`, `.jpg`, `.gif`), and website link fetching
- AI-guided discovery dialogue powered by GPT-4o with structured JSON output
- Real-time coverage scoring across the three discovery domains
- Contradiction detection and out-of-scope topic handling
- Mid-session recaps and a final structured brief exported as Markdown
- Staff pre-seeding API (`POST /api/projects`) for creating sessions ahead of time
- Link-based access — clients do not authenticate; the session URL is the credential

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| AI / LLM | Vercel AI SDK + OpenAI GPT-4o |
| Persistence | Flat JSON files (`sessions/`) |
| Deployment | Docker (self-hosted) with a mounted volume |
| Testing | Vitest, Testing Library, jsdom |

## Getting Started

### Prerequisites

- Node.js 20+
- An OpenAI API key

### Environment

Create a `.env.local` file at the project root:

```bash
OPENAI_API_KEY=sk-...
```

Optional overrides:

```bash
SESSIONS_DIR=sessions       # default: sessions
UPLOADS_DIR=uploads         # default: uploads
```

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker

```bash
docker compose up --build
```

Maps `sessions/` as a volume so session data persists across container restarts. The service listens on port 3000.

## Project Structure

```
app/
  api/projects/          # POST — staff pre-seeding API
  api/session/[id]/      # GET/PATCH — session CRUD
  session/[id]/          # Client chat interface
  page.tsx               # Landing / session creation
lib/
  llm/
    chat.ts              # GPT-4o streaming chat with structured output
    parse.ts             # Initial document parsing
  session/
    store.ts             # JSON file-based session persistence
    types.ts             # Session data model
  files.ts               # File upload & image handling
components/              # React UI components
sessions/                # Session JSON files (volume-mounted in Docker)
tests/                   # Vitest test suite
```

## API

### Pre-seeding API

`POST /api/projects` (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_name` | string | no | Display name for the client |
| `project_name` | string | no | Project label |
| `requirement_doc` | file | no | `.txt`, `.md`, or `.pdf` to pre-load |
| `initial_text` | string | no | Free-text requirement to pre-load |

Returns `201 Created` with `{ projectId, sessionId, shareableUrl, initialState, status }`.

### Session API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/session/{id}` | Fetch full session state |
| `PATCH` | `/api/session/{id}` | Update session (chat, brief, approval) |

## Session Lifecycle

1. **Intake** — client uploads, types, or speaks a requirement
2. **Discovery** — the agent asks one question at a time across the three domains
3. **Recap** — summaries are produced when a domain is sufficiently explored
4. **Approval** — when coverage reaches ~70% across all domains, a final brief is generated and the client can approve or revise

Once approved, the Project is closed. New requirements need a new Project.

## Testing

```bash
npm test
```

## License

Private — internal use.
