import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionStore } from '@/lib/session/store';
import { generateChatResponse, generateFallbackResponse } from '@/lib/llm/chat';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-chat-api');

vi.mock('@/lib/llm/chat', () => ({
  generateChatResponse: vi.fn(),
  generateFallbackResponse: vi.fn(),
}));

function makeMockStreamResult(
  message: string,
  stateUpdate: {
    coverage: { product_context: number; functional: number; aesthetics: number };
    extracted?: Record<string, unknown>;
    contradictions?: string[];
    open_questions?: string[];
    assumptions?: string[];
    out_of_scope_topics?: Array<{ topic: string; turn_number: number; client_quote: string }>;
  },
  isRecap = false,
  isFinal = false,
) {
  const finalObject = {
    message,
    state_update: {
      coverage: stateUpdate.coverage,
      extracted: stateUpdate.extracted ?? {},
      contradictions: stateUpdate.contradictions ?? [],
      open_questions: stateUpdate.open_questions ?? [],
      assumptions: stateUpdate.assumptions ?? [],
      out_of_scope_topics: stateUpdate.out_of_scope_topics ?? [],
    },
    reasoning: 'test reasoning',
    is_recap: isRecap,
    is_final: isFinal,
  };

  async function* generatePartials() {
    yield { message: '', state_update: { coverage: stateUpdate.coverage } };
    yield { message, state_update: finalObject.state_update, reasoning: 'test reasoning', is_recap: isRecap, is_final: isFinal };
  }

  return {
    partialObjectStream: generatePartials(),
    object: Promise.resolve(finalObject),
  };
}

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

