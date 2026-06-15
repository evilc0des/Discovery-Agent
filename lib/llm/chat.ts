import { streamObject, generateText } from 'ai';
import { digitalocean, DO_MODEL } from './provider';
import { z } from 'zod';
import { computeCoverage } from '../coverage';
import { type structuredBriefSchema } from '../session/schema';

type Brief = z.infer<typeof structuredBriefSchema>;

export const discoverySchema = z.object({
  message: z.string(),
  state_update: z.object({
    coverage: z.object({
      product_context: z.number().min(0).max(1),
      functional: z.number().min(0).max(1),
      aesthetics: z.number().min(0).max(1),
    }),
    extracted: z.array(z.object({ key: z.string(), value: z.string() })),
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

export function formatBriefForPrompt(brief: Brief): string {
  const cv = (field: { value: string; citations: string[] }) => field.value;
  const fmtArr = (arr: string[]) => arr.map((s) => `"${s}"`).join(', ');

  const pc = brief.product_context;
  const pcFields: Array<{ name: string; filled: boolean; display: string }> = [
    { name: 'problem_statement', filled: cv(pc.problem_statement).trim().length > 0, display: cv(pc.problem_statement).trim() ? `problem_statement="${cv(pc.problem_statement)}"` : '' },
    { name: 'target_audience', filled: pc.target_audience.length > 0, display: pc.target_audience.length > 0 ? `target_audience=[${fmtArr(pc.target_audience)}]` : '' },
    { name: 'user_needs', filled: pc.user_needs.length > 0, display: pc.user_needs.length > 0 ? `user_needs=[${fmtArr(pc.user_needs)}]` : '' },
    { name: 'use_context', filled: cv(pc.use_context).trim().length > 0, display: cv(pc.use_context).trim() ? `use_context="${cv(pc.use_context)}"` : '' },
    { name: 'success_definition', filled: cv(pc.success_definition).trim().length > 0, display: cv(pc.success_definition).trim() ? `success_definition="${cv(pc.success_definition)}"` : '' },
    { name: 'product_boundaries', filled: pc.product_boundaries.length > 0, display: pc.product_boundaries.length > 0 ? `product_boundaries=[${fmtArr(pc.product_boundaries)}]` : '' },
    { name: 'must_have_goals', filled: pc.must_have_goals.length > 0, display: pc.must_have_goals.length > 0 ? `must_have_goals=[${fmtArr(pc.must_have_goals)}]` : '' },
    { name: 'nice_to_have_goals', filled: pc.nice_to_have_goals.length > 0, display: pc.nice_to_have_goals.length > 0 ? `nice_to_have_goals=[${fmtArr(pc.nice_to_have_goals)}]` : '' },
  ];

  const fn = brief.functional;
  const fnFields: Array<{ name: string; filled: boolean; display: string }> = [
    { name: 'user_segments', filled: fn.user_segments.length > 0, display: fn.user_segments.length > 0 ? `user_segments=[${fmtArr(fn.user_segments)}]` : '' },
    { name: 'jobs_to_be_done', filled: fn.jobs_to_be_done.length > 0, display: fn.jobs_to_be_done.length > 0 ? `jobs_to_be_done=[${fmtArr(fn.jobs_to_be_done)}]` : '' },
    { name: 'current_workflows', filled: fn.current_workflows.length > 0, display: fn.current_workflows.length > 0 ? `current_workflows=[${fmtArr(fn.current_workflows)}]` : '' },
    { name: 'desired_workflows', filled: fn.desired_workflows.length > 0, display: fn.desired_workflows.length > 0 ? `desired_workflows=[${fmtArr(fn.desired_workflows)}]` : '' },
    { name: 'features', filled: fn.features.length > 0, display: fn.features.length > 0 ? `features=[${fmtArr(fn.features)}]` : '' },
    { name: 'system_behaviors', filled: fn.system_behaviors.length > 0, display: fn.system_behaviors.length > 0 ? `system_behaviors=[${fmtArr(fn.system_behaviors)}]` : '' },
    { name: 'integrations', filled: fn.integrations.length > 0, display: fn.integrations.length > 0 ? `integrations=[${fmtArr(fn.integrations)}]` : '' },
    { name: 'data_entities', filled: fn.data_entities.length > 0, display: fn.data_entities.length > 0 ? `data_entities=[${fmtArr(fn.data_entities)}]` : '' },
    { name: 'roles_permissions', filled: fn.roles_permissions.length > 0, display: fn.roles_permissions.length > 0 ? `roles_permissions=[${fmtArr(fn.roles_permissions)}]` : '' },
    { name: 'edge_cases', filled: fn.edge_cases.length > 0, display: fn.edge_cases.length > 0 ? `edge_cases=[${fmtArr(fn.edge_cases)}]` : '' },
    { name: 'acceptance_criteria', filled: fn.acceptance_criteria.length > 0, display: fn.acceptance_criteria.length > 0 ? `acceptance_criteria=[${fmtArr(fn.acceptance_criteria)}]` : '' },
  ];

  const ae = brief.aesthetics;
  const aeFields: Array<{ name: string; filled: boolean; display: string }> = [
    { name: 'brand_personality', filled: ae.brand_personality.length > 0, display: ae.brand_personality.length > 0 ? `brand_personality=[${fmtArr(ae.brand_personality)}]` : '' },
    { name: 'tone_of_voice', filled: cv(ae.tone_of_voice).trim().length > 0, display: cv(ae.tone_of_voice).trim() ? `tone_of_voice="${cv(ae.tone_of_voice)}"` : '' },
    { name: 'desired_emotions', filled: ae.desired_emotions.length > 0, display: ae.desired_emotions.length > 0 ? `desired_emotions=[${fmtArr(ae.desired_emotions)}]` : '' },
    { name: 'visual_style_keywords', filled: ae.visual_style_keywords.length > 0, display: ae.visual_style_keywords.length > 0 ? `visual_style_keywords=[${fmtArr(ae.visual_style_keywords)}]` : '' },
    { name: 'reference_products', filled: ae.reference_products.length > 0, display: ae.reference_products.length > 0 ? `reference_products=[${fmtArr(ae.reference_products)}]` : '' },
    { name: 'liked_patterns', filled: ae.liked_patterns.length > 0, display: ae.liked_patterns.length > 0 ? `liked_patterns=[${fmtArr(ae.liked_patterns)}]` : '' },
    { name: 'disliked_patterns', filled: ae.disliked_patterns.length > 0, display: ae.disliked_patterns.length > 0 ? `disliked_patterns=[${fmtArr(ae.disliked_patterns)}]` : '' },
    { name: 'color_preferences', filled: ae.color_preferences.length > 0, display: ae.color_preferences.length > 0 ? `color_preferences=[${fmtArr(ae.color_preferences)}]` : '' },
    { name: 'color_avoidances', filled: ae.color_avoidances.length > 0, display: ae.color_avoidances.length > 0 ? `color_avoidances=[${fmtArr(ae.color_avoidances)}]` : '' },
    { name: 'typography_direction', filled: ae.typography_direction.length > 0, display: ae.typography_direction.length > 0 ? `typography_direction=[${fmtArr(ae.typography_direction)}]` : '' },
    { name: 'imagery_direction', filled: ae.imagery_direction.length > 0, display: ae.imagery_direction.length > 0 ? `imagery_direction=[${fmtArr(ae.imagery_direction)}]` : '' },
    { name: 'interaction_principles', filled: ae.interaction_principles.length > 0, display: ae.interaction_principles.length > 0 ? `interaction_principles=[${fmtArr(ae.interaction_principles)}]` : '' },
    { name: 'accessibility_expectations', filled: ae.accessibility_expectations.length > 0, display: ae.accessibility_expectations.length > 0 ? `accessibility_expectations=[${fmtArr(ae.accessibility_expectations)}]` : '' },
    { name: 'ui_constraints', filled: ae.ui_constraints.length > 0, display: ae.ui_constraints.length > 0 ? `ui_constraints=[${fmtArr(ae.ui_constraints)}]` : '' },
  ];

  const formatDomain = (label: string, fields: Array<{ name: string; filled: boolean; display: string }>): string => {
    const filled = fields.filter((f) => f.filled);
    const empty = fields.filter((f) => !f.filled);
    const filledCount = filled.length;
    const total = fields.length;

    if (filledCount === 0) {
      return `${label} (0/${total} filled): No data yet.`;
    }

    const filledDisplay = filled.map((f) => f.display).join(', ');
    const missing = empty.length > 0 ? ` Missing: ${empty.map((f) => f.name).join(', ')}.` : ' All fields have data.';

    return `${label} (${filledCount}/${total} filled): ${filledDisplay}.${missing}`;
  };

  const lines: string[] = [
    'CURRENT INFORMATION MATRIX:',
    '',
    formatDomain('Product Context', pcFields),
    formatDomain('Functional', fnFields),
    formatDomain('Aesthetics', aeFields),
  ];

  if (brief.assumptions.length > 0) {
    lines.push('', `Assumptions: ${fmtArr(brief.assumptions)}`);
  }

  if (brief.open_questions.length > 0) {
    lines.push('', `Open Questions: ${fmtArr(brief.open_questions)}`);
  }

  if (brief.risks_to_product_fit.length > 0) {
    lines.push('', `Risks to Product Fit: ${fmtArr(brief.risks_to_product_fit)}`);
  }

  if (brief.out_of_scope_topics.length > 0) {
    lines.push('', `Out of Scope: ${fmtArr(brief.out_of_scope_topics)}`);
  }

  return lines.join('\n');
}

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

Output format:
Your message field must always use proper Markdown formatting. Use **bold** for emphasis, \`code\` for UI labels or feature names, numbered lists (1. 2. 3.) for sequential items, bullet lists (- - -) for non-ordered items, ### headings for section breaks, and > blockquotes for client quotes. Never output raw unformatted text blocks.

Rules:
1. Ask one question at a time.
2. Keep the conversation centered on the product.
3. First Check if we already have information about the current topic in the existing brief. If we do, ask if there are any updates or changes to that information. If we don&apos;t, ask an open-ended question to elicit new information from the client. Avoid asking yes/no questions or leading questions that may bias the client&apos;s response.
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
  brief?: Brief,
): string {
  let prompt = `${systemPrompt}\n\nCurrent coverage scores: Product Context ${coverage.productContext}, Functional ${coverage.functional}, Aesthetics ${coverage.aesthetics}. Use these as a guide to choose the next question.`;

  if (brief) {
    prompt += `\n\nThe following information has already been captured from the client. Use it to avoid re-asking about known topics and to build on existing context:\n\n${formatBriefForPrompt(brief)}`;
  }

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
  const brief = args.currentBrief as Brief | undefined;
  const coverage = computeCoverage(args.currentBrief as Parameters<typeof computeCoverage>[0]);

  const system = buildSystemPrompt(args.turnsSinceLastRecap ?? 0, coverage, brief);

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
    model: digitalocean.chat(DO_MODEL),
    schema: discoverySchema,
    system,
    messages,
  });

  return {
    partialObjectStream: result.partialObjectStream,
    object: result.object,
  };
}

export async function generateInitialAssistantMessage(args: {
  clientName?: string;
  projectName?: string;
  brief: Brief;
  coverage: { productContext: number; functional: number; aesthetics: number };
}): Promise<string> {
  const { clientName, projectName, brief, coverage } = args;

  const hasContent = coverage.productContext > 0 || coverage.functional > 0 || coverage.aesthetics > 0;
  if (!hasContent) return '';

  const infoMatrix = formatBriefForPrompt(brief);

  const userPrompt = [
    'You are a senior product discovery analyst. A client has submitted requirements information for a new project, and the information has been pre-parsed into a structured brief.',
    '',
    `${clientName ? `Client name: ${clientName}` : 'Client name: not provided'}`,
    `${projectName ? `Project name: ${projectName}` : 'Project name: not provided'}`,
    '',
    'The following information has already been extracted and stored:',
    '',
    infoMatrix,
    '',
    'Write a brief welcoming message (2-4 short paragraphs) to the client that:',
    '1. Greets the client warmly and acknowledges the project',
    '2. Summarizes in natural language what key information has been captured across the three domains',
    '3. Mentions specific details that were extracted to show you understood the intake',
    '4. Flags any open questions that came up during intake parsing',
    '5. Invites the client to begin the discovery conversation, encouraging them to correct anything or add more detail',
    '',
    'Do NOT:',
    '- Sound robotic or template-like',
    '- Exceed 4 short paragraphs',
  ].join('\n');

  const { text } = await generateText({
    model: digitalocean.chat(DO_MODEL),
    messages: [
      { role: 'user' as const, content: userPrompt },
    ],
  });

  return text;
}

export async function generateFallbackResponse(args: {
  messages: Array<{ role: string; content: string }>;
}): Promise<string> {
  const { text } = await generateText({
    model: digitalocean.chat(DO_MODEL),
    system: systemPrompt,
    messages: args.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  return text;
}
