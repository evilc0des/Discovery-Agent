# Domain Docs

## Layout

This repo follows a **single-context** layout:

```
/
├── CONTEXT.md              ← domain glossary, ubiquitous language, invariants
├── docs/
│   └── adr/
│       ├── 0001-llm-driven-orchestration.md
│       └── 0002-flat-json-files.md
└── src/
```

## Consumer rules

- Skills that need domain context read `CONTEXT.md` from the repo root
- Architecture decisions are read from `docs/adr/`
- There is no `CONTEXT-MAP.md` — this is not a multi-context repo
- When adding new ADRs, follow the naming convention: `####-short-description.md`
- CONTEXT.md is the glossary — implementation details belong in the PRD or ADRs

## Writing conventions

- `CONTEXT.md` should only contain domain language, not implementation specs
- Keep it free of implementation details, code snippets, or technical architecture
- ADRs record hard-to-reverse, surprising decisions that resulted from real trade-offs
- Create files lazily — only when there is something to write
