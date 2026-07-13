const fs = require('node:fs');
const path = require('node:path');
const { kairosDataDir } = require('./storage');
const { getPerformanceSummary, exportAnalytics } = require('./analytics');
const { getMemoryStats, exportMemories } = require('./advanced-memory');
const { getRoutingInsights } = require('./adaptive-routing');

function feedbackDir() {
  return path.join(kairosDataDir(), 'feedback');
}

function feedbackHistoryPath() {
  return path.join(feedbackDir(), 'history.jsonl');
}

function checkInSchedulePath() {
  return path.join(feedbackDir(), 'check-in-schedule.json');
}

function ensureFeedbackDir() {
  fs.mkdirSync(feedbackDir(), { recursive: true });
}

/**
 * Initialize check-in schedule
 */
function initializeCheckInSchedule() {
  return {
    lastWeeklyCheckIn: null,
    lastMonthlyCheckIn: null,
    nextWeeklyCheckIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    nextMonthlyCheckIn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    checkInIntervalDays: {
      weekly: 7,
      monthly: 30
    }
  };
}

/**
 * Load or create check-in schedule
 */
function loadCheckInSchedule() {
  ensureFeedbackDir();
  const schedulePath = checkInSchedulePath();

  if (!fs.existsSync(schedulePath)) {
    const schedule = initializeCheckInSchedule();
    fs.writeFileSync(schedulePath, JSON.stringify(schedule, null, 2));
    return schedule;
  }

  return JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
}

/**
 * Save check-in schedule
 */
function saveCheckInSchedule(schedule) {
  ensureFeedbackDir();
  fs.writeFileSync(checkInSchedulePath(), JSON.stringify(schedule, null, 2));
  return schedule;
}

/**
 * Check if weekly check-in is due
 */
function isWeeklyCheckInDue() {
  const schedule = loadCheckInSchedule();
  return new Date() >= new Date(schedule.nextWeeklyCheckIn);
}

/**
 * Check if monthly check-in is due
 */
function isMonthlyCheckInDue() {
  const schedule = loadCheckInSchedule();
  return new Date() >= new Date(schedule.nextMonthlyCheckIn);
}

/**
 * Generate feedback and recommendations
 */
function generateFeedback(type = 'weekly') {
  const analytics = getPerformanceSummary();
  const memoryStats = getMemoryStats();
  const routingInsights = getRoutingInsights();

  const feedback = {
    timestamp: new Date().toISOString(),
    type, // weekly or monthly
    analytics,
    memoryStats,
    routingInsights,
    recommendations: [],
    metrics: {}
  };

  // Generate recommendations based on analytics
  if (analytics.length > 0) {
    // Find best performer
    const bestModel = analytics.reduce((best, model) => {
      const modelScore = (model.averageQuality * 0.4) + ((model.successCount / model.totalCalls) * 10 * 0.35) + (Math.max(0, 10 - model.averageDuration / 1000) * 0.25);
      const bestScore = (best.averageQuality * 0.4) + ((best.successCount / best.totalCalls) * 10 * 0.35) + (Math.max(0, 10 - best.averageDuration / 1000) * 0.25);
      return modelScore > bestScore ? model : best;
    });

    feedback.recommendations.push({
      priority: 'high',
      category: 'model_performance',
      message: `✓ ${bestModel.modelId} is your best performer (${Math.round((bestModel.successCount / bestModel.totalCalls) * 100)}% success rate)`,
      action: `Consider using ${bestModel.modelId} as your default for ${type === 'weekly' ? 'critical tasks' : 'production'}`
    });

    // Find worst performer
    const worstModel = analytics.reduce((worst, model) => {
      const modelScore = (model.averageQuality * 0.4) + ((model.successCount / model.totalCalls) * 10 * 0.35) + (Math.max(0, 10 - model.averageDuration / 1000) * 0.25);
      const worstScore = (worst.averageQuality * 0.4) + ((worst.successCount / worst.totalCalls) * 10 * 0.35) + (Math.max(0, 10 - worst.averageDuration / 1000) * 0.25);
      return modelScore < worstScore ? model : worst;
    });

    if (worstModel.successCount / worstModel.totalCalls < 0.7) {
      feedback.recommendations.push({
        priority: 'medium',
        category: 'model_performance',
        message: `⚠ ${worstModel.modelId} has low success rate (${Math.round((worstModel.successCount / worstModel.totalCalls) * 100)}%)`,
        action: 'Consider replacing or retraining this model for better results'
      });
    }
  }

  // Memory recommendations
  if (memoryStats.totalEntries > 500) {
    feedback.recommendations.push({
      priority: 'low',
      category: 'memory_management',
      message: `ℹ Memory index has ${memoryStats.totalEntries} entries`,
      action: 'Run memory cleanup to optimize retrieval performance'
    });
  }

  if (memoryStats.averageRelevance < 0.5) {
    feedback.recommendations.push({
      priority: 'medium',
      category: 'memory_quality',
      message: 'Memory relevance is declining',
      action: 'Review and consolidate low-relevance memories'
    });
  }

  // Routing recommendations
  for (const suggestion of routingInsights.suggestions || []) {
    feedback.recommendations.push({
      priority: 'info',
      category: 'routing',
      message: suggestion,
      action: 'Monitor performance for decision on routing strategy'
    });
  }

  // Collect metrics
  feedback.metrics = {
    totalModelsTracked: analytics.length,
    totalMemoryEntries: memoryStats.totalEntries,
    averageMemoryRelevance: Math.round(memoryStats.averageRelevance * 100) / 100,
    topTaskTypes: Object.entries(memoryStats.byTier || {})
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  };

  return feedback;
}

