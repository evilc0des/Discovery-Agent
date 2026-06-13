import { type structuredBriefSchema } from './session/schema';
import { type z } from 'zod';

type Brief = z.infer<typeof structuredBriefSchema>;

function hasNonEmptyString(list: string[]): boolean {
  return list.length > 0;
}

function citationValue(field: { value: string; citations: string[] }): string {
  return field.value;
}

function bulletList(items: string[]): string {
  if (items.length === 0) return '';
  return items.map((item) => `- ${item}`).join('\n');
}

function productContextSection(brief: Brief): string | null {
  const pc = brief.product_context;
  const filled = [
    citationValue(pc.problem_statement).trim().length > 0,
    hasNonEmptyString(pc.target_audience),
    hasNonEmptyString(pc.user_needs),
    citationValue(pc.use_context).trim().length > 0,
    citationValue(pc.success_definition).trim().length > 0,
    hasNonEmptyString(pc.product_boundaries),
    hasNonEmptyString(pc.must_have_goals),
    hasNonEmptyString(pc.nice_to_have_goals),
  ];

  if (!filled.some(Boolean)) return null;

  const lines: string[] = ['## Product Context'];

  if (citationValue(pc.problem_statement).trim()) {
    lines.push('', '### Problem Statement', '', citationValue(pc.problem_statement));
  }
  if (hasNonEmptyString(pc.target_audience)) {
    lines.push('', '### Target Audience', '', bulletList(pc.target_audience));
  }
  if (hasNonEmptyString(pc.user_needs)) {
    lines.push('', '### User Needs', '', bulletList(pc.user_needs));
  }
  if (citationValue(pc.use_context).trim()) {
    lines.push('', '### Use Context', '', citationValue(pc.use_context));
  }
  if (citationValue(pc.success_definition).trim()) {
    lines.push('', '### Success Definition', '', citationValue(pc.success_definition));
  }
  if (hasNonEmptyString(pc.product_boundaries)) {
    lines.push('', '### Product Boundaries', '', bulletList(pc.product_boundaries));
  }
  if (hasNonEmptyString(pc.must_have_goals)) {
    lines.push('', '### Must-Have Goals', '', bulletList(pc.must_have_goals));
  }
  if (hasNonEmptyString(pc.nice_to_have_goals)) {
    lines.push('', '### Nice-to-Have Goals', '', bulletList(pc.nice_to_have_goals));
  }

  return lines.join('\n');
}

function functionalSection(brief: Brief): string | null {
  const fn = brief.functional;
  const filled = [
    hasNonEmptyString(fn.user_segments),
    hasNonEmptyString(fn.jobs_to_be_done),
    hasNonEmptyString(fn.current_workflows),
    hasNonEmptyString(fn.desired_workflows),
    hasNonEmptyString(fn.features),
    hasNonEmptyString(fn.system_behaviors),
    hasNonEmptyString(fn.integrations),
    hasNonEmptyString(fn.data_entities),
    hasNonEmptyString(fn.roles_permissions),
    hasNonEmptyString(fn.edge_cases),
    hasNonEmptyString(fn.acceptance_criteria),
  ];

  if (!filled.some(Boolean)) return null;

  const lines: string[] = ['## Functional Requirements'];

  if (hasNonEmptyString(fn.user_segments)) {
    lines.push('', '### User Segments', '', bulletList(fn.user_segments));
  }
  if (hasNonEmptyString(fn.jobs_to_be_done)) {
    lines.push('', '### Jobs to Be Done', '', bulletList(fn.jobs_to_be_done));
  }
  if (hasNonEmptyString(fn.current_workflows)) {
    lines.push('', '### Current Workflows', '', bulletList(fn.current_workflows));
  }
  if (hasNonEmptyString(fn.desired_workflows)) {
    lines.push('', '### Desired Workflows', '', bulletList(fn.desired_workflows));
  }
  if (hasNonEmptyString(fn.features)) {
    lines.push('', '### Features', '', bulletList(fn.features));
  }
  if (hasNonEmptyString(fn.system_behaviors)) {
    lines.push('', '### System Behaviors', '', bulletList(fn.system_behaviors));
  }
  if (hasNonEmptyString(fn.integrations)) {
    lines.push('', '### Integrations', '', bulletList(fn.integrations));
  }
  if (hasNonEmptyString(fn.data_entities)) {
    lines.push('', '### Data Entities', '', bulletList(fn.data_entities));
  }
  if (hasNonEmptyString(fn.roles_permissions)) {
    lines.push('', '### Roles & Permissions', '', bulletList(fn.roles_permissions));
  }
  if (hasNonEmptyString(fn.edge_cases)) {
    lines.push('', '### Edge Cases', '', bulletList(fn.edge_cases));
  }
  if (hasNonEmptyString(fn.acceptance_criteria)) {
    lines.push('', '### Acceptance Criteria', '', bulletList(fn.acceptance_criteria));
  }

  return lines.join('\n');
}

