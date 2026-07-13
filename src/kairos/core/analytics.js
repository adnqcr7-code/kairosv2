const fs = require('node:fs');
const path = require('node:path');
const { kairosDataDir } = require('./storage');

function analyticsDir() {
  return path.join(kairosDataDir(), 'analytics');
}

function analyticsDbPath() {
  return path.join(analyticsDir(), 'metrics.jsonl');
}

function ensureAnalyticsDir() {
  fs.mkdirSync(analyticsDir(), { recursive: true });
}

function sanitizeMetric(metric) {
  return {
    timestamp: metric.timestamp || new Date().toISOString(),
    modelId: String(metric.modelId || 'unknown').slice(0, 50),
    taskType: String(metric.taskType || 'unknown').slice(0, 30),
    duration: Math.max(0, Number(metric.duration) || 0),
    success: metric.success === true,
    costEstimate: Math.max(0, Number(metric.costEstimate) || 0),
    qualityScore: Math.max(0, Math.min(10, Number(metric.qualityScore) || 0)),
    toolsUsed: Array.isArray(metric.toolsUsed) ? metric.toolsUsed.slice(0, 10) : [],
    errorCode: metric.errorCode ? String(metric.errorCode).slice(0, 30) : null,
    metadata: typeof metric.metadata === 'object' ? metric.metadata : {}
  };
}

/**
 * Record a performance metric for a model/task combination
 */
function recordMetric(data = {}) {
  ensureAnalyticsDir();
  const metric = sanitizeMetric(data);

  fs.appendFileSync(analyticsDbPath(), `${JSON.stringify(metric)}\n`, 'utf8');
  return metric;
}

/**
 * Get metrics for a specific model
 */
function getModelMetrics(modelId, limit = 100) {
  const filePath = analyticsDbPath();
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((metric) => metric.modelId === modelId)
    .slice(-limit);
}

/**
 * Get metrics by task type
 */
function getTaskMetrics(taskType, limit = 100) {
  const filePath = analyticsDbPath();
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((metric) => metric.taskType === taskType)
    .slice(-limit);
}

/**
 * Calculate success rate for a model
 */
function getModelSuccessRate(modelId) {
  const metrics = getModelMetrics(modelId, 1000);
  if (!metrics.length) return null;

  const successes = metrics.filter((m) => m.success).length;
  return (successes / metrics.length) * 100;
}

/**
 * Calculate average quality score for a model
 */
function getModelQuality(modelId) {
  const metrics = getModelMetrics(modelId, 1000);
  if (!metrics.length) return null;

  const total = metrics.reduce((sum, m) => sum + (m.qualityScore || 0), 0);
  return total / metrics.length;
}

/**
 * Calculate average duration for a model on a task
 */
function getAverageDuration(modelId, taskType) {
  const filePath = analyticsDbPath();
  if (!fs.existsSync(filePath)) return null;

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const metrics = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((metric) =>
      metric.modelId === modelId &&
      (!taskType || metric.taskType === taskType)
    );

  if (!metrics.length) return null;
  const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
  return total / metrics.length;
}

/**
 * Get performance summary for all models
 */
function getPerformanceSummary() {
  const filePath = analyticsDbPath();
  if (!fs.existsSync(filePath)) return {};

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const allMetrics = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const modelStats = {};

  for (const metric of allMetrics) {
    if (!modelStats[metric.modelId]) {
      modelStats[metric.modelId] = {
        modelId: metric.modelId,
        totalCalls: 0,
        successCount: 0,
        averageQuality: 0,
        averageDuration: 0,
        totalDuration: 0,
        totalQuality: 0,
        taskTypes: {},
        lastUsed: null
      };
    }

    const stats = modelStats[metric.modelId];
    stats.totalCalls += 1;
    stats.successCount += metric.success ? 1 : 0;
    stats.averageQuality = (stats.averageQuality * (stats.totalCalls - 1) + (metric.qualityScore || 0)) / stats.totalCalls;
    stats.totalDuration += metric.duration || 0;
    stats.averageDuration = stats.totalDuration / stats.totalCalls;
    stats.lastUsed = metric.timestamp;

    if (!stats.taskTypes[metric.taskType]) {
      stats.taskTypes[metric.taskType] = 0;
    }
    stats.taskTypes[metric.taskType] += 1;
  }

  return Object.values(modelStats);
}

/**
 * Export analytics data for backup/migration
 */
function exportAnalytics() {
  const filePath = analyticsDbPath();
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Import analytics data from backup
 */
function importAnalytics(data = []) {
  ensureAnalyticsDir();
  const filePath = analyticsDbPath();

  for (const metric of data) {
    if (metric && typeof metric === 'object') {
      fs.appendFileSync(filePath, `${JSON.stringify(metric)}\n`, 'utf8');
    }
  }

  return data.length;
}

/**
 * Clear analytics data (use with caution)
 */
function clearAnalytics() {
  ensureAnalyticsDir();
  const filePath = analyticsDbPath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  analyticsDir,
  analyticsDbPath,
  clearAnalytics,
  exportAnalytics,
  getAverageDuration,
  getModelMetrics,
  getModelQuality,
  getModelSuccessRate,
  getPerformanceSummary,
  getTaskMetrics,
  importAnalytics,
  recordMetric
};
