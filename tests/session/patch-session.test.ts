import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionStore } from '@/lib/session/store';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-patch');

async function callPatchSession(sessionId: string, body: { action: string }) {
  const { PATCH } = await import('@/app/api/session/[id]/route');
  const { NextRequest } = await import('next/server');
  const request = new NextRequest(`http://localhost:3000/api/session/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id: sessionId }) });
}

describe('PATCH /api/session/[id]', () => {
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

  it('approve: transitions session status to approved and sets brief approval_status to approved', async () => {
    const store = new SessionStore();
    const session = store.createSeededSession({
      structuredBrief: (() => {
        const defaults = JSON.parse(JSON.stringify(store.createSession().structuredBrief));
        defaults.approval_status = 'draft';
        return defaults;
      })(),
    });

    // Set session to brief_ready so it can be approved
    session.status = 'brief_ready';
    store.updateSession(session);

    const response = await callPatchSession(session.sessionId, { action: 'approve' });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('approved');

    const updated = store.getSession(session.sessionId);
    expect(updated.status).toBe('approved');
    expect(updated.structuredBrief.approval_status).toBe('approved');
  });

  it('approve: rejects when session is not in brief_ready state', async () => {
    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPatchSession(session.sessionId, { action: 'approve' });
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toContain('brief_ready');
  });

  it('revise: transitions session status back to in_discovery', async () => {
    const store = new SessionStore();
    const session = store.createSession();
    session.status = 'brief_ready';
    store.updateSession(session);

    const response = await callPatchSession(session.sessionId, { action: 'revise' });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('in_discovery');

    const updated = store.getSession(session.sessionId);
    expect(updated.status).toBe('in_discovery');
  });

  it('revise: rejects when session is not in brief_ready state', async () => {
    const store = new SessionStore();
    const session = store.createSession();

    const response = await callPatchSession(session.sessionId, { action: 'revise' });
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toContain('brief_ready');
  });

  it('returns 400 for invalid action', async () => {
    const store = new SessionStore();
    const session = store.createSession();
    session.status = 'brief_ready';
    store.updateSession(session);

    const response = await callPatchSession(session.sessionId, { action: 'invalid' });
    expect(response.status).toBe(400);
  });
});
