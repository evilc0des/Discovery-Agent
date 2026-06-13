import { type z } from 'zod';
import { type structuredBriefSchema } from './session/schema';

type Brief = z.infer<typeof structuredBriefSchema>;

export function computeCoverage(brief: Brief): {
  productContext: number;
  functional: number;
  aesthetics: number;
} {
  const pc = brief.product_context;
  const productContextFilled = [
    pc.problem_statement.value.trim().length > 0,
    pc.target_audience.length > 0,
    pc.user_needs.length > 0,
    pc.use_context.value.trim().length > 0,
    pc.success_definition.value.trim().length > 0,
    pc.product_boundaries.length > 0,
    pc.must_have_goals.length > 0,
    pc.nice_to_have_goals.length > 0,
  ].filter(Boolean).length;
  const productContextTotal = 8;

  const fn = brief.functional;
  const functionalFilled = [
    fn.user_segments.length > 0,
    fn.jobs_to_be_done.length > 0,
    fn.current_workflows.length > 0,
    fn.desired_workflows.length > 0,
    fn.features.length > 0,
    fn.system_behaviors.length > 0,
    fn.integrations.length > 0,
    fn.data_entities.length > 0,
    fn.roles_permissions.length > 0,
    fn.edge_cases.length > 0,
    fn.acceptance_criteria.length > 0,
  ].filter(Boolean).length;
  const functionalTotal = 11;

  const ae = brief.aesthetics;
  const aestheticsFilled = [
    ae.brand_personality.length > 0,
    ae.tone_of_voice.value.trim().length > 0,
    ae.desired_emotions.length > 0,
    ae.visual_style_keywords.length > 0,
    ae.reference_products.length > 0,
    ae.liked_patterns.length > 0,
    ae.disliked_patterns.length > 0,
    ae.color_preferences.length > 0,
    ae.color_avoidances.length > 0,
    ae.typography_direction.length > 0,
    ae.imagery_direction.length > 0,
    ae.interaction_principles.length > 0,
    ae.accessibility_expectations.length > 0,
    ae.ui_constraints.length > 0,
  ].filter(Boolean).length;
  const aestheticsTotal = 14;

  return {
    productContext: Math.round((productContextFilled / productContextTotal) * 100) / 100,
    functional: Math.round((functionalFilled / functionalTotal) * 100) / 100,
    aesthetics: Math.round((aestheticsFilled / aestheticsTotal) * 100) / 100,
  };
}
