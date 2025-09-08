/**
 * Big 5 Personality Scoring Service
 * 
 * Converts personality questionnaire responses to Big 5 trait percentiles
 * Based on the Python scoring logic from analysis_outputs/score_responses.py
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Response level encoding - matches the Python version
const LEVEL_ENCODING = {
  'StronglyDisagree': -2.0,
  'Disagree': -1.0,
  'Neutral': 0.0,
  'Agree': 1.0,
  'StronglyAgree': 2.0,
} as const;

// Aspect to trait mapping
const ASPECT_TO_TRAIT = {
  'Compassion': 'Agreeableness',
  'Politeness': 'Agreeableness',
  'Industriousness': 'Conscientiousness',
  'Orderliness': 'Conscientiousness',
  'Enthusiasm': 'Extraversion',
  'Assertiveness': 'Extraversion',
  'Withdrawal': 'Neuroticism',
  'Volatility': 'Neuroticism',
  'Intellect': 'Openness',
  'Aesthetics': 'Openness',
} as const;

// Types for the scoring system
export type ResponseLevel = keyof typeof LEVEL_ENCODING;
export type AspectType = keyof typeof ASPECT_TO_TRAIT;
export type TraitType = typeof ASPECT_TO_TRAIT[AspectType];

export interface QuestionnaireItem {
  index: number;
  text: string;
  aspect: AspectType;
  reverse: boolean;
  candidates: string[];
}

export interface LinearModel {
  a: number;
  b: number;
}

export interface AspectModels {
  level_encoding: typeof LEVEL_ENCODING;
  linear_models: Record<AspectType, LinearModel>;
  aspects: AspectType[];
  per_level_avg: Record<ResponseLevel, Record<AspectType, number>>;
}

export interface Big5Results {
  aspectPercentiles: Record<AspectType, number>;
  traitPercentiles: Record<TraitType, number>;
  metadata: {
    version: string;
    computedAt: string;
    totalResponses: number;
    modelVersion: string;
  };
}

export interface Big5Profile extends Big5Results {
  narrative?: {
    summary: string;
    traits: Record<TraitType, string>;
    strengths: string[];
    growthAreas: string[];
  };
}

class Big5ScoringService {
  private items: QuestionnaireItem[] = [];
  private aspectModels: AspectModels | null = null;
  private readonly MODEL_VERSION = "1.0";

  constructor() {
    this.loadScoringData();
  }

  /**
   * Load item mapping and aspect models from JSON files
   */
  private loadScoringData(): void {
    try {
      // Load item mapping
      const itemMappingPath = join(process.cwd(), 'analysis_outputs', 'item_mapping.json');
      const itemMapping = JSON.parse(readFileSync(itemMappingPath, 'utf-8'));
      this.items = itemMapping.items;

      // Load aspect models
      const aspectModelsPath = join(process.cwd(), 'analysis_outputs', 'aspect_models.json');
      this.aspectModels = JSON.parse(readFileSync(aspectModelsPath, 'utf-8'));

      console.log(`[Big5] Loaded ${this.items.length} questionnaire items and aspect models`);
    } catch (error) {
      console.error('[Big5] Failed to load scoring data:', error);
      throw new Error('Failed to initialize Big 5 scoring service');
    }
  }

  /**
   * Encode response level to numeric value
   */
  private encodeLevel(level: ResponseLevel): number {
    return LEVEL_ENCODING[level];
  }

  /**
   * Score individual item with reverse-keying if needed
   */
  private scoreItem(levelValue: number, reverse: boolean): number {
    return reverse ? -levelValue : levelValue;
  }

  /**
   * Aggregate traits from aspect percentiles
   */
  private aggregateTraitsFromAspects(aspectPercentiles: Record<AspectType, number>): Record<TraitType, number> {
    const traitGroups: Record<TraitType, number[]> = {
      'Agreeableness': [],
      'Conscientiousness': [],
      'Extraversion': [],
      'Neuroticism': [],
      'Openness': [],
    };

    // Group aspect percentiles by their parent trait
    for (const [aspect, percentile] of Object.entries(aspectPercentiles) as [AspectType, number][]) {
      const trait = ASPECT_TO_TRAIT[aspect];
      traitGroups[trait].push(percentile);
    }

    // Calculate mean percentile for each trait
    const traitPercentiles: Record<TraitType, number> = {} as Record<TraitType, number>;
    for (const [trait, values] of Object.entries(traitGroups) as [TraitType, number[]][]) {
      traitPercentiles[trait] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }

    return traitPercentiles;
  }

  /**
   * Generate personality insights and narratives from Big 5 results
   */
  private generateNarrative(traitPercentiles: Record<TraitType, number>): Big5Profile['narrative'] {
    const getTraitDescription = (trait: TraitType, percentile: number): string => {
      const level = percentile >= 70 ? 'high' : percentile <= 30 ? 'low' : 'moderate';
      
      const descriptions = {
        'Agreeableness': {
          high: 'highly cooperative, trusting, and compassionate toward others',
          moderate: 'balanced between cooperation and self-advocacy',
          low: 'more competitive, skeptical, and focused on personal interests'
        },
        'Conscientiousness': {
          high: 'highly organized, disciplined, and goal-oriented',
          moderate: 'reasonably organized with a balance of structure and flexibility',
          low: 'more spontaneous, flexible, and adaptable to changing situations'
        },
        'Extraversion': {
          high: 'highly social, energetic, and enthusiastic in group settings',
          moderate: 'comfortable in both social and solitary situations',
          low: 'more introverted, preferring quieter environments and smaller groups'
        },
        'Neuroticism': {
          high: 'more sensitive to stress and prone to emotional fluctuations',
          moderate: 'generally emotionally stable with occasional stress responses',
          low: 'highly emotionally stable and resilient under pressure'
        },
        'Openness': {
          high: 'highly creative, curious, and open to new experiences',
          moderate: 'balanced between tradition and innovation',
          low: 'more practical, traditional, and focused on proven approaches'
        }
      };

      return descriptions[trait][level];
    };

    const traitDescriptions: Record<TraitType, string> = {} as Record<TraitType, string>;
    const strengths: string[] = [];
    const growthAreas: string[] = [];

    for (const [trait, percentile] of Object.entries(traitPercentiles) as [TraitType, number][]) {
      traitDescriptions[trait] = getTraitDescription(trait, percentile);
      
      // Identify strengths (high percentiles)
      if (percentile >= 70) {
        if (trait === 'Agreeableness') strengths.push('Building strong relationships');
        if (trait === 'Conscientiousness') strengths.push('Achieving goals consistently');
        if (trait === 'Extraversion') strengths.push('Energizing social interactions');
        if (trait === 'Openness') strengths.push('Embracing new experiences');
        if (trait === 'Neuroticism' && percentile <= 30) strengths.push('Maintaining emotional stability');
      }
      
      // Identify potential growth areas (very low or very high neuroticism)
      if (percentile <= 25) {
        if (trait === 'Agreeableness') growthAreas.push('Building trust and empathy');
        if (trait === 'Conscientiousness') growthAreas.push('Developing organizational skills');
        if (trait === 'Extraversion') growthAreas.push('Engaging in social connections');
        if (trait === 'Openness') growthAreas.push('Exploring new perspectives');
      }
      if (trait === 'Neuroticism' && percentile >= 75) {
        growthAreas.push('Managing stress and emotional regulation');
      }
    }

    // Generate overall summary
    const dominantTraits = Object.entries(traitPercentiles)
      .filter(([_, percentile]) => percentile >= 60)
      .map(([trait, _]) => trait.toLowerCase())
      .slice(0, 2);

    const summary = dominantTraits.length > 0
      ? `You show strong tendencies toward ${dominantTraits.join(' and ')}, which influences how you connect with others in relationships.`
      : 'You have a balanced personality profile that allows you to adapt well to different relationship dynamics.';

    return {
      summary,
      traits: traitDescriptions,
      strengths: strengths.slice(0, 4), // Top 4 strengths
      growthAreas: growthAreas.slice(0, 3), // Top 3 growth areas
    };
  }

  /**
   * Predict Big 5 percentiles from questionnaire responses
   */
  public predictFromResponses(responses: ResponseLevel[]): Big5Results {
    if (!this.aspectModels) {
      throw new Error('Scoring models not loaded');
    }

    if (responses.length !== this.items.length) {
      throw new Error(`Response length (${responses.length}) must match items (${this.items.length})`);
    }

    // Convert responses to encoded values and group by aspect
    const aspectValues: Record<AspectType, number[]> = {
      'Compassion': [],
      'Politeness': [],
      'Industriousness': [],
      'Orderliness': [],
      'Enthusiasm': [],
      'Assertiveness': [],
      'Withdrawal': [],
      'Volatility': [],
      'Intellect': [],
      'Aesthetics': [],
    };

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const item = this.items[i];
      
      const encodedValue = this.encodeLevel(response);
      const scoredValue = this.scoreItem(encodedValue, item.reverse);
      
      aspectValues[item.aspect].push(scoredValue);
    }

    // Calculate mean level per aspect
    const aspectMeanLevels: Record<AspectType, number> = {} as Record<AspectType, number>;
    for (const [aspect, values] of Object.entries(aspectValues) as [AspectType, number[]][]) {
      aspectMeanLevels[aspect] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }

    // Predict percentiles using linear models
    const aspectPercentiles: Record<AspectType, number> = {} as Record<AspectType, number>;
    for (const [aspect, meanLevel] of Object.entries(aspectMeanLevels) as [AspectType, number][]) {
      const model = this.aspectModels.linear_models[aspect];
      aspectPercentiles[aspect] = Math.max(0, Math.min(100, model.a * meanLevel + model.b));
    }

    // Aggregate to Big 5 traits
    const traitPercentiles = this.aggregateTraitsFromAspects(aspectPercentiles);

    return {
      aspectPercentiles,
      traitPercentiles,
      metadata: {
        version: this.MODEL_VERSION,
        computedAt: new Date().toISOString(),
        totalResponses: responses.length,
        modelVersion: this.MODEL_VERSION,
      },
    };
  }

  /**
   * Generate complete Big 5 profile with narrative insights
   */
  public generateBig5Profile(responses: ResponseLevel[]): Big5Profile {
    const results = this.predictFromResponses(responses);
    const narrative = this.generateNarrative(results.traitPercentiles);

    return {
      ...results,
      narrative,
    };
  }

  /**
   * Validate questionnaire responses
   */
  public validateResponses(responses: ResponseLevel[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(responses)) {
      errors.push('Responses must be an array');
      return { valid: false, errors };
    }

    if (responses.length !== 100) {
      errors.push(`Expected 100 responses, got ${responses.length}`);
    }

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (!Object.keys(LEVEL_ENCODING).includes(response)) {
        errors.push(`Invalid response level at index ${i}: ${response}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get questionnaire items for frontend display
   */
  public getQuestionnaireItems(): QuestionnaireItem[] {
    return this.items;
  }

  /**
   * Get personality statements text for display
   */
  public getStatements(): string[] {
    return this.items.map(item => item.text);
  }
}

// Export singleton instance
export const big5ScoringService = new Big5ScoringService();
export default big5ScoringService;