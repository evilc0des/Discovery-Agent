import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const intakeParseSchema = z.object({
  product_context: z.object({
    problem_statement: z.string().optional(),
    target_audience: z.array(z.string()).optional(),
    user_needs: z.array(z.string()).optional(),
    use_context: z.string().optional(),
    success_definition: z.string().optional(),
    product_boundaries: z.array(z.string()).optional(),
    must_have_goals: z.array(z.string()).optional(),
    nice_to_have_goals: z.array(z.string()).optional(),
  }).optional(),
  functional: z.object({
    user_segments: z.array(z.string()).optional(),
    jobs_to_be_done: z.array(z.string()).optional(),
    current_workflows: z.array(z.string()).optional(),
    desired_workflows: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    system_behaviors: z.array(z.string()).optional(),
    integrations: z.array(z.string()).optional(),
    data_entities: z.array(z.string()).optional(),
    roles_permissions: z.array(z.string()).optional(),
    edge_cases: z.array(z.string()).optional(),
    acceptance_criteria: z.array(z.string()).optional(),
  }).optional(),
  aesthetics: z.object({
    brand_personality: z.array(z.string()).optional(),
    tone_of_voice: z.string().optional(),
    desired_emotions: z.array(z.string()).optional(),
    visual_style_keywords: z.array(z.string()).optional(),
    reference_products: z.array(z.string()).optional(),
    liked_patterns: z.array(z.string()).optional(),
    disliked_patterns: z.array(z.string()).optional(),
    color_preferences: z.array(z.string()).optional(),
    color_avoidances: z.array(z.string()).optional(),
    typography_direction: z.array(z.string()).optional(),
    imagery_direction: z.array(z.string()).optional(),
    interaction_principles: z.array(z.string()).optional(),
    accessibility_expectations: z.array(z.string()).optional(),
    ui_constraints: z.array(z.string()).optional(),
  }).optional(),
  assumptions: z.array(z.string()).optional(),
  risks_to_product_fit: z.array(z.string()).optional(),
  open_questions: z.array(z.string()).optional(),
  out_of_scope_topics: z.array(z.string()).optional(),
});

const intakeSystemPrompt = `You are a product discovery analyst. Extract structured information from the client's intake text.

Map the client's raw description into the following domains:

PRODUCT CONTEXT:
- problem_statement: The core problem the client wants to solve
- target_audience: Who will use the product
- user_needs: What users need from the product
- use_context: Where and how the product will be used
- success_definition: How the client will know the product is successful
- product_boundaries: What is explicitly in or out of scope
- must_have_goals: Non-negotiable requirements
- nice_to_have_goals: Desirable but not essential requirements

FUNCTIONAL:
- user_segments: Different types of users
- jobs_to_be_done: Tasks users need to accomplish
- current_workflows: How users currently solve the problem
- desired_workflows: How users should solve it with the product
- features: Specific capabilities requested
- system_behaviors: How the system should respond
- integrations: External systems to connect with
- data_entities: Key data objects
- roles_permissions: Access control needs
- edge_cases: Unusual scenarios to handle
- acceptance_criteria: Conditions for accepting the solution

AESTHETICS:
- brand_personality: Brand character traits
- tone_of_voice: Communication style
- desired_emotions: Feelings the product should evoke
- visual_style_keywords: Visual direction keywords
- reference_products: Products the client admires
- liked_patterns: UI patterns the client likes
- disliked_patterns: UI patterns the client dislikes
- color_preferences: Preferred colors
- color_avoidances: Colors to avoid
- typography_direction: Font style preferences
- imagery_direction: Image/icon preferences
- interaction_principles: Interaction style preferences
- accessibility_expectations: Accessibility requirements
- ui_constraints: Technical UI constraints

Only populate fields where the client's text contains clear signals. Leave empty anything not mentioned.
Be specific and use the client's own language where possible.`;

export async function parseIntakeText(text: string) {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: intakeParseSchema,
    system: intakeSystemPrompt,
    prompt: text,
  });

  return object;
}
