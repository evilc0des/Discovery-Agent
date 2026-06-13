import { describe, it, expect } from 'vitest';
import { generateBriefMarkdown } from '../lib/brief-export';
import { createDefaultStructuredBrief } from '../lib/session/schema';

describe('generateBriefMarkdown', () => {
  it('generates a markdown document with all sections from a fully populated brief', () => {
    const brief = createDefaultStructuredBrief();

    brief.product_context.problem_statement = { value: 'Users struggle to track fitness across devices', citations: [] };
    brief.product_context.target_audience = ['Fitness enthusiasts', 'Personal trainers'];
    brief.product_context.user_needs = ['Track workouts', 'Monitor progress'];
    brief.product_context.use_context = { value: 'Used during workouts at gym or home', citations: [] };
    brief.product_context.success_definition = { value: 'Users consistently log workouts and see progress over time', citations: [] };
    brief.product_context.product_boundaries = ['No medical diagnosis', 'No meal planning'];
    brief.product_context.must_have_goals = ['Workout logging', 'Progress charts'];
    brief.product_context.nice_to_have_goals = ['Social sharing', 'Workout recommendations'];

    brief.functional.features = ['Workout logger', 'Progress dashboard'];
    brief.functional.user_segments = ['Free users', 'Premium subscribers'];
    brief.functional.jobs_to_be_done = ['Log a workout in under 10 seconds'];
    brief.functional.acceptance_criteria = ['Workout saved within 2 seconds'];

    brief.aesthetics.tone_of_voice = { value: 'Encouraging and energetic', citations: [] };
    brief.aesthetics.brand_personality = ['Motivating', 'Approachable'];

    brief.assumptions = ['Users have smartphones', 'Users exercise at least once per week'];
    brief.risks_to_product_fit = ['May not appeal to casual exercisers'];
    brief.open_questions = ['Should we support wearable devices?'];

    const markdown = generateBriefMarkdown(brief);

    expect(markdown).toContain('# Structured Discovery Brief');
    expect(markdown).toContain('## Product Context');
    expect(markdown).toContain('### Problem Statement');
    expect(markdown).toContain('Users struggle to track fitness across devices');
    expect(markdown).toContain('### Target Audience');
    expect(markdown).toContain('Fitness enthusiasts');
    expect(markdown).toContain('Personal trainers');
    expect(markdown).toContain('### Must-Have Goals');
    expect(markdown).toContain('Workout logging');
    expect(markdown).toContain('### Nice-to-Have Goals');
    expect(markdown).toContain('Social sharing');

    expect(markdown).toContain('## Functional Requirements');
    expect(markdown).toContain('### Features');
    expect(markdown).toContain('Workout logger');

    expect(markdown).toContain('## Aesthetics and UX');
    expect(markdown).toContain('### Tone of Voice');
    expect(markdown).toContain('Encouraging and energetic');

    expect(markdown).toContain('## Assumptions');
    expect(markdown).toContain('Users have smartphones');

    expect(markdown).toContain('## Risks to Product Fit');
    expect(markdown).toContain('May not appeal to casual exercisers');

    expect(markdown).toContain('## Open Questions');
    expect(markdown).toContain('Should we support wearable devices?');
  });

  it('renders citation fields with just their value text', () => {
    const brief = createDefaultStructuredBrief();
    brief.product_context.problem_statement = {
      value: 'Users need better analytics',
      citations: ['c-1', 'c-2'],
    };
    brief.aesthetics.tone_of_voice = {
      value: 'Professional and clear',
      citations: ['c-3'],
    };

    const markdown = generateBriefMarkdown(brief);
    expect(markdown).toContain('Users need better analytics');
    expect(markdown).toContain('Professional and clear');
    expect(markdown).not.toContain('c-1');
  });

  it('skips sections whose fields are all empty', () => {
    const brief = createDefaultStructuredBrief();
    brief.product_context.problem_statement = { value: 'A problem', citations: [] };
    // functional and aesthetics are empty, assumptions, risks, open_questions are empty

    const markdown = generateBriefMarkdown(brief);

    expect(markdown).toContain('## Product Context');
    expect(markdown).not.toContain('## Functional Requirements');
    expect(markdown).not.toContain('## Aesthetics and UX');
    expect(markdown).not.toContain('## Assumptions');
    expect(markdown).not.toContain('## Risks to Product Fit');
    expect(markdown).not.toContain('## Open Questions');
  });

  it('includes an early stop warning when earlyStop is true and coverage is low', () => {
    const brief = createDefaultStructuredBrief();
    brief.product_context.problem_statement = { value: 'A problem', citations: [] };
    // very sparse content

    const markdown = generateBriefMarkdown(brief, { earlyStop: true });
    expect(markdown).toContain('> **Warning**');
    expect(markdown).toContain('incomplete');
    expect(markdown).toContain('early');
  });

  it('does not include early stop warning when earlyStop is false', () => {
    const brief = createDefaultStructuredBrief();
    brief.product_context.problem_statement = { value: 'A problem', citations: [] };

    const markdown = generateBriefMarkdown(brief, { earlyStop: false });
    expect(markdown).not.toContain('> **Warning**');
  });
});
