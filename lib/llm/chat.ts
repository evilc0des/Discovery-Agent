import { streamObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { computeCoverage } from '../coverage';

export const discoverySchema = z.object({
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

export type DiscoveryOutput = z.infer<typeof discoverySchema>;

export const systemPrompt = `You are a senior product discovery and design intake analyst.

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
3. Never ask technical or implementation questions. Focus exclusively on user needs, desires, workflows, and design constraints. The product team will handle all technical decisions later. Forbidden technical topics include (but are not limited to):
   - Technology stack, programming languages, frameworks, libraries
   - Database design, schemas, queries, data structures
   - API design, endpoints, HTTP methods, protocols
   - Server architecture, cloud infrastructure, deployment, hosting
   - Authentication mechanisms, security protocols, encryption
   - Performance optimization, caching, load balancing
   - Code structure, design patterns, architecture patterns
   - Any implementation detail that is not a user-facing behavior or design constraint
   If the client volunteers technical details, acknowledge briefly and steer back to user needs and design constraints.
4. If a client uses vague words like "modern", "premium", or "clean", ask for examples and observable traits.
5. Convert subjective preferences into explicit UI/UX constraints.
6. Separate must-have, nice-to-have, and must-avoid items.
7. Summarize whenever a major topic or domain has been sufficiently explored. Use coverage scores as a guide, not a rigid rule.
8. Do not end until all three domains have sufficient coverage (guideline: ~70%) or the client explicitly pauses.
9. Produce a final brief focused only on the product and design direction.
10. Detect contradictions immediately and challenge them politely.
11. Use coverage scores as a guide, not a command. If the client offers rich, high-signal material, explore it opportunistically. Return to the lowest-coverage domain within the next 1-2 turns.
`;

export function buildSystemPrompt(
  turnsSinceLastRecap: number,
  coverage: { productContext: number; functional: number; aesthetics: number },
): string {
  let prompt = `${systemPrompt}\n\nCurrent coverage scores: Product Context ${coverage.productContext}, Functional ${coverage.functional}, Aesthetics ${coverage.aesthetics}. Use these as a guide to choose the next question.`;

  if (turnsSinceLastRecap >= 7) {
    prompt += `\n\nIt has been ${turnsSinceLastRecap} turns since your last recap. When you reach a natural break in the current topic, provide a recap summarizing what has been covered so far. A recap should include knowns, assumptions, open questions, and any contradictions for the domains explored.`;
  }

  return prompt;
}

export async function generateChatResponse(args: {
  sessionId: string;
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image?: string; mimeType?: string }> }>;
  currentBrief: unknown;
  currentCoverage: unknown;
  turnsSinceLastRecap?: number;
}): Promise<{
  partialObjectStream: AsyncIterable<unknown>;
  object: Promise<DiscoveryOutput>;
}> {
  const coverage = computeCoverage(args.currentBrief as Parameters<typeof computeCoverage>[0]);

  const system = buildSystemPrompt(args.turnsSinceLastRecap ?? 0, coverage);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = args.messages.map((m): any => {
    if (typeof m.content === 'string') {
      return { role: m.role as 'user' | 'assistant', content: m.content };
    }
    return {
      role: m.role as 'user' | 'assistant',
      content: m.content.filter((p) => {
        if (p.type === 'text') return true;
        if (p.type === 'image' && p.image) return true;
        return false;
      }).map((p) => {
        if (p.type === 'image') {
          return { type: 'image' as const, image: p.image!, mimeType: p.mimeType };
        }
        return { type: 'text' as const, text: p.text! };
      }),
    };
  });

  const result = streamObject({
    model: openai('gpt-4o'),
    schema: discoverySchema,
    system,
    messages,
  });

  return {
    partialObjectStream: result.partialObjectStream,
    object: result.object,
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
