# Issue Tracker

## Where issues live

Issues are stored as local markdown files under `.scratch/` in this repo.

## Directory structure

```
.scratch/
└── client-requirement-intake-agent/
    ├── 001-foo.md
    ├── 002-bar.md
    └── 003-baz.md
```

## Creating an issue

When `to-issues` or `triage` needs to create a new issue, it:

1. Reads `.scratch/` to find the highest existing issue number
2. Creates a new markdown file with the next number
3. Writes the issue body using the template below

## Issue file format

Each issue file is a markdown file with a YAML frontmatter block:

```markdown
---
number: 001
title: Short descriptive title
status: open
labels: [needs-triage]
---

## Parent

[Reference to parent issue if applicable]

## What to build

[Description]

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- None
```

## Allowed labels

- `needs-triage` — maintainer needs to evaluate
- `needs-info` — waiting on reporter
- `ready-for-agent` — fully specified, AFK-ready
- `ready-for-human` — needs human implementation
- `wontfix` — will not be actioned

## Issue workflow

1. New issues are created with `status: open` and `labels: [needs-triage]`
2. During triage, the label is updated to the appropriate state
3. When an issue is completed, `status: closed` is set
4. The `blocked-by` field is updated when blockers are resolved
