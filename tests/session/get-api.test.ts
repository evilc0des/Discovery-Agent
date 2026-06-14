import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionStore } from '@/lib/session/store';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-get');

async function callGetSession(sessionId: string) {
  const { GET } = await import('@/app/api/session/[id]/route');
  const request = new Request(`http://localhost:3000/api/session/${sessionId}`);
  return GET(request, { params: Promise.resolve({ id: sessionId }) });
}

describe('GET /api/session/[id]', () => {
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
  });

  it('returns session data for existing session', async () => {
    const store = new SessionStore();
    const session = await store.createSession();

    const response = await callGetSession(session.sessionId);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.sessionId).toBe(session.sessionId);
    expect(body.chatHistory).toEqual([]);
    expect(body.coverage).toEqual({
      productContext: 0.0,
      functional: 0.0,
      aesthetics: 0.0,
    });
  });

  it('returns 404 for non-existent session', async () => {
    const response = await callGetSession('non-existent-id');
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Session not found');
  });
});
