import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionStore } from '@/lib/session/store';
import { generateChatResponse } from '@/lib/llm/chat';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-chat-file-upload');
const TEST_UPLOADS_DIR = path.join(process.cwd(), 'test-uploads-file-upload');

vi.mock('@/lib/llm/chat', () => ({
  generateChatResponse: vi.fn(),
  generateFallbackResponse: vi.fn(),
}));

async function callPostChatWithFile(
  sessionId: string,
  file?: { buffer: Buffer; filename: string; mimeType: string },
  message?: string
) {
  const { POST } = await import('@/app/api/session/[id]/chat/route');
  const { NextRequest } = await import('next/server');

  const formData = new FormData();
  if (message) formData.append('message', message);
  if (file) {
    formData.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }), file.filename);
  }

  const request = new NextRequest(`http://localhost:3000/api/session/${sessionId}/chat`, {
    method: 'POST',
    body: formData,
  });
  return POST(request, { params: Promise.resolve({ id: sessionId }) });
}

describe('POST /api/session/[id]/chat - file uploads', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    if (fs.existsSync(TEST_UPLOADS_DIR)) fs.rmSync(TEST_UPLOADS_DIR, { recursive: true });
    process.env.SESSIONS_DIR = TEST_SESSIONS_DIR;
    process.env.UPLOADS_DIR = TEST_UPLOADS_DIR;
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    if (fs.existsSync(TEST_UPLOADS_DIR)) fs.rmSync(TEST_UPLOADS_DIR, { recursive: true });
    delete process.env.SESSIONS_DIR;
    delete process.env.UPLOADS_DIR;
    vi.clearAllMocks();
  });

  function createMinimalPng(): Buffer {
    // Minimal 1x1 red PNG
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
      0x00, 0x03, 0x00, 0x01, 0x0e, 0x45, 0xab, 0x52,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
      0xae, 0x42, 0x60, 0x82,
    ]);
  }

  it('uploads a .txt file, extracts text, and includes it in LLM context', async () => {
    vi.mocked(generateChatResponse).mockResolvedValue({
      message: 'I see you uploaded a file about fitness. What specific features do you need?',
      stateUpdate: {
        coverage: { product_context: 0.1, functional: 0.0, aesthetics: 0.0 },
        extracted: {},
        contradictions: [],
        open_questions: [],
        assumptions: [],
        out_of_scope_topics: [],
      },
      reasoning: 'Responding to file upload',
      isRecap: false,
      isFinal: false,
    });

    const store = new SessionStore();
    const session = store.createSession();

    const fileContent = 'Fitness App Requirements\n- Track workouts\n- Set goals\n- View progress';
    const response = await callPostChatWithFile(session.sessionId, {
      buffer: Buffer.from(fileContent, 'utf-8'),
      filename: 'requirements.txt',
      mimeType: 'text/plain',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('fitness');

    const llmCall = vi.mocked(generateChatResponse).mock.calls[0][0];
    expect(llmCall.messages.some((m) =>
      typeof m.content === 'string' && m.content.includes('Fitness App Requirements')
    )).toBe(true);

    const updatedSession = store.getSession(session.sessionId);
    expect(updatedSession.chatHistory).toHaveLength(2);
    expect(updatedSession.chatHistory[0].contentType).toBe('file_upload');
    expect(updatedSession.chatHistory[0].content).toContain('requirements.txt');
    expect(updatedSession.chatHistory[0].content).toContain('Fitness App Requirements');
  });

  it('stores uploaded image on disk and sends it to LLM as vision input', async () => {
    vi.mocked(generateChatResponse).mockResolvedValue({
      message: 'I can see the reference image you uploaded. What style aspects do you like about it?',
      stateUpdate: {
        coverage: { product_context: 0.0, functional: 0.0, aesthetics: 0.1 },
        extracted: {},
        contradictions: [],
        open_questions: [],
        assumptions: [],
        out_of_scope_topics: [],
      },
      reasoning: 'Asking about image reference',
      isRecap: false,
      isFinal: false,
    });

    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPostChatWithFile(session.sessionId, {
      buffer: createMinimalPng(),
      filename: 'reference.png',
      mimeType: 'image/png',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('reference image');

    // Verify image stored on disk
    const imagePath = path.join(TEST_UPLOADS_DIR, session.sessionId, 'reference.png');
    expect(fs.existsSync(imagePath)).toBe(true);

    // Verify session file updated with image metadata
    const updatedSession = store.getSession(session.sessionId);
    expect(updatedSession.uploadedImages).toHaveLength(1);
    const img = updatedSession.uploadedImages[0];
    expect(img.originalName).toBe('reference.png');
    expect(img.mimeType).toBe('image/png');
    expect(img.storedPath).toBe(`uploads/${session.sessionId}/reference.png`);
    expect(typeof img.id).toBe('string');

    // Verify chat history reflects upload
    expect(updatedSession.chatHistory[0].contentType).toBe('image_upload');
    expect(updatedSession.chatHistory[0].content).toContain('reference.png');
  });

  it('returns 400 error for unsupported file formats', async () => {
    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPostChatWithFile(session.sessionId, {
      buffer: Buffer.from('fake word doc content', 'utf-8'),
      filename: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Unsupported file type');
    expect(body.error).toContain('document.docx');

    // Verify session was not modified
    const unchangedSession = store.getSession(session.sessionId);
    expect(unchangedSession.chatHistory).toHaveLength(0);
    expect(unchangedSession.uploadedImages).toHaveLength(0);
  });
});
