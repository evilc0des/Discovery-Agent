import { type parseIntakeText } from '@/lib/llm/parse';
import { type createDefaultStructuredBrief } from './schema';

export function mergeParsedIntake(
  parsed: Awaited<ReturnType<typeof parseIntakeText>>,
  defaults: ReturnType<typeof createDefaultStructuredBrief>
): ReturnType<typeof createDefaultStructuredBrief> {
  const brief = JSON.parse(JSON.stringify(defaults)) as typeof defaults;

  if (parsed.product_context) {
    const pc = parsed.product_context;
    if (pc.problem_statement) brief.product_context.problem_statement = { value: pc.problem_statement, citations: [] };
    if (pc.target_audience) brief.product_context.target_audience = pc.target_audience;
    if (pc.user_needs) brief.product_context.user_needs = pc.user_needs;
    if (pc.use_context) brief.product_context.use_context = { value: pc.use_context, citations: [] };
    if (pc.success_definition) brief.product_context.success_definition = { value: pc.success_definition, citations: [] };
    if (pc.product_boundaries) brief.product_context.product_boundaries = pc.product_boundaries;
    if (pc.must_have_goals) brief.product_context.must_have_goals = pc.must_have_goals;
    if (pc.nice_to_have_goals) brief.product_context.nice_to_have_goals = pc.nice_to_have_goals;
  }

  if (parsed.functional) {
    const fn = parsed.functional;
    if (fn.user_segments) brief.functional.user_segments = fn.user_segments;
    if (fn.jobs_to_be_done) brief.functional.jobs_to_be_done = fn.jobs_to_be_done;
    if (fn.current_workflows) brief.functional.current_workflows = fn.current_workflows;
    if (fn.desired_workflows) brief.functional.desired_workflows = fn.desired_workflows;
    if (fn.features) brief.functional.features = fn.features;
    if (fn.system_behaviors) brief.functional.system_behaviors = fn.system_behaviors;
    if (fn.integrations) brief.functional.integrations = fn.integrations;
    if (fn.data_entities) brief.functional.data_entities = fn.data_entities;
    if (fn.roles_permissions) brief.functional.roles_permissions = fn.roles_permissions;
    if (fn.edge_cases) brief.functional.edge_cases = fn.edge_cases;
    if (fn.acceptance_criteria) brief.functional.acceptance_criteria = fn.acceptance_criteria;
  }

  if (parsed.aesthetics) {
    const ae = parsed.aesthetics;
    if (ae.brand_personality) brief.aesthetics.brand_personality = ae.brand_personality;
    if (ae.tone_of_voice) brief.aesthetics.tone_of_voice = { value: ae.tone_of_voice, citations: [] };
    if (ae.desired_emotions) brief.aesthetics.desired_emotions = ae.desired_emotions;
    if (ae.visual_style_keywords) brief.aesthetics.visual_style_keywords = ae.visual_style_keywords;
    if (ae.reference_products) brief.aesthetics.reference_products = ae.reference_products;
    if (ae.liked_patterns) brief.aesthetics.liked_patterns = ae.liked_patterns;
    if (ae.disliked_patterns) brief.aesthetics.disliked_patterns = ae.disliked_patterns;
    if (ae.color_preferences) brief.aesthetics.color_preferences = ae.color_preferences;
    if (ae.color_avoidances) brief.aesthetics.color_avoidances = ae.color_avoidances;
    if (ae.typography_direction) brief.aesthetics.typography_direction = ae.typography_direction;
    if (ae.imagery_direction) brief.aesthetics.imagery_direction = ae.imagery_direction;
    if (ae.interaction_principles) brief.aesthetics.interaction_principles = ae.interaction_principles;
    if (ae.accessibility_expectations) brief.aesthetics.accessibility_expectations = ae.accessibility_expectations;
    if (ae.ui_constraints) brief.aesthetics.ui_constraints = ae.ui_constraints;
  }

  if (parsed.assumptions) brief.assumptions = parsed.assumptions;
  if (parsed.risks_to_product_fit) brief.risks_to_product_fit = parsed.risks_to_product_fit;
  if (parsed.open_questions) brief.open_questions = parsed.open_questions;
  if (parsed.out_of_scope_topics) brief.out_of_scope_topics = parsed.out_of_scope_topics;

  return brief;
}
