/**
 * Tests for self-improvement system
 * Run with: node src/kairos/test/self-improvement.js
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Test modules
const analytics = require('../core/analytics');
const advancedMemory = require('../core/advanced-memory');
const adaptiveRouting = require('../core/adaptive-routing');
const advancedPlanning = require('../core/advanced-planning');
const feedbackEngine = require('../core/feedback-engine');
const versionManager = require('../core/version-manager');
const dataMigration = require('../core/data-migration');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed += 1;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    testsFailed += 1;
  }
}

// Analytics Tests
console.log('\n📊 Analytics Module Tests');
console.log('─'.repeat(50));

test('recordMetric stores performance data', () => {
  const metric = analytics.recordMetric({
    modelId: 'test-model',
    taskType: 'coding',
    duration: 1000,
    success: true,
    qualityScore: 8.5
  });
  assert(metric.modelId === 'test-model');
  assert(metric.success === true);
});

test('getModelMetrics retrieves stored metrics', () => {
  const metrics = analytics.getModelMetrics('test-model', 10);
  assert(Array.isArray(metrics));
});

test('getModelSuccessRate calculates success percentage', () => {
  const rate = analytics.getModelSuccessRate('test-model');
  assert(rate === null || typeof rate === 'number');
});

test('getPerformanceSummary returns all model stats', () => {
  const summary = analytics.getPerformanceSummary();
  assert(Array.isArray(summary));
});

// Advanced Memory Tests
console.log('\n🧠 Advanced Memory Module Tests');
console.log('─'.repeat(50));

test('addMemory stores semantic memory', () => {
  const memory = advancedMemory.addMemory({
    content: 'Test memory entry'
  }, 'shortTerm');
  assert(memory.id);
  assert(memory.content === 'Test memory entry');
  assert(memory.tier === 'shortTerm');
});

test('createSemanticVector generates word frequency vectors', () => {
  const vector = advancedMemory.createSemanticVector('hello world hello');
  assert(vector.hello === 2);
  assert(vector.world === 1);
});

test('cosineSimilarity calculates vector similarity', () => {
  const vec1 = { hello: 2, world: 1 };
  const vec2 = { hello: 1, world: 2 };
  const similarity = advancedMemory.cosineSimilarity(vec1, vec2);
  assert(similarity > 0 && similarity <= 1);
});

test('retrieveMemories finds semantically similar entries', () => {
  const memories = advancedMemory.retrieveMemories('test query', 5);
  assert(Array.isArray(memories));
});

test('getMemoryStats returns memory statistics', () => {
  const stats = advancedMemory.getMemoryStats();
  assert(typeof stats.totalEntries === 'number');
  assert(typeof stats.averageRelevance === 'number');
});

// Adaptive Routing Tests
console.log('\n🎯 Adaptive Routing Module Tests');
console.log('─'.repeat(50));

test('calculateAdaptiveScore computes model score', () => {
  const score = adaptiveRouting.calculateAdaptiveScore('test-model', 'coding');
  assert(typeof score === 'number');
  assert(score >= 0 && score <= 10);
});

test('recommendModelForTask returns routing recommendation', () => {
  const rec = adaptiveRouting.recommendModelForTask('coding', 'balanced');
  assert(rec !== null);
  assert(rec.reason);
  assert(typeof rec.confidence === 'number');
});

test('getModelComparison compares all models', () => {
  const comparison = adaptiveRouting.getModelComparison('coding');
  assert(typeof comparison === 'object');
});

test('getRoutingInsights generates routing analysis', () => {
  const insights = adaptiveRouting.getRoutingInsights();
  assert(insights.timestamp);
  assert(insights.recommendations);
  assert(Array.isArray(insights.suggestions));
});

// Advanced Planning Tests
console.log('\n📋 Advanced Planning Module Tests');
console.log('─'.repeat(50));

test('TreeSearchPlanner creates plan nodes', () => {
  const planner = new advancedPlanning.TreeSearchPlanner('Test goal');
  assert(planner.root);
  assert(planner.root.goal === 'Test goal');
});

test('TreeSearchPlanner searches for plans', () => {
  const planner = new advancedPlanning.TreeSearchPlanner('Test goal', 3, 2);
  const plans = planner.search();
  assert(Array.isArray(plans));
  assert(plans.length > 0);
});

test('GraphPlanner handles dependencies', () => {
  const planner = new advancedPlanning.GraphPlanner('Deploy app');
  planner.addTask('plan', 'Create plan', 1);
  planner.addTask('implement', 'Implement', 3, ['plan']);
  const sorted = planner.topologicalSort();
  assert(sorted[0].id === 'plan');
  assert(sorted[1].id === 'implement');
});

test('GraphPlanner finds critical path', () => {
  const planner = new advancedPlanning.GraphPlanner('Deploy');
  planner.addTask('a', 'Task A', 2);
  planner.addTask('b', 'Task B', 3, ['a']);
  const critical = planner.getCriticalPath();
  assert(critical.duration >= 0);
});

test('MonteCarloPlanner runs MCTS', () => {
  const planner = new advancedPlanning.MonteCarloPlanner('Test goal', 10);
  const plans = planner.search();
  assert(Array.isArray(plans));
});

test('createAdvancedPlan supports multiple methods', () => {
  const treePlan = advancedPlanning.createAdvancedPlan('Goal', 'tree');
  const graphPlan = advancedPlanning.createAdvancedPlan('Goal', 'graph');
  const mcPlan = advancedPlanning.createAdvancedPlan('Goal', 'monte-carlo');
  assert(Array.isArray(treePlan) || typeof treePlan === 'object');
  assert(graphPlan);
  assert(Array.isArray(mcPlan));
});

// Feedback Engine Tests
console.log('\n📧 Feedback Engine Module Tests');
console.log('─'.repeat(50));

test('loadCheckInSchedule initializes schedule', () => {
  const schedule = feedbackEngine.loadCheckInSchedule();
  assert(schedule.nextWeeklyCheckIn);
  assert(schedule.nextMonthlyCheckIn);
});

test('generateFeedback creates feedback report', () => {
  const feedback = feedbackEngine.generateFeedback('weekly');
  assert(feedback.timestamp);
  assert(feedback.type === 'weekly');
  assert(Array.isArray(feedback.recommendations));
});

test('formatFeedback returns display string', () => {
  const feedback = feedbackEngine.generateFeedback('weekly');
  const formatted = feedbackEngine.formatFeedback(feedback);
  assert(typeof formatted === 'string');
  assert(formatted.includes('Self-Improvement'));
});

test('recordFeedback saves to history', () => {
  const feedback = feedbackEngine.generateFeedback('weekly');
  feedbackEngine.recordFeedback(feedback);
  const recent = feedbackEngine.getRecentFeedback(1);
  assert(recent.length > 0);
});

// Version Manager Tests
console.log('\n📦 Version Manager Module Tests');
console.log('─'.repeat(50));

test('getCurrentVersion returns version string', () => {
  const version = versionManager.getCurrentVersion();
  assert(typeof version === 'string');
});

test('loadVersionHistory initializes history', () => {
  const history = versionManager.loadVersionHistory();
  assert(history.createdAt);
  assert(Array.isArray(history.upgrades));
});

test('recordUpgrade tracks version changes', () => {
  versionManager.recordUpgrade('2.0.0', '2.1.0', 'Test upgrade');
  const history = versionManager.loadVersionHistory();
  assert(history.upgrades.length > 0);
});

test('recordRollback tracks downgrades', () => {
  versionManager.recordRollback('2.1.0', '2.0.0', 'Test rollback');
  const history = versionManager.loadVersionHistory();
  assert(history.rollbacks.length > 0);
});

test('getMigrationGuide returns instructions', () => {
  const guide = versionManager.getMigrationGuide('2.0.0', '2.1.0');
  assert(guide.title);
  assert(Array.isArray(guide.migrations));
});

test('getDataCompatibility checks version match', () => {
  const compat = versionManager.getDataCompatibility('2.1.0', '2.1.0');
  assert(compat.compatible === true);

  const incompatible = versionManager.getDataCompatibility('1.0.0', '2.0.0');
  assert(incompatible.compatible === false);
});

// Data Migration Tests
console.log('\n💾 Data Migration Module Tests');
console.log('─'.repeat(50));

test('validateBackup checks file integrity', () => {
  const result = dataMigration.validateBackup('/nonexistent/path');
  assert(result.valid === false);
});

test('showMigrationOptions returns available upgrades', () => {
  const options = dataMigration.showMigrationOptions();
  assert(Array.isArray(options));
});

// Summary
console.log('\n' + '═'.repeat(50));
console.log(`\n✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}\n`);

if (testsFailed > 0) {
  process.exit(1);
}
