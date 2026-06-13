# Triage Labels

## Canonical label vocabulary

| Label | Meaning | When to use |
|-------|---------|-------------|
| `needs-triage` | Maintainer needs to evaluate | Default for new issues; issue has not been reviewed yet |
| `needs-info` | Waiting on reporter | Issue is unclear, needs more details, or the reporter must answer a question |
| `ready-for-agent` | Fully specified, AFK-ready | An autonomous agent can pick up and implement without human context |
| `ready-for-human` | Needs human implementation | Requires human judgment, design review, manual testing, or stakeholder approval |
| `wontfix` | Will not be actioned | Out of scope, duplicate, or explicitly rejected |

## Label rules

- Each issue should have exactly one active label from the list above
- Labels are stored in the markdown frontmatter as a YAML array
- When triaging, replace the existing label with the new one
- `ready-for-agent` is the gate for autonomous work — only assign this when an AFK agent can actually complete the work
