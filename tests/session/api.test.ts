import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GET } from '../../app/api/session/route';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-api');

async function callGetSession() {
  const request = new Request('http://localhost:3000/api/session');
  return GET(request);
}

describe('GET /api/session', () => {
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

  it('creates a session file on disk and returns session id', async () => {
    const response = await callGetSession();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.sessionId).toBeDefined();
    expect(typeof body.sessionId).toBe('string');
    expect(body.sessionId.length).toBeGreaterThan(0);

    const filePath = path.join(TEST_SESSIONS_DIR, `${body.sessionId}.json`);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('created file matches PRD schema exactly with empty defaults', async () => {
    const response = await callGetSession();
    const body = await response.json();
    const filePath = path.join(TEST_SESSIONS_DIR, `${body.sessionId}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const session = JSON.parse(fileContent);

    // Top-level metadata fields
    expect(session).toHaveProperty('sessionId');
    expect(session).toHaveProperty('projectId');
    expect(session).toHaveProperty('status', 'in_discovery');
    expect(session).toHaveProperty('createdAt');
    expect(session).toHaveProperty('updatedAt');
    expect(session).toHaveProperty('shareableUrl');
    expect(typeof session.shareableUrl).toBe('string');

    // Metadata object
    expect(session).toHaveProperty('metadata');
    expect(session.metadata).toHaveProperty('clientName', '');
    expect(session.metadata).toHaveProperty('projectName', '');

    // Chat history
    expect(session).toHaveProperty('chatHistory');
    expect(Array.isArray(session.chatHistory)).toBe(true);
    expect(session.chatHistory).toHaveLength(0);

    // Coverage
    expect(session).toHaveProperty('coverage');
    expect(session.coverage).toEqual({
      productContext: 0.0,
      functional: 0.0,
      aesthetics: 0.0,
    });

    // Arrays
    expect(session).toHaveProperty('contradictions');
    expect(Array.isArray(session.contradictions)).toBe(true);
    expect(session.contradictions).toHaveLength(0);

    expect(session).toHaveProperty('assumptions');
    expect(Array.isArray(session.assumptions)).toBe(true);
    expect(session.assumptions).toHaveLength(0);

    expect(session).toHaveProperty('openQuestions');
    expect(Array.isArray(session.openQuestions)).toBe(true);
    expect(session.openQuestions).toHaveLength(0);

    expect(session).toHaveProperty('recapHistory');
    expect(Array.isArray(session.recapHistory)).toBe(true);
    expect(session.recapHistory).toHaveLength(0);

    expect(session).toHaveProperty('lastRecapTurn', 0);

    expect(session).toHaveProperty('outOfScopeTopics');
    expect(Array.isArray(session.outOfScopeTopics)).toBe(true);
    expect(session.outOfScopeTopics).toHaveLength(0);

    expect(session).toHaveProperty('llmReasoning', '');

    expect(session).toHaveProperty('briefMarkdown', '');

    expect(session).toHaveProperty('uploadedImages');
    expect(Array.isArray(session.uploadedImages)).toBe(true);
    expect(session.uploadedImages).toHaveLength(0);

    // Structured brief - all fields present with empty defaults
    expect(session).toHaveProperty('structuredBrief');
    const brief = session.structuredBrief;

    // Product context
    expect(brief).toHaveProperty('product_context');
    const pc = brief.product_context;
    expect(pc).toHaveProperty('problem_statement');
    expect(pc.problem_statement).toEqual({ value: '', citations: [] });
    expect(pc).toHaveProperty('target_audience');
    expect(Array.isArray(pc.target_audience)).toBe(true);
    expect(pc).toHaveProperty('user_needs');
    expect(Array.isArray(pc.user_needs)).toBe(true);
    expect(pc).toHaveProperty('use_context');
    expect(pc.use_context).toEqual({ value: '', citations: [] });
    expect(pc).toHaveProperty('success_definition');
    expect(pc.success_definition).toEqual({ value: '', citations: [] });
    expect(pc).toHaveProperty('product_boundaries');
    expect(Array.isArray(pc.product_boundaries)).toBe(true);
    expect(pc).toHaveProperty('must_have_goals');
    expect(Array.isArray(pc.must_have_goals)).toBe(true);
    expect(pc).toHaveProperty('nice_to_have_goals');
    expect(Array.isArray(pc.nice_to_have_goals)).toBe(true);

    // Functional
    expect(brief).toHaveProperty('functional');
    const fn = brief.functional;
    expect(fn).toHaveProperty('user_segments');
    expect(Array.isArray(fn.user_segments)).toBe(true);
    expect(fn).toHaveProperty('jobs_to_be_done');
    expect(Array.isArray(fn.jobs_to_be_done)).toBe(true);
    expect(fn).toHaveProperty('current_workflows');
    expect(Array.isArray(fn.current_workflows)).toBe(true);
    expect(fn).toHaveProperty('desired_workflows');
    expect(Array.isArray(fn.desired_workflows)).toBe(true);
    expect(fn).toHaveProperty('features');
    expect(Array.isArray(fn.features)).toBe(true);
    expect(fn).toHaveProperty('system_behaviors');
    expect(Array.isArray(fn.system_behaviors)).toBe(true);
    expect(fn).toHaveProperty('integrations');
    expect(Array.isArray(fn.integrations)).toBe(true);
    expect(fn).toHaveProperty('data_entities');
    expect(Array.isArray(fn.data_entities)).toBe(true);
    expect(fn).toHaveProperty('roles_permissions');
    expect(Array.isArray(fn.roles_permissions)).toBe(true);
    expect(fn).toHaveProperty('edge_cases');
    expect(Array.isArray(fn.edge_cases)).toBe(true);
    expect(fn).toHaveProperty('acceptance_criteria');
    expect(Array.isArray(fn.acceptance_criteria)).toBe(true);

    // Aesthetics
    expect(brief).toHaveProperty('aesthetics');
    const ae = brief.aesthetics;
    expect(ae).toHaveProperty('brand_personality');
    expect(Array.isArray(ae.brand_personality)).toBe(true);
    expect(ae).toHaveProperty('tone_of_voice');
    expect(ae.tone_of_voice).toEqual({ value: '', citations: [] });
    expect(ae).toHaveProperty('desired_emotions');
    expect(Array.isArray(ae.desired_emotions)).toBe(true);
    expect(ae).toHaveProperty('visual_style_keywords');
    expect(Array.isArray(ae.visual_style_keywords)).toBe(true);
    expect(ae).toHaveProperty('reference_products');
    expect(Array.isArray(ae.reference_products)).toBe(true);
    expect(ae).toHaveProperty('liked_patterns');
    expect(Array.isArray(ae.liked_patterns)).toBe(true);
    expect(ae).toHaveProperty('disliked_patterns');
    expect(Array.isArray(ae.disliked_patterns)).toBe(true);
    expect(ae).toHaveProperty('color_preferences');
    expect(Array.isArray(ae.color_preferences)).toBe(true);
    expect(ae).toHaveProperty('color_avoidances');
    expect(Array.isArray(ae.color_avoidances)).toBe(true);
    expect(ae).toHaveProperty('typography_direction');
    expect(Array.isArray(ae.typography_direction)).toBe(true);
    expect(ae).toHaveProperty('imagery_direction');
    expect(Array.isArray(ae.imagery_direction)).toBe(true);
    expect(ae).toHaveProperty('interaction_principles');
    expect(Array.isArray(ae.interaction_principles)).toBe(true);
    expect(ae).toHaveProperty('accessibility_expectations');
    expect(Array.isArray(ae.accessibility_expectations)).toBe(true);
    expect(ae).toHaveProperty('ui_constraints');
    expect(Array.isArray(ae.ui_constraints)).toBe(true);

    // Brief top-level
    expect(brief).toHaveProperty('assumptions');
    expect(Array.isArray(brief.assumptions)).toBe(true);
    expect(brief).toHaveProperty('risks_to_product_fit');
    expect(Array.isArray(brief.risks_to_product_fit)).toBe(true);
    expect(brief).toHaveProperty('open_questions');
    expect(Array.isArray(brief.open_questions)).toBe(true);
    expect(brief).toHaveProperty('out_of_scope_topics');
    expect(Array.isArray(brief.out_of_scope_topics)).toBe(true);
    expect(brief).toHaveProperty('approval_status', 'draft');
  });
});
