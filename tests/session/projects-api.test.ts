import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-projects-api');

vi.mock('@/lib/llm/parse', () => ({
  parseIntakeText: vi.fn(),
}));

async function callPostProjects(formData?: FormData) {
  const { NextRequest } = await import('next/server');
  const fd = formData || new FormData();
  const request = new NextRequest('http://localhost:3000/api/projects', {
    method: 'POST',
    body: fd,
  });
  const { POST } = await import('@/app/api/projects/route');
  return POST(request);
}

describe('POST /api/projects', () => {
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

  it('sets metadata when client_name and project_name are provided', async () => {
    const formData = new FormData();
    formData.append('client_name', 'Acme Corp');
    formData.append('project_name', 'Mobile Redesign');

    const response = await callPostProjects(formData);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.initialState.metadata).toEqual({
      clientName: 'Acme Corp',
      projectName: 'Mobile Redesign',
    });

    // Verify persisted to disk
    const filePath = path.join(TEST_SESSIONS_DIR, `${body.sessionId}.json`);
    const session = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(session.metadata).toEqual({
      clientName: 'Acme Corp',
      projectName: 'Mobile Redesign',
    });
  });

  it('parses initial_text with LLM and populates structured brief', async () => {
    const { parseIntakeText } = await import('@/lib/llm/parse');

    vi.mocked(parseIntakeText).mockResolvedValue({
      product_context: {
        problem_statement: 'Users cannot track fitness goals',
        target_audience: ['Gym-goers'],
        user_needs: ['Progress tracking'],
        must_have_goals: ['Dashboard'],
      },
      functional: {
        features: ['Workout logging'],
      },
    });

    const formData = new FormData();
    formData.append('initial_text', 'I need a fitness tracking dashboard with workout logging.');

    const response = await callPostProjects(formData);
    expect(response.status).toBe(200);

    const body = await response.json();

    expect(parseIntakeText).toHaveBeenCalledWith('I need a fitness tracking dashboard with workout logging.');

    const brief = body.initialState.structuredBrief;
    expect(brief.product_context.problem_statement).toEqual({ value: 'Users cannot track fitness goals', citations: [] });
    expect(brief.product_context.target_audience).toEqual(['Gym-goers']);
    expect(brief.product_context.must_have_goals).toEqual(['Dashboard']);
    expect(brief.functional.features).toEqual(['Workout logging']);

    expect(body.initialState.coverage.productContext).toBeGreaterThan(0);
    expect(body.initialState.coverage.functional).toBeGreaterThan(0);
  });

  it('parses requirement_doc file with LLM and populates structured brief', async () => {
    const { parseIntakeText } = await import('@/lib/llm/parse');

    vi.mocked(parseIntakeText).mockResolvedValue({
      product_context: {
        problem_statement: 'Mobile app is slow and crashes frequently',
        target_audience: ['Mobile users'],
      },
    });

    const fileContent = 'Our mobile app is slow and crashes frequently. We need a complete redesign.';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('requirement_doc', blob, 'requirements.txt');

    const response = await callPostProjects(formData);
    expect(response.status).toBe(200);

    const body = await response.json();

    expect(parseIntakeText).toHaveBeenCalledWith(fileContent);

    const brief = body.initialState.structuredBrief;
    expect(brief.product_context.problem_statement).toEqual({ value: 'Mobile app is slow and crashes frequently', citations: [] });
    expect(brief.product_context.target_audience).toEqual(['Mobile users']);
    expect(body.initialState.coverage.productContext).toBeGreaterThan(0);
  });

  it('does not call LLM parser when neither text nor file is provided', async () => {
    const { parseIntakeText } = await import('@/lib/llm/parse');

    const formData = new FormData();
    formData.append('client_name', 'Acme Corp');

    const response = await callPostProjects(formData);
    expect(response.status).toBe(200);
    expect(parseIntakeText).not.toHaveBeenCalled();
  });

  it('returns defaults with parseError when LLM parsing fails', async () => {
    const { parseIntakeText } = await import('@/lib/llm/parse');

    vi.mocked(parseIntakeText).mockRejectedValue(new Error('LLM timeout'));

    const formData = new FormData();
    formData.append('initial_text', 'Build me a dashboard');

    const response = await callPostProjects(formData);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.parseError).toBe(true);
    expect(body.initialState.structuredBrief.approval_status).toBe('draft');
    expect(body.initialState.coverage).toEqual({
      productContext: 0.0,
      functional: 0.0,
      aesthetics: 0.0,
    });
    expect(body.initialState.metadata.clientName).toBe('');
  });

  it('persists shareableUrl in the session file on disk', async () => {
    const formData = new FormData();
    formData.append('client_name', 'Acme Corp');

    const response = await callPostProjects(formData);
    const body = await response.json();

    const filePath = path.join(TEST_SESSIONS_DIR, `${body.sessionId}.json`);
    const session = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(session.shareableUrl).toBe(`/session/${body.sessionId}`);
    expect(session.shareableUrl).toBe(body.shareableUrl);
  });

  it('uses file content over initial_text when both are provided', async () => {
    const { parseIntakeText } = await import('@/lib/llm/parse');

    vi.mocked(parseIntakeText).mockResolvedValue({});

    const blob = new Blob(['File content takes priority'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('initial_text', 'This text should be ignored');
    formData.append('requirement_doc', blob, 'spec.txt');

    const response = await callPostProjects(formData);
    expect(response.status).toBe(200);
    expect(parseIntakeText).toHaveBeenCalledWith('File content takes priority');
    expect(parseIntakeText).not.toHaveBeenCalledWith('This text should be ignored');
  });

  it('creates a session with no fields and returns correct response shape', async () => {
    const response = await callPostProjects();
    expect(response.status).toBe(200);

    const body = await response.json();

    // Top-level response keys
    expect(body).toHaveProperty('projectId');
    expect(typeof body.projectId).toBe('string');
    expect(body.projectId.length).toBeGreaterThan(0);

    expect(body).toHaveProperty('sessionId');
    expect(typeof body.sessionId).toBe('string');
    expect(body.sessionId.length).toBeGreaterThan(0);

    expect(body).toHaveProperty('shareableUrl');
    expect(typeof body.shareableUrl).toBe('string');
    expect(body.shareableUrl).toContain(body.sessionId);

    expect(body).toHaveProperty('initialState');
    expect(typeof body.initialState).toBe('object');

    // initialState is the full session object
    const state = body.initialState;
    expect(state.sessionId).toBe(body.sessionId);
    expect(state.projectId).toBe(body.projectId);
    expect(state.status).toBe('in_discovery');
    expect(state.metadata).toEqual({ clientName: '', projectName: '' });
    expect(state.chatHistory).toEqual([]);
    expect(state.coverage).toEqual({
      productContext: 0.0,
      functional: 0.0,
      aesthetics: 0.0,
    });
    expect(state.structuredBrief.approval_status).toBe('draft');

    // Verify session file exists on disk
    const filePath = path.join(TEST_SESSIONS_DIR, `${body.sessionId}.json`);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
