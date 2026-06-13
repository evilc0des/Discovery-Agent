import { describe, it, expect } from 'vitest';
import { computeCoverage } from '../lib/coverage';
import { createDefaultStructuredBrief } from '../lib/session/schema';

describe('computeCoverage', () => {
  it('returns 0 for all domains when brief is empty', () => {
    const brief = createDefaultStructuredBrief();
    const coverage = computeCoverage(brief);
    expect(coverage.productContext).toBe(0);
    expect(coverage.functional).toBe(0);
    expect(coverage.aesthetics).toBe(0);
  });

  it('computes product context coverage based on filled fields', () => {
    const brief = createDefaultStructuredBrief();
    brief.product_context.problem_statement.value = 'Users need to track fitness';
    brief.product_context.target_audience = ['Fitness enthusiasts'];
    brief.product_context.user_needs = ['Track workouts'];
    brief.product_context.use_context.value = 'At the gym';
    brief.product_context.success_definition.value = 'Better health outcomes';
    brief.product_context.product_boundaries = ['No medical advice'];
    brief.product_context.must_have_goals = ['Workout tracking'];
    brief.product_context.nice_to_have_goals = ['Social features'];

    const coverage = computeCoverage(brief);
    // 8 fields, all filled = 100%
    expect(coverage.productContext).toBe(1);
  });

  it('computes partial product context coverage', () => {
    const brief = createDefaultStructuredBrief();
    brief.product_context.problem_statement.value = 'Users need to track fitness';
    brief.product_context.target_audience = ['Fitness enthusiasts'];
    // 2 out of 8 fields filled
    const coverage = computeCoverage(brief);
    expect(coverage.productContext).toBe(0.25);
  });

  it('computes functional coverage based on filled fields', () => {
    const brief = createDefaultStructuredBrief();
    brief.functional.user_segments = ['Fitness enthusiasts'];
    brief.functional.jobs_to_be_done = ['Track workouts'];
    brief.functional.current_workflows = ['Use spreadsheets'];
    brief.functional.desired_workflows = ['App-based tracking'];
    brief.functional.features = ['Workout log', 'Progress charts'];
    brief.functional.system_behaviors = ['Save on close'];
    brief.functional.integrations = ['Apple Health'];
    brief.functional.data_entities = ['Workout', 'User'];
    brief.functional.roles_permissions = ['User', 'Admin'];
    brief.functional.edge_cases = ['No internet'];
    brief.functional.acceptance_criteria = ['Log workout in <3 taps'];

    const coverage = computeCoverage(brief);
    // 11 fields, all filled = 100%
    expect(coverage.functional).toBe(1);
  });

  it('computes aesthetics coverage based on filled fields', () => {
    const brief = createDefaultStructuredBrief();
    brief.aesthetics.brand_personality = ['Energetic', 'Motivating'];
    brief.aesthetics.tone_of_voice.value = 'Friendly and encouraging';
    brief.aesthetics.desired_emotions = ['Motivated', 'Proud'];
    brief.aesthetics.visual_style_keywords = ['Modern', 'Clean'];
    brief.aesthetics.reference_products = ['Strava', 'MyFitnessPal'];
    brief.aesthetics.liked_patterns = ['Card-based layout'];
    brief.aesthetics.disliked_patterns = ['Dark mode'];
    brief.aesthetics.color_preferences = ['Blue', 'Green'];
    brief.aesthetics.color_avoidances = ['Red'];
    brief.aesthetics.typography_direction = ['Sans-serif', 'Bold headings'];
    brief.aesthetics.imagery_direction = ['High-energy photography'];
    brief.aesthetics.interaction_principles = ['Smooth animations'];
    brief.aesthetics.accessibility_expectations = ['WCAG AA'];
    brief.aesthetics.ui_constraints = ['Mobile-first'];

    const coverage = computeCoverage(brief);
    // 14 fields, all filled = 100%
    expect(coverage.aesthetics).toBe(1);
  });
});
