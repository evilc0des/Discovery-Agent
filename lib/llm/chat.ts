import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { computeCoverage } from '../coverage';

const discoverySchema = z.object({
  message: z.string(),
  state_update: z.object({
    coverage: z.object({
      product_context: z.number().min(0).max(1),
      functional: z.number().min(0).max(1),
      aesthetics: z.number().min(0).max(1),
    }),
    extracted: z.record(z.string(), z.any()),
    contradictions: z.array(z.string()),
    open_questions: z.array(z.string()),
    assumptions: z.array(z.string()),
    out_of_scope_topics: z.array(z.object({
      topic: z.string(),
      turn_number: z.number(),
      client_quote: z.string(),
    })),
  }),
  reasoning: z.string(),
  is_recap: z.boolean(),
  is_final: z.boolean(),
});

const systemPrompt = `You are a senior product discovery and design intake analyst.

Your task is to convert rough client input into a validated product discovery brief with a 20/40/40 balance:
- 20% product context
- 40% functional requirements
- 40% brand, aesthetics, design, and UI/UX constraints

You must only discuss the product being built.
Do not ask about or discuss:
- budget
- pricing
- timelines
- delivery plans
- staffing
- project management process
- meeting cadence
- contracts or commercials

If the client raises any of those, acknowledge briefly and mark them as "Handled by human team", then return to product discovery.

Track these domains:

PRODUCT CONTEXT
- core problem
- user need
- target audience
- success definition
- use environment/context
- product boundaries
- must-have vs nice-to-have intent

FUNCTIONAL
- user segments
- jobs to be done
- current workflow
- desired workflow
- features
- system responses
- integrations
- data inputs/outputs
- roles/permissions
- edge cases
- acceptance criteria

AESTHETICS
- brand personality
- tone of voice
- emotional outcome
- visual style
- references
- likes/dislikes
- color preferences/avoidances
- typography direction
- imagery/iconography direction
- interaction style
- accessibility expectations
- UI constraints

Rules:
1. Ask one question at a time.
2. Keep the conversation centered on the product.
3. If a client uses vague words like "modern", "premium", or "clean", ask for examples and observable traits.
4. Convert subjective preferences into explicit UI/UX constraints.
5. Separate must-have, nice-to-have, and must-avoid items.
6. Summarize whenever a major topic or domain has been sufficiently explored. Use coverage scores as a guide, not a rigid rule.
7. Do not end until all three domains have sufficient coverage (guideline: ~70%) or the client explicitly pauses.
8. Produce a final brief focused only on the product and design direction.
9. Detect contradictions immediately and challenge them politely.
10. Use coverage scores as a guide, not a command. If the client offers rich, high-signal material, explore it opportunistically. Return to the lowest-coverage domain within the next 1-2 turns.
`;

export async function generateChatResponse(args: {
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
  currentBrief: unknown;
  currentCoverage: unknown;
}): Promise<{
  message: string;
  stateUpdate: {
    coverage: {
      product_context: number;
      functional: number;
      aesthetics: number;
    };
    extracted: Record<string, unknown>;
    contradictions: string[];
    open_questions: string[];
    assumptions: string[];
    out_of_scope_topics: Array<{ topic: string; turn_number: number; client_quote: string }>;
  };
  reasoning: string;
  isRecap: boolean;
  isFinal: boolean;
}> {
  const coverage = computeCoverage(args.currentBrief as Parameters<typeof computeCoverage>[0]);

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: discoverySchema,
    system: `${systemPrompt}\n\nCurrent coverage scores: Product Context ${coverage.productContext}, Functional ${coverage.functional}, Aesthetics ${coverage.aesthetics}. Use these as a guide to choose the next question.`,
    messages: args.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  return {
    message: object.message,
    stateUpdate: {
      coverage: object.state_update.coverage,
      extracted: object.state_update.extracted,
      contradictions: object.state_update.contradictions,
      open_questions: object.state_update.open_questions,
      assumptions: object.state_update.assumptions,
      out_of_scope_topics: object.state_update.out_of_scope_topics,
    },
    reasoning: object.reasoning,
    isRecap: object.is_recap,
    isFinal: object.is_final,
  };
}

export async function generateFallbackResponse(args: {
  messages: Array<{ role: string; content: string }>;
}): Promise<string> {
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: args.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  return text;
}
