import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionStore } from '@/lib/session/store';
import { generateChatResponse, generateFallbackResponse } from '@/lib/llm/chat';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-chat-api');

// Mock the LLM module so tests don't call OpenAI
vi.mock('@/lib/llm/chat', () => ({
  generateChatResponse: vi.fn(),
  generateFallbackResponse: vi.fn(),
}));

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

describe('POST /api/session/[id]/chat', () => {
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

  it('returns a chat response and updates session file', async () => {
    vi.mocked(generateChatResponse).mockResolvedValue({
      message: 'What problem does your product solve?',
      stateUpdate: {
        coverage: {
          product_context: 0.1,
          functional: 0.0,
          aesthetics: 0.0,
        },
        extracted: {},
        contradictions: [],
        open_questions: ['What problem does your product solve?'],
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
    expect(body.coverage).toEqual({
      productContext: 0.1,
      functional: 0.0,
      aesthetics: 0.0,
    });

    // Verify session file updated
    const updatedSession = store.getSession(session.sessionId);
    expect(updatedSession.chatHistory).toHaveLength(2);
    expect(updatedSession.chatHistory[0].role).toBe('user');
    expect(updatedSession.chatHistory[0].content).toBe('I want to build a fitness app');
    expect(updatedSession.chatHistory[1].role).toBe('assistant');
    expect(updatedSession.chatHistory[1].content).toBe('What problem does your product solve?');
    expect(updatedSession.coverage).toEqual({
      productContext: 0.1,
      functional: 0.0,
      aesthetics: 0.0,
    });
  });

  it('falls back to text-only when LLM fails twice and still updates chatHistory', async () => {
    vi.mocked(generateChatResponse).mockRejectedValue(new Error('LLM failure'));
    vi.mocked(generateFallbackResponse).mockResolvedValue('I am having trouble processing that. Could you tell me more about what you are trying to build?');

    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPostChat(session.sessionId, 'I want to build a fitness app');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.message).toBe('I am having trouble processing that. Could you tell me more about what you are trying to build?');
    expect(body.fallback).toBe(true);

    // Verify session file updated with fallback response
    const updatedSession = store.getSession(session.sessionId);
    expect(updatedSession.chatHistory).toHaveLength(2);
    expect(updatedSession.chatHistory[0].role).toBe('user');
    expect(updatedSession.chatHistory[1].role).toBe('assistant');
    expect(updatedSession.chatHistory[1].content).toBe(body.message);
    // Coverage should not update on fallback
    expect(updatedSession.coverage).toEqual({
      productContext: 0.0,
      functional: 0.0,
      aesthetics: 0.0,
    });
  });
});
