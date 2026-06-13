---
number: 003
title: File upload and image upload
status: open
labels: [ready-for-agent]
---

## Parent

- PRD: Client Requirement Intake Agent
- Issue 002

## What to build

Add a file upload button (drag-and-drop enabled) to the chat UI. The backend must accept PDF, plain text (.txt), Markdown (.md), and images (PNG, JPG, GIF).

For PDF, text, and Markdown files, extract raw text synchronously on the server and send it to the LLM as context. For images, store them in an `uploads/` directory, base64-encode them, and send them as image parts to GPT-4o (vision mode). The LLM should be able to ask questions about the uploaded content.

Update the session file to include uploaded image metadata and the extracted text. The chat history should reflect that an upload occurred.

## Acceptance criteria

- [x] Client can upload a file via drag-and-drop or file picker.
- [x] Supported formats: PDF, TXT, MD, PNG, JPG, GIF.
- [x] Unsupported formats show a clear error message.
- [x] Uploaded images are stored in `uploads/{sessionId}/` and referenced in the session file.
- [x] For images, the LLM (GPT-4o) receives the image as a vision input and can ask questions about it.
- [x] For documents, the extracted text is sent to the LLM as context.
- [x] The session file is updated with upload metadata and the agent's follow-up questions.
- [x] Document parsing is synchronous (no background jobs).

## Blocked by

- Issue 002
