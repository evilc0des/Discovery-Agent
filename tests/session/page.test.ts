import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-page');

describe('/session page', () => {
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

  it('redirects to /session/{id} when visited', async () => {
    const { default: SessionPage } = await import('../../app/session/page');

    try {
      await SessionPage();
      expect.fail('Expected redirect but none was thrown');
    } catch (error: any) {
      // Next.js redirect throws a special error with digest in format:
      // NEXT_REDIRECT;{type};{url};{statusCode};
      const digest = error.digest || '';
      if (!digest.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      const parts = digest.split(';');
      const url = parts[2];
      expect(url).toMatch(/^\/session\/[\w-]+$/);
    }
  });
});
