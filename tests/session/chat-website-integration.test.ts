import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionStore } from '@/lib/session/store';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-chat-website');

vi.mock('@/lib/llm/chat', () => ({
  generateChatResponse: vi.fn(),
  generateFallbackResponse: vi.fn(),
}));

vi.mock('@/lib/website', async () => {
  const actual = await vi.importActual<typeof import('@/lib/website')>('@/lib/website');
  return {
    ...actual,
    fetchWebsiteContent: vi.fn(),
  };
});

import { generateChatResponse } from '@/lib/llm/chat';
import { fetchWebsiteContent } from '@/lib/website';

async function callPostChat(sessionId: string, message: string) {
  const { POST } = await import('@/app/api/session/[id]/chat/route');
  const { NextRequest } = await import('next/server');
  const request = new NextRequest(`http://localhost:3000/api/session/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return POST(request, { params: Promise.resolve({ id: sessionId }) });
}

describe('POST /api/session/[id]/chat with website links', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) {
      fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    }
    process.env.SESSIONS_DIR = TEST_SESSIONS_DIR;
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) {
      fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    }
    delete process.env.SESSIONS_DIR;
    vi.clearAllMocks();
  });

  it('detects URL in message, fetches website, and appends content to LLM message', async () => {
    vi.mocked(generateChatResponse).mockResolvedValue({
      message: 'I see you sent a fitness app website. Can you tell me more about your goals?',
      stateUpdate: {
        coverage: { product_context: 0.1, functional: 0.0, aesthetics: 0.0 },
        extracted: {},
        contradictions: [],
        open_questions: [],
        assumptions: [],
        out_of_scope_topics: [],
      },
      reasoning: 'Processing website content',
      isRecap: false,
      isFinal: false,
    });

    vi.mocked(fetchWebsiteContent).mockResolvedValue({
      title: 'FitLife - Premium Fitness Coaching',
      metaDescription: 'Personalized fitness plans for all levels.',
      visibleText: 'Welcome to FitLife. We offer customized workout plans and nutrition guidance.',
    });

    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPostChat(session.sessionId, 'Check out https://fitlife.example.com and tell me what you think');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.message).toBe('I see you sent a fitness app website. Can you tell me more about your goals?');

    expect(generateChatResponse).toHaveBeenCalled();
    const callArgs = vi.mocked(generateChatResponse).mock.calls[0][0];
    const lastMessage = callArgs.messages[callArgs.messages.length - 1];
    expect(typeof lastMessage.content).toBe('string');
    expect(lastMessage.content).toContain('FitLife - Premium Fitness Coaching');
    expect(lastMessage.content).toContain('Welcome to FitLife');
    expect(lastMessage.content).toContain('Check out https://fitlife.example.com');

    const updatedSession = store.getSession(session.sessionId);
    expect(updatedSession.fetchedWebsites).toHaveLength(1);
    expect(updatedSession.fetchedWebsites[0].url).toBe('https://fitlife.example.com');
    expect(updatedSession.fetchedWebsites[0].title).toBe('FitLife - Premium Fitness Coaching');
    expect(updatedSession.fetchedWebsites[0].turnNumber).toBe(1);
  });

  it('sends message without website content when fetch fails', async () => {
    vi.mocked(generateChatResponse).mockResolvedValue({
      message: 'Sounds interesting, tell me more about your project.',
      stateUpdate: {
        coverage: { product_context: 0.0, functional: 0.0, aesthetics: 0.0 },
        extracted: {},
        contradictions: [],
        open_questions: [],
        assumptions: [],
        out_of_scope_topics: [],
      },
      reasoning: 'Starting discovery',
      isRecap: false,
      isFinal: false,
    });

    vi.mocked(fetchWebsiteContent).mockResolvedValue(null);

    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPostChat(session.sessionId, 'Look at https://broken.example.com');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.message).toBe('Sounds interesting, tell me more about your project.');

    const callArgs = vi.mocked(generateChatResponse).mock.calls[0][0];
    const lastMessage = callArgs.messages[callArgs.messages.length - 1];
    expect(lastMessage.content).toBe('Look at https://broken.example.com');
  });

  it('does not alter message when no URL is present', async () => {
    vi.mocked(generateChatResponse).mockResolvedValue({
      message: 'What problem does your product solve?',
      stateUpdate: {
        coverage: { product_context: 0.1, functional: 0.0, aesthetics: 0.0 },
        extracted: {},
        contradictions: [],
        open_questions: [],
        assumptions: [],
        out_of_scope_topics: [],
      },
      reasoning: 'Starting product context discovery',
      isRecap: false,
      isFinal: false,
    });

    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPostChat(session.sessionId, 'I want to build a fitness app');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.message).toBe('What problem does your product solve?');

    const callArgs = vi.mocked(generateChatResponse).mock.calls[0][0];
    const lastMessage = callArgs.messages[callArgs.messages.length - 1];
    expect(lastMessage.content).toBe('I want to build a fitness app');

    const updatedSession = store.getSession(session.sessionId);
    expect(updatedSession.fetchedWebsites).toHaveLength(0);
  });
});
