---
number: 004
title: Website link detection and fetching
status: open
labels: [ready-for-agent]
---

## Parent

- PRD: Client Requirement Intake Agent
- Issue 002

## What to build

Detect URLs pasted by the client in chat messages. The backend must fetch the page content using a simple HTTP request, extract the title, meta description, and visible text, and append this extracted content to the user message before sending it to the LLM.

No tool calling is used. The backend detects URLs via regex, fetches them, and enriches the message. The LLM receives the full context and can ask questions about the website's content.

Update the session file to track which turns included website links and what was extracted.

## Acceptance criteria

- [x] URLs in client messages are detected by regex.
- [x] Backend fetches the page text (title, meta description, visible text) via HTTP.
- [x] Fetch failures are handled gracefully (e.g., timeout, 404) without breaking the chat.
- [x] Extracted content is appended to the user message before the LLM call.
- [x] The LLM can ask questions about the website's content.
- [x] The session file records the URL, the extracted text, and the turn number.

## Blocked by

- Issue 002
