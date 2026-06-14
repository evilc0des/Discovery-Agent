import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

import { readSessionsFromDisk, migrateSessions } from '@/lib/session/migrate';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-migrate');

function createSessionJson(filename: string, data: Record<string, unknown>) {
  fs.writeFileSync(
    path.join(TEST_SESSIONS_DIR, filename),
    JSON.stringify(data, null, 2),
  );
}

function makeMinimalSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sessionId: '00000000-0000-0000-0000-000000000001',
    projectId: '11111111-1111-1111-1111-111111111111',
    status: 'in_discovery',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    shareableUrl: '',
    metadata: { clientName: '', projectName: '' },
    chatHistory: [],
    structuredBrief: {
      product_context: { problem_statement: { value: '', citations: [] }, target_audience: [], user_needs: [], use_context: { value: '', citations: [] }, success_definition: { value: '', citations: [] }, product_boundaries: [], must_have_goals: [], nice_to_have_goals: [] },
      functional: { user_segments: [], jobs_to_be_done: [], current_workflows: [], desired_workflows: [], features: [], system_behaviors: [], integrations: [], data_entities: [], roles_permissions: [], edge_cases: [], acceptance_criteria: [] },
      aesthetics: { brand_personality: [], tone_of_voice: { value: '', citations: [] }, desired_emotions: [], visual_style_keywords: [], reference_products: [], liked_patterns: [], disliked_patterns: [], color_preferences: [], color_avoidances: [], typography_direction: [], imagery_direction: [], interaction_principles: [], accessibility_expectations: [], ui_constraints: [] },
      assumptions: [], risks_to_product_fit: [], open_questions: [], out_of_scope_topics: [], approval_status: 'draft',
    },
    coverage: { productContext: 0, functional: 0, aesthetics: 0 },
    contradictions: [],
    assumptions: [],
    openQuestions: [],
    recapHistory: [],
    lastRecapTurn: 0,
    outOfScopeTopics: [],
    llmReasoning: '',
    briefMarkdown: '',
    uploadedImages: [],
    fetchedWebsites: [],
    ...overrides,
  };
}

describe('readSessionsFromDisk', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    fs.mkdirSync(TEST_SESSIONS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
  });

  it('reads all .json files and parses them as sessions', async () => {
    createSessionJson('session-1.json', makeMinimalSession({ sessionId: 'aaa', projectId: 'proj-a' }));
    createSessionJson('session-2.json', makeMinimalSession({ sessionId: 'bbb', projectId: 'proj-b' }));

    const sessions = await readSessionsFromDisk(TEST_SESSIONS_DIR);

    expect(sessions).toHaveLength(2);
    expect(sessions[0].sessionId).toBe('aaa');
    expect(sessions[1].sessionId).toBe('bbb');
  });

  it('applies defaults for missing briefMarkdown and fetchedWebsites fields', async () => {
    const data = makeMinimalSession({ sessionId: 'incomplete' });
    delete data.briefMarkdown;
    delete data.fetchedWebsites;
    createSessionJson('incomplete.json', data);

    const sessions = await readSessionsFromDisk(TEST_SESSIONS_DIR);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].briefMarkdown).toBe('');
    expect(sessions[0].fetchedWebsites).toEqual([]);
  });

  it('skips non-JSON files in the directory', async () => {
    createSessionJson('valid.json', makeMinimalSession({ sessionId: 'valid' }));
    fs.writeFileSync(path.join(TEST_SESSIONS_DIR, 'notes.txt'), 'not a session');

    const sessions = await readSessionsFromDisk(TEST_SESSIONS_DIR);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('valid');
  });

  it('skips empty sessions directory gracefully', async () => {
    const sessions = await readSessionsFromDisk(TEST_SESSIONS_DIR);
    expect(sessions).toHaveLength(0);
  });

  it('skips files with invalid JSON', async () => {
    createSessionJson('valid.json', makeMinimalSession({ sessionId: 'valid' }));
    fs.writeFileSync(path.join(TEST_SESSIONS_DIR, 'bad.json'), '{ not valid json');

    const sessions = await readSessionsFromDisk(TEST_SESSIONS_DIR);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('valid');
  });
});

describe('migrateSessions', () => {
  let mockUpsert: ReturnType<typeof vi.fn>;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    mockUpsert = vi.fn();
    const mockFrom = vi.fn(() => ({
      upsert: mockUpsert,
    }));

    mockClient = {
      from: mockFrom,
    } as unknown as SupabaseClient;
  });

  it('inserts sessions and returns inserted count', async () => {
    mockUpsert.mockResolvedValue({ data: null, error: null, count: null });

    const sessions = [
      makeMinimalSession({ sessionId: 's1', projectId: 'p1' }),
      makeMinimalSession({ sessionId: 's2', projectId: 'p2' }),
    ] as any[];

    const result = await migrateSessions(mockClient, sessions);

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertArgs = mockUpsert.mock.calls[0];
    expect(upsertArgs[0]).toHaveLength(2);
    expect(upsertArgs[0][0].id).toBe('s1');
    expect(upsertArgs[0][1].id).toBe('s2');
    expect(upsertArgs[1]).toEqual({ onConflict: 'id', ignoreDuplicates: true });

    expect(result).toEqual({ total: 2, inserted: 2, skipped: 0, failed: 0 });
  });

  it('returns zero counts for empty session list', async () => {
    mockUpsert.mockResolvedValue({ data: null, error: null, count: null });

    const result = await migrateSessions(mockClient, []);

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, inserted: 0, skipped: 0, failed: 0 });
  });

  it('counts failed when upsert throws', async () => {
    mockUpsert.mockRejectedValue(new Error('Connection refused'));

    const sessions = [makeMinimalSession({ sessionId: 's1' })] as any[];

    const result = await migrateSessions(mockClient, sessions);

    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.inserted).toBe(0);
  });
});
