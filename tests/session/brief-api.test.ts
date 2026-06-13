import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionStore } from '@/lib/session/store';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-brief');

async function callGetBrief(sessionId: string) {
  const { GET } = await import('@/app/api/session/[id]/brief/route');
  const request = new Request(`http://localhost:3000/api/session/${sessionId}/brief`);
  return GET(request, { params: Promise.resolve({ id: sessionId }) });
}

describe('GET /api/session/[id]/brief', () => {
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

  it('returns the brief markdown as a downloadable file when brief is ready', async () => {
    const store = new SessionStore();
    const session = store.createSession();
    session.status = 'brief_ready';
    session.briefMarkdown = '# Structured Discovery Brief\n\n## Product Context\n\nSome content\n';
    store.updateSession(session);

    const response = await callGetBrief(session.sessionId);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown');
    expect(response.headers.get('Content-Disposition')).toContain('attachment');
    expect(response.headers.get('Content-Disposition')).toContain('.md');

    const body = await response.text();
    expect(body).toBe('# Structured Discovery Brief\n\n## Product Context\n\nSome content\n');
  });

  it('returns 404 when brief markdown is not yet generated', async () => {
    const store = new SessionStore();
    const session = store.createSession();

    const response = await callGetBrief(session.sessionId);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toContain('not yet available');
  });

  it('returns the brief when approved', async () => {
    const store = new SessionStore();
    const session = store.createSession();
    session.status = 'approved';
    session.briefMarkdown = '# Approved Brief\n\nApproved content\n';
    store.updateSession(session);

    const response = await callGetBrief(session.sessionId);
    expect(response.status).toBe(200);

    const body = await response.text();
    expect(body).toBe('# Approved Brief\n\nApproved content\n');
  });
});
