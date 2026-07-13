const { PROVIDERS, BUDGET_MODES } = require('./model-router');
const { getModelMetrics, getModelSuccessRate, getModelQuality, getAverageDuration } = require('./analytics');

/**
 * Calculate adaptive score based on performance metrics
 */
function calculateAdaptiveScore(modelId, taskType) {
  const successRate = getModelSuccessRate(modelId) || 50;
  const quality = getModelQuality(modelId) || 5;
  const duration = getAverageDuration(modelId, taskType) || 5000;

  // Normalize scores to 0-10 range
  const successScore = (successRate / 100) * 10;
  const qualityScore = quality; // already 0-10
  const speedScore = Math.max(0, 10 - (duration / 1000)); // faster = higher score

  // Weighted average: quality 40%, success 35%, speed 25%
  const adaptiveScore = (qualityScore * 0.4) + (successScore * 0.35) + (speedScore * 0.25);

  return Math.min(10, Math.max(0, adaptiveScore));
}

/**
 * Get recommended model for a task using adaptive routing
 */
function recommendModelForTask(taskType, budgetMode = 'balanced') {
  const providersById = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));
  const validModes = BUDGET_MODES;

  if (!validModes.includes(budgetMode)) {
    throw new Error(`Invalid budget mode: ${budgetMode}`);
  }

  // Get base routing from fixed strategy
  const baseRouting = require('./model-router').routeModels(budgetMode);

  // Map task type to routing role
  const roleMap = {
    planning: 'planner',
    coding: 'builder',
    review: 'reviewer',
    testing: 'tester',
    packaging: 'packager',
    default: 'builder'
  };

  const role = roleMap[taskType] || roleMap.default;
  const baseModel = baseRouting[role];

  if (!baseModel) return null;

  // Check if we have performance data for the model
  const metrics = getModelMetrics(baseModel.id, 100);

  // If insufficient data, use base model
  if (metrics.length < 5) {
    return {
      ...baseModel,
      reason: 'insufficient_data',
      confidence: 0.3,
      adaptiveScore: calculateAdaptiveScore(baseModel.id, taskType)
    };
  }

  // Get adaptive score
  const adaptiveScore = calculateAdaptiveScore(baseModel.id, taskType);

  // If performance is good (>7/10), stick with it
  if (adaptiveScore >= 7) {
    return {
      ...baseModel,
      reason: 'high_performance',
      confidence: 0.9,
      adaptiveScore
    };
  }

  // If performance is mediocre, consider alternatives
  if (adaptiveScore >= 5 && adaptiveScore < 7) {
    // Try to find a better alternative from available providers
    const candidates = PROVIDERS.filter((p) => p.provider !== 'local' || p.offline);
    let bestAlternative = baseModel;
    let bestScore = adaptiveScore;

    for (const candidate of candidates) {
      if (candidate.id === baseModel.id) continue;
      const candidateScore = calculateAdaptiveScore(candidate.id, taskType);
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestAlternative = candidate;
      }
    }

    if (bestAlternative.id !== baseModel.id) {
      return {
        ...bestAlternative,
        reason: 'better_alternative_found',
        confidence: 0.7,
        adaptiveScore: bestScore,
        previousModel: baseModel.id
      };
    }
  }

  // Performance is poor (<5), try alternatives
  if (adaptiveScore < 5) {
    const candidates = PROVIDERS.filter((p) => p.provider !== 'local' || p.offline);
    let bestAlternative = baseModel;
    let bestScore = adaptiveScore;

    for (const candidate of candidates) {
      if (candidate.id === baseModel.id) continue;
      const candidateScore = calculateAdaptiveScore(candidate.id, taskType);
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestAlternative = candidate;
      }
    }

    return {
      ...bestAlternative,
      reason: 'performance_improvement_needed',
      confidence: 0.6,
      adaptiveScore: bestScore,
      previousModel: baseModel.id,
      previousScore: adaptiveScore
    };
  }

  return {
    ...baseModel,
    reason: 'base_recommendation',
    confidence: 0.5,
    adaptiveScore
  };
}

/**
 * Get performance comparison across models for a task
 */
function getModelComparison(taskType) {
  const comparison = {};

  for (const provider of PROVIDERS) {
    const successRate = getModelSuccessRate(provider.id) || 0;
    const quality = getModelQuality(provider.id) || 0;
    const duration = getAverageDuration(provider.id, taskType) || 0;
    const adaptiveScore = calculateAdaptiveScore(provider.id, taskType);
    const metrics = getModelMetrics(provider.id, 100);

    comparison[provider.id] = {
      provider: provider.provider,
      offline: provider.offline,
      successRate: Math.round(successRate * 100) / 100,
      averageQuality: Math.round(quality * 100) / 100,
      averageDuration: Math.round(duration),
      adaptiveScore: Math.round(adaptiveScore * 100) / 100,
      samplesAvailable: metrics.length,
      notes: provider.notes
    };
  }

  return comparison;
}

/**
 * Get routing recommendations with explanations
 */
function getRoutingInsights() {
  const insights = {
    timestamp: new Date().toISOString(),
    recommendations: {},
    patterns: {},
    suggestions: []
  };

  const taskTypes = ['planning', 'coding', 'review', 'testing', 'packaging'];

  for (const taskType of taskTypes) {
    const recommendation = recommendModelForTask(taskType, 'balanced');
    if (recommendation) {
      insights.recommendations[taskType] = {
        modelId: recommendation.id,
        reason: recommendation.reason,
        confidence: recommendation.confidence,
        adaptiveScore: recommendation.adaptiveScore
      };
    }
  }

  // Analyze patterns
  const allComparisons = {};
  for (const taskType of taskTypes) {
    allComparisons[taskType] = getModelComparison(taskType);
  }

  // Find best performers
  const modelScores = {};
  for (const taskType of taskTypes) {
    const comparison = allComparisons[taskType];
    for (const [modelId, stats] of Object.entries(comparison)) {
      if (!modelScores[modelId]) {
        modelScores[modelId] = [];
      }
      modelScores[modelId].push(stats.adaptiveScore);
    }
  }

  // Generate suggestions
  for (const [modelId, scores] of Object.entries(modelScores)) {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgScore > 7) {
      insights.suggestions.push(`✓ ${modelId} is performing well (avg score: ${Math.round(avgScore * 10) / 10})`);
    } else if (avgScore < 4) {
      insights.suggestions.push(`⚠ ${modelId} may need attention (avg score: ${Math.round(avgScore * 10) / 10})`);
    }
  }

  insights.allComparisons = allComparisons;

  return insights;
}

/**
 * Format routing insights for user display
 */
function formatRoutingInsights(insights) {
  const lines = [
    '📊 Model Routing Insights',
    '='.repeat(50),
    ''
  ];

  lines.push('Current Recommendations:');
  for (const [taskType, rec] of Object.entries(insights.recommendations)) {
    const confidence = Math.round(rec.confidence * 100);
    lines.push(
      `  ${taskType}: ${rec.modelId} (${confidence}% confidence, score: ${Math.round(rec.adaptiveScore * 10) / 10}/10)`
    );
  }

  lines.push('');
  lines.push('Suggestions:');
  for (const suggestion of insights.suggestions) {
    lines.push(`  ${suggestion}`);
  }

  return lines.join('\n');
}

module.exports = {
  calculateAdaptiveScore,
  formatRoutingInsights,
  getModelComparison,
  getRoutingInsights,
  recommendModelForTask
};
