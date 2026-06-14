import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const { mockUpsert } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ upsert: mockUpsert }),
  }),
}));

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-script');

function createSessionJson(dir: string, filename: string, data: Record<string, unknown>) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
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

describe('migrate-to-supabase script run function', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    fs.mkdirSync(TEST_SESSIONS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    vi.clearAllMocks();
  });

  it('migrates sessions and returns summary', async () => {
    mockUpsert.mockResolvedValue({ data: null, error: null, count: null });

    createSessionJson(TEST_SESSIONS_DIR, 's1.json', makeMinimalSession({ sessionId: 's1' }));
    createSessionJson(TEST_SESSIONS_DIR, 's2.json', makeMinimalSession({ sessionId: 's2' }));

    const { run } = await import('@/scripts/migrate-to-supabase');
    const result = await run({
      sessionsDir: TEST_SESSIONS_DIR,
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-key',
    });

    expect(result.total).toBe(2);
    expect(result.inserted).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.exitCode).toBe(0);
  });

  it('returns exitCode 1 when Supabase env vars are missing', async () => {
    const { run } = await import('@/scripts/migrate-to-supabase');
    const result = await run({
      sessionsDir: TEST_SESSIONS_DIR,
      supabaseUrl: '',
      supabaseKey: '',
    });

    expect(result.exitCode).toBe(1);
  });

  it('reports failed count when insert errors occur', async () => {
    mockUpsert.mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null });

    createSessionJson(TEST_SESSIONS_DIR, 's1.json', makeMinimalSession({ sessionId: 's1' }));

    const { run } = await import('@/scripts/migrate-to-supabase');
    const result = await run({
      sessionsDir: TEST_SESSIONS_DIR,
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-key',
    });

    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
  });
});
