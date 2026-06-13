import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockStreamObject, mockGenerateText } = vi.hoisted(() => ({
  mockStreamObject: vi.fn(),
  mockGenerateText: vi.fn(),
}));

vi.mock('ai', () => ({
  streamObject: mockStreamObject,
  generateObject: mockStreamObject,
  generateText: mockGenerateText,
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => model),
}));

import { systemPrompt, buildSystemPrompt, generateChatResponse, generateFallbackResponse } from '@/lib/llm/chat';
import { createDefaultStructuredBrief } from '@/lib/session/schema';

describe('system prompt', () => {
  it('contains forbidden technical topics guidance', () => {
    expect(systemPrompt).toContain('Never ask technical or implementation questions');
    expect(systemPrompt).toContain('Technology stack');
    expect(systemPrompt).toContain('Database design');
    expect(systemPrompt).toContain('API design');
    expect(systemPrompt).toContain('Server architecture');
    expect(systemPrompt).toContain('Authentication mechanisms');
    expect(systemPrompt).toContain('Performance optimization');
    expect(systemPrompt).toContain('Code structure');
  });
});

describe('buildSystemPrompt', () => {
  const coverage = { productContext: 0.3, functional: 0.1, aesthetics: 0.0 };

  it('includes coverage scores', () => {
    const prompt = buildSystemPrompt(0, coverage);
    expect(prompt).toContain('Current coverage scores');
    expect(prompt).toContain('Product Context 0.3');
  });

  it('does NOT include recap reminder when turnsSinceLastRecap < 7', () => {
    const prompt = buildSystemPrompt(3, coverage);
    expect(prompt).not.toContain('turns since your last recap');
  });

  it('includes recap nudge when turnsSinceLastRecap >= 7', () => {
    const prompt = buildSystemPrompt(7, coverage);
    expect(prompt).toContain('turns since your last recap');
    expect(prompt).toContain('natural break');
  });
});

describe('generateChatResponse', () => {
  const mockPartialStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { message: 'partial...', state_update: { coverage: { product_context: 0.1, functional: 0, aesthetics: 0 } } };
    },
  };

  const mockFinalObject = {
    message: 'What problem does your product solve?',
    state_update: {
      coverage: { product_context: 0.1, functional: 0, aesthetics: 0 },
      extracted: {},
      contradictions: [],
      open_questions: [],
      assumptions: [],
      out_of_scope_topics: [],
    },
    reasoning: 'Starting discovery',
    is_recap: false,
    is_final: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamObject.mockReturnValue({
      partialObjectStream: mockPartialStream,
      object: Promise.resolve(mockFinalObject),
    });
  });

  it('uses streamObject with the discovery schema and system prompt', async () => {
    const brief = createDefaultStructuredBrief();
    await generateChatResponse({
      sessionId: 'test-1',
      messages: [{ role: 'user', content: 'I want to build a fitness app' }],
      currentBrief: brief,
      currentCoverage: { productContext: 0, functional: 0, aesthetics: 0 },
    });

    expect(mockStreamObject).toHaveBeenCalledTimes(1);
    const callArgs = mockStreamObject.mock.calls[0][0];
    expect(callArgs.schema).toBeDefined();
    expect(callArgs.system).toContain('senior product discovery');
    expect(callArgs.system).toContain('Current coverage scores');
    expect(callArgs.messages).toBeDefined();
  });

  it('returns partialObjectStream and object promise', async () => {
    const result = await generateChatResponse({
      sessionId: 'test-1',
      messages: [{ role: 'user', content: 'hello' }],
      currentBrief: createDefaultStructuredBrief(),
      currentCoverage: { productContext: 0, functional: 0, aesthetics: 0 },
    });

    expect(result.partialObjectStream).toBe(mockPartialStream);
    const final = await result.object;
    expect(final.message).toBe(mockFinalObject.message);
  });

  it('passes recap nudge in system prompt when turnsSinceLastRecap >= 7', async () => {
    await generateChatResponse({
      sessionId: 'test-1',
      messages: [{ role: 'user', content: 'hello' }],
      currentBrief: createDefaultStructuredBrief(),
      currentCoverage: { productContext: 0, functional: 0, aesthetics: 0 },
      turnsSinceLastRecap: 8,
    });

    const callArgs = mockStreamObject.mock.calls[0][0];
    expect(callArgs.system).toContain('turns since your last recap');
  });

  it('does NOT pass recap nudge when turnsSinceLastRecap < 7', async () => {
    await generateChatResponse({
      sessionId: 'test-1',
      messages: [{ role: 'user', content: 'hello' }],
      currentBrief: createDefaultStructuredBrief(),
      currentCoverage: { productContext: 0, functional: 0, aesthetics: 0 },
      turnsSinceLastRecap: 3,
    });

    const callArgs = mockStreamObject.mock.calls[0][0];
    expect(callArgs.system).not.toContain('turns since your last recap');
  });
});

describe('generateFallbackResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue({ text: 'Fallback response text' });
  });

  it('uses generateText for text-only response', async () => {
    const result = await generateFallbackResponse({
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.model).toBe('gpt-4o-mini');
    expect(result).toBe('Fallback response text');
  });
});
