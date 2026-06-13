---
number: 005
title: Speech-to-text intake
status: open
labels: [ready-for-agent]
---

## Parent

- PRD: Client Requirement Intake Agent
- Issue 002

## What to build

Add a microphone button to the chat input. Use the browser's native Web Speech API for speech-to-text. When the user clicks the mic, the browser listens, and the transcript streams into the text input box in real time. The user can edit the transcript before pressing Send.

If the browser does not support the Web Speech API, the mic button is hidden. No backend changes are needed — the speech is converted to text in the browser and sent as a normal text message.

## Acceptance criteria

- [x] A mic button is visible in the chat input.
- [x] Clicking the mic activates the browser's Web Speech API.
- [x] The transcript streams into the text input box.
- [x] The user can edit the transcript before sending.
- [x] The mic button is hidden if the browser does not support Web Speech API.
- [x] The message is sent as normal text (no backend changes needed).

## Blocked by

- Issue 002