async function readStreamBody(response: Response): Promise<string[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const lines: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lines.push(decoder.decode(value, { stream: true }));
  }
  return lines.filter((l) => l.trim().length > 0);
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

  it('streams NDJSON response and updates session file', async () => {
    const mockCoverage = { product_context: 0.1, functional: 0.0, aesthetics: 0.0 };
    vi.mocked(generateChatResponse).mockResolvedValue(
      makeMockStreamResult('What problem does your product solve?', {
        coverage: mockCoverage,
        open_questions: ['What problem does your product solve?'],
      }),
    );

    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPostChat(session.sessionId, 'I want to build a fitness app');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');

    const lines = await readStreamBody(response);
    expect(lines.length).toBeGreaterThanOrEqual(2);

    const lastLine = JSON.parse(lines[lines.length - 1]);
    expect(lastLine.message).toBe('What problem does your product solve?');

    const updatedSession = store.getSession(session.sessionId);
    expect(updatedSession.chatHistory).toHaveLength(2);
    expect(updatedSession.chatHistory[0].role).toBe('user');
    expect(updatedSession.chatHistory[1].role).toBe('assistant');
    expect(updatedSession.chatHistory[1].content).toBe('What problem does your product solve?');
    expect(updatedSession.coverage).toEqual({
      productContext: 0.1,
      functional: 0.0,
      aesthetics: 0.0,
    });
  });

  it('passes turnsSinceLastRecap to generateChatResponse', async () => {
    const mockCoverage = { product_context: 0.2, functional: 0.0, aesthetics: 0.0 };
    vi.mocked(generateChatResponse).mockResolvedValue(
      makeMockStreamResult('Tell me more about your users.', { coverage: mockCoverage }),
    );

    const store = new SessionStore();
    const session = store.createSeededSession({
      sessionId: 'test-recap-session',
    });

    session.chatHistory = [
      { role: 'user', content: 'msg1', turnNumber: 1, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'resp1', turnNumber: 2, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'user', content: 'msg2', turnNumber: 3, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'resp2', turnNumber: 4, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'user', content: 'msg3', turnNumber: 5, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'resp3', turnNumber: 6, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'user', content: 'msg4', turnNumber: 7, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'resp4', turnNumber: 8, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'user', content: 'msg5', turnNumber: 9, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'resp5', turnNumber: 10, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'user', content: 'msg6', turnNumber: 11, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'resp6', turnNumber: 12, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'user', content: 'msg7', turnNumber: 13, contentType: 'text', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'resp7', turnNumber: 14, contentType: 'text', timestamp: new Date().toISOString() },
    ];
    session.lastRecapTurn = 0;
    store.updateSession(session);

    await callPostChat(session.sessionId, 'And one more thing...');

    expect(generateChatResponse).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(generateChatResponse).mock.calls[0][0];
    expect(callArgs.turnsSinceLastRecap).toBe(15);
  });

  it('updates lastRecapTurn and recapHistory when LLM produces a recap', async () => {
    const mockCoverage = { product_context: 0.5, functional: 0.3, aesthetics: 0.1 };
    vi.mocked(generateChatResponse).mockResolvedValue(
      makeMockStreamResult(
        'Here is a recap of what we have covered so far...',
        {
          coverage: mockCoverage,
          contradictions: ['Client said X then said Y'],
          open_questions: ['Still unclear about Z'],
          assumptions: ['Assuming web-based'],
        },
        true,
        false,
      ),
    );

    const store = new SessionStore();
    const session = store.createSession();

    await callPostChat(session.sessionId, 'initial message');

    const updated = store.getSession(session.sessionId);
    expect(updated.lastRecapTurn).toBe(2);
    expect(updated.recapHistory).toHaveLength(1);
    expect(updated.recapHistory[0].turnNumber).toBe(2);
    expect(updated.contradictions).toEqual(['Client said X then said Y']);
    expect(updated.openQuestions).toEqual(['Still unclear about Z']);
    expect(updated.assumptions).toEqual(['Assuming web-based']);
  });

  it('does NOT update lastRecapTurn when LLM response is not a recap', async () => {
    const mockCoverage = { product_context: 0.1, functional: 0.0, aesthetics: 0.0 };
    vi.mocked(generateChatResponse).mockResolvedValue(
      makeMockStreamResult('What features do you need?', { coverage: mockCoverage }, false, false),
    );

    const store = new SessionStore();
    const session = store.createSession();

    await callPostChat(session.sessionId, 'I want an app');

    const updated = store.getSession(session.sessionId);
    expect(updated.lastRecapTurn).toBe(0);
    expect(updated.recapHistory).toHaveLength(0);
  });

  it('transitions status to brief_ready and generates briefMarkdown when is_final is true', async () => {
    const mockCoverage = { product_context: 0.8, functional: 0.7, aesthetics: 0.9 };
    vi.mocked(generateChatResponse).mockResolvedValue(
      makeMockStreamResult(
        'I believe we have enough to produce a structured brief. Are you ready to review it?',
        { coverage: mockCoverage },
        false,
        true,
      ),
    );

    const store = new SessionStore();
    const session = store.createSession();
    session.structuredBrief.product_context.problem_statement.value = 'A test problem';
    store.updateSession(session);

    const response = await callPostChat(session.sessionId, 'I think we are done');
    expect(response.status).toBe(200);

    const updated = store.getSession(session.sessionId);
    expect(updated.status).toBe('brief_ready');
    expect(updated.briefMarkdown).toBeTruthy();
    expect(updated.briefMarkdown).toContain('# Structured Discovery Brief');
    expect(updated.briefMarkdown).toContain('A test problem');
  });

  it('generates briefMarkdown with early stop warning when coverage is insufficient', async () => {
    const mockCoverage = { product_context: 0.3, functional: 0.2, aesthetics: 0.1 };
    vi.mocked(generateChatResponse).mockResolvedValue(
      makeMockStreamResult(
        'I will generate the brief now, but note some areas are incomplete.',
        { coverage: mockCoverage },
        false,
        true,
      ),
    );

    const store = new SessionStore();
    const session = store.createSession();
    session.coverage = { productContext: 0.3, functional: 0.2, aesthetics: 0.1 };
    session.structuredBrief.product_context.problem_statement.value = 'A test problem';
    store.updateSession(session);

    const response = await callPostChat(session.sessionId, 'stop now please');
    expect(response.status).toBe(200);

    const updated = store.getSession(session.sessionId);
    expect(updated.status).toBe('brief_ready');
    expect(updated.briefMarkdown).toContain('**Warning**');
    expect(updated.briefMarkdown).toContain('incomplete');
  });

  it('falls back to text-only when LLM fails twice and returns JSON', async () => {
    vi.mocked(generateChatResponse).mockRejectedValue(new Error('LLM failure'));
    vi.mocked(generateFallbackResponse).mockResolvedValue(
      'I am having trouble processing that. Could you tell me more?',
    );

    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPostChat(session.sessionId, 'I want to build a fitness app');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.message).toBe('I am having trouble processing that. Could you tell me more?');
    expect(body.fallback).toBe(true);

    const updatedSession = store.getSession(session.sessionId);
    expect(updatedSession.chatHistory).toHaveLength(2);
    expect(updatedSession.coverage).toEqual({
      productContext: 0.0,
      functional: 0.0,
      aesthetics: 0.0,
    });
  });
});