function aestheticsSection(brief: Brief): string | null {
  const ae = brief.aesthetics;
  const filled = [
    hasNonEmptyString(ae.brand_personality),
    citationValue(ae.tone_of_voice).trim().length > 0,
    hasNonEmptyString(ae.desired_emotions),
    hasNonEmptyString(ae.visual_style_keywords),
    hasNonEmptyString(ae.reference_products),
    hasNonEmptyString(ae.liked_patterns),
    hasNonEmptyString(ae.disliked_patterns),
    hasNonEmptyString(ae.color_preferences),
    hasNonEmptyString(ae.color_avoidances),
    hasNonEmptyString(ae.typography_direction),
    hasNonEmptyString(ae.imagery_direction),
    hasNonEmptyString(ae.interaction_principles),
    hasNonEmptyString(ae.accessibility_expectations),
    hasNonEmptyString(ae.ui_constraints),
  ];

  if (!filled.some(Boolean)) return null;

  const lines: string[] = ['## Aesthetics and UX'];

  if (hasNonEmptyString(ae.brand_personality)) {
    lines.push('', '### Brand Personality', '', bulletList(ae.brand_personality));
  }
  if (citationValue(ae.tone_of_voice).trim()) {
    lines.push('', '### Tone of Voice', '', citationValue(ae.tone_of_voice));
  }
  if (hasNonEmptyString(ae.desired_emotions)) {
    lines.push('', '### Desired Emotions', '', bulletList(ae.desired_emotions));
  }
  if (hasNonEmptyString(ae.visual_style_keywords)) {
    lines.push('', '### Visual Style Keywords', '', bulletList(ae.visual_style_keywords));
  }
  if (hasNonEmptyString(ae.reference_products)) {
    lines.push('', '### Reference Products', '', bulletList(ae.reference_products));
  }
  if (hasNonEmptyString(ae.liked_patterns)) {
    lines.push('', '### Liked Patterns', '', bulletList(ae.liked_patterns));
  }
  if (hasNonEmptyString(ae.disliked_patterns)) {
    lines.push('', '### Disliked Patterns', '', bulletList(ae.disliked_patterns));
  }
  if (hasNonEmptyString(ae.color_preferences)) {
    lines.push('', '### Color Preferences', '', bulletList(ae.color_preferences));
  }
  if (hasNonEmptyString(ae.color_avoidances)) {
    lines.push('', '### Color Avoidances', '', bulletList(ae.color_avoidances));
  }
  if (hasNonEmptyString(ae.typography_direction)) {
    lines.push('', '### Typography Direction', '', bulletList(ae.typography_direction));
  }
  if (hasNonEmptyString(ae.imagery_direction)) {
    lines.push('', '### Imagery Direction', '', bulletList(ae.imagery_direction));
  }
  if (hasNonEmptyString(ae.interaction_principles)) {
    lines.push('', '### Interaction Principles', '', bulletList(ae.interaction_principles));
  }
  if (hasNonEmptyString(ae.accessibility_expectations)) {
    lines.push('', '### Accessibility Expectations', '', bulletList(ae.accessibility_expectations));
  }
  if (hasNonEmptyString(ae.ui_constraints)) {
    lines.push('', '### UI Constraints', '', bulletList(ae.ui_constraints));
  }

  return lines.join('\n');
}

export function generateBriefMarkdown(brief: Brief, opts?: { earlyStop?: boolean }): string {
  const sections: string[] = ['# Structured Discovery Brief'];

  if (opts?.earlyStop) {
    sections.push('', '> **Warning**: This brief was generated early before all discovery areas had sufficient coverage. Some sections may be incomplete. A human review is strongly recommended.');
  }

  const pc = productContextSection(brief);
  if (pc) sections.push('', pc);

  const fn = functionalSection(brief);
  if (fn) sections.push('', fn);

  const ae = aestheticsSection(brief);
  if (ae) sections.push('', ae);

  if (hasNonEmptyString(brief.assumptions)) {
    sections.push('', '## Assumptions', '', bulletList(brief.assumptions));
  }

  if (hasNonEmptyString(brief.risks_to_product_fit)) {
    sections.push('', '## Risks to Product Fit', '', bulletList(brief.risks_to_product_fit));
  }

  if (hasNonEmptyString(brief.open_questions)) {
    sections.push('', '## Open Questions', '', bulletList(brief.open_questions));
  }

  return sections.join('\n') + '\n';
}
