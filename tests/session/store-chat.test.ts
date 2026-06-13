import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SessionStore } from '../../lib/session/store';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-store-chat');

describe('SessionStore chat support', () => {
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

  it('getSession returns a previously created session', () => {
    const store = new SessionStore();
    const created = store.createSession();

    const retrieved = store.getSession(created.sessionId);
    expect(retrieved.sessionId).toBe(created.sessionId);
    expect(retrieved.projectId).toBe(created.projectId);
    expect(retrieved.chatHistory).toEqual([]);
    expect(retrieved.coverage).toEqual({
      productContext: 0.0,
      functional: 0.0,
      aesthetics: 0.0,
    });
  });

  it('getSession throws if session does not exist', () => {
    const store = new SessionStore();
    expect(() => store.getSession('non-existent-id')).toThrow();
  });

  it('updateSession persists changes to disk', () => {
    const store = new SessionStore();
    const session = store.createSession();

    const updated = {
      ...session,
      chatHistory: [
        {
          turnNumber: 1,
          role: 'user',
          content: 'Hello',
          contentType: 'text',
          timestamp: new Date().toISOString(),
        },
      ],
      coverage: {
        productContext: 0.2,
        functional: 0.1,
        aesthetics: 0.0,
      },
    };

    store.updateSession(updated);

    const retrieved = store.getSession(session.sessionId);
    expect(retrieved.chatHistory).toHaveLength(1);
    expect(retrieved.chatHistory[0].content).toBe('Hello');
    expect(retrieved.coverage).toEqual({
      productContext: 0.2,
      functional: 0.1,
      aesthetics: 0.0,
    });
  });
});