/**
 * Save feedback to history
 */
function recordFeedback(feedback) {
  ensureFeedbackDir();
  fs.appendFileSync(feedbackHistoryPath(), `${JSON.stringify(feedback)}\n`, 'utf8');

  // Update schedule
  const schedule = loadCheckInSchedule();
  if (feedback.type === 'weekly') {
    schedule.lastWeeklyCheckIn = feedback.timestamp;
    schedule.nextWeeklyCheckIn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (feedback.type === 'monthly') {
    schedule.lastMonthlyCheckIn = feedback.timestamp;
    schedule.nextMonthlyCheckIn = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  saveCheckInSchedule(schedule);

  return feedback;
}

/**
 * Get recent feedback
 */
function getRecentFeedback(limit = 10) {
  const feedbackHistPath = feedbackHistoryPath();
  if (!fs.existsSync(feedbackHistPath)) return [];

  const lines = fs.readFileSync(feedbackHistPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  return lines
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Format feedback for display to user
 */
function formatFeedback(feedback) {
  const lines = [];

  lines.push('');
  lines.push('═'.repeat(60));
  lines.push(`  Kairos ${feedback.type.toUpperCase()} Self-Improvement Report`);
  lines.push(`  ${new Date(feedback.timestamp).toLocaleString()}`);
  lines.push('═'.repeat(60));
  lines.push('');

  if (feedback.recommendations.length > 0) {
    lines.push('📋 Recommendations:');
    lines.push('─'.repeat(60));

    // Group by priority
    const byPriority = {};
    for (const rec of feedback.recommendations) {
      if (!byPriority[rec.priority]) byPriority[rec.priority] = [];
      byPriority[rec.priority].push(rec);
    }

    for (const priority of ['high', 'medium', 'low', 'info']) {
      const recs = byPriority[priority];
      if (recs && recs.length > 0) {
        for (const rec of recs) {
          const icon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : priority === 'low' ? '🟢' : 'ℹ️';
          lines.push(`${icon} ${rec.message}`);
          lines.push(`   → ${rec.action}`);
        }
        if (recs.length > 0) lines.push('');
      }
    }
  }

  if (feedback.metrics) {
    lines.push('📊 Metrics:');
    lines.push('─'.repeat(60));
    lines.push(`  • Models tracked: ${feedback.metrics.totalModelsTracked}`);
    lines.push(`  • Memory entries: ${feedback.metrics.totalMemoryEntries}`);
    lines.push(`  • Avg memory relevance: ${feedback.metrics.averageMemoryRelevance * 100}%`);
    lines.push('');
  }

  lines.push('💡 Next Steps:');
  lines.push('─'.repeat(60));
  lines.push('  1. Review the recommendations above');
  lines.push('  2. Export your data: kairos --export-data');
  lines.push('  3. Consider model updates if available');
  lines.push('  4. Check back next ' + (feedback.type === 'weekly' ? 'week' : 'month') + ' for the next report');
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('');

  return lines.join('\n');
}

/**
 * Trigger check-in (called periodically)
 */
function checkIn() {
  const results = [];

  if (isWeeklyCheckInDue()) {
    const feedback = generateFeedback('weekly');
    recordFeedback(feedback);
    results.push({
      type: 'weekly',
      feedback,
      formatted: formatFeedback(feedback)
    });
  }

  if (isMonthlyCheckInDue()) {
    const feedback = generateFeedback('monthly');
    recordFeedback(feedback);
    results.push({
      type: 'monthly',
      feedback,
      formatted: formatFeedback(feedback)
    });
  }

  return results;
}

module.exports = {
  checkIn,
  checkInSchedulePath,
  ensureFeedbackDir,
  feedbackDir,
  feedbackHistoryPath,
  formatFeedback,
  generateFeedback,
  getRecentFeedback,
  initializeCheckInSchedule,
  isMonthlyCheckInDue,
  isWeeklyCheckInDue,
  loadCheckInSchedule,
  recordFeedback,
  saveCheckInSchedule
};
