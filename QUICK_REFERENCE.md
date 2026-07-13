# Kairos V2 Self-Improvement - Quick Reference

## 📦 What You Get

7 new modules + comprehensive testing + full documentation addressing all weak points.

## 🔧 Installation

All modules are included in this commit. No external dependencies needed.

```bash
# Verify installation
node src/kairos/test/self-improvement.js
# Expected: ✅ Tests Passed: 31
```

## 📚 Module Reference

### 1. Analytics (`analytics.js`)
Track performance metrics

```javascript
const analytics = require('./core/analytics');

// Record a metric
analytics.recordMetric({
  modelId: 'claude-3',
  taskType: 'coding',
  duration: 2500,
  success: true,
  qualityScore: 8.5
});

// Get statistics
const summary = analytics.getPerformanceSummary();
const success = analytics.getModelSuccessRate('claude-3');
```

### 2. Advanced Memory (`advanced-memory.js`)
Semantic memory with RAG

```javascript
const memory = require('./core/advanced-memory');

// Add memory
memory.addMemory({
  content: 'User prefers Claude for reasoning',
  metadata: { category: 'preference' }
}, 'longTerm');

// Retrieve by similarity
const similar = memory.retrieveMemories('model selection', 5);

// Get augmented context
const context = memory.getAugmentedContext('Which model?', 3);
```

### 3. Adaptive Routing (`adaptive-routing.js`)
Smart model selection

```javascript
const routing = require('./core/adaptive-routing');

// Get recommendation
const model = routing.recommendModelForTask('coding', 'balanced');
// Returns: { id, reason, confidence, adaptiveScore }

// Get insights
const insights = routing.getRoutingInsights();
```

### 4. Advanced Planning (`advanced-planning.js`)
Multiple planning strategies

```javascript
const planning = require('./core/advanced-planning');

// Create plan using different methods
const tree = planning.createAdvancedPlan(goal, 'tree');
const graph = planning.createAdvancedPlan(goal, 'graph');
const mcts = planning.createAdvancedPlan(goal, 'monte-carlo');
```

### 5. Feedback Engine (`feedback-engine.js`)
Periodic recommendations

```javascript
const feedback = require('./core/feedback-engine');

// Check for due feedback
const results = feedback.checkIn();
if (results.length > 0) {
  console.log(results[0].formatted);
}

// Generate on-demand
const report = feedback.generateFeedback('weekly');
```

### 6. Version Manager (`version-manager.js`)
Version tracking & migration

```javascript
const version = require('./core/version-manager');

// Export data
const backupPath = version.exportUserData();

// Import data
version.importUserData(backupPath, {
  importAnalytics: true,
  importMemories: true
});

// Check compatibility
const compat = version.getDataCompatibility('2.0.0', '2.1.0');
```

### 7. Data Migration (`data-migration.js`)
Backup & restore utilities

```javascript
const migration = require('./core/data-migration');

// Full backup
const { backupPath } = migration.createFullBackup();

// Validate backup
const valid = migration.validateBackup(backupPath);

// Restore
migration.restoreFromBackup(backupPath);
```

---

## 🎯 Common Tasks

### Record Model Performance
```javascript
const analytics = require('./analytics');

recordMetric({
  modelId: activeModel.id,
  taskType: 'coding',
  duration: Date.now() - startTime,
  success: !error,
  qualityScore: assessOutput(result)
});
```

### Learn from Mistakes
```javascript
const memory = require('./advanced-memory');

if (error && shouldLearn) {
  memory.addMemory({
    content: `${modelId} failed on ${taskType}: ${error.message}`,
    metadata: { error: true, modelId, taskType }
  }, 'episodic');
}
```

### Get Best Model
```javascript
const routing = require('./adaptive-routing');

const rec = routing.recommendModelForTask('coding', 'balanced');
console.log(`Using ${rec.id} (${rec.confidence * 100}% confidence)`);
```

### Show User Feedback
```javascript
const feedback = require('./feedback-engine');

// Automatic weekly/monthly
const results = feedback.checkIn();
for (const result of results) {
  console.log(result.formatted);
}
```

### Backup Before Update
```javascript
const version = require('./version-manager');

// Before upgrade
const backup = version.exportUserData();
console.log(`Backup created: ${backup}`);

// After upgrade
version.recordUpgrade(oldVersion, newVersion);
```

---

## 📊 Data Locations

All data stored locally in `~/.kairos/`:

```
~/.kairos/
├── analytics/
│   └── metrics.jsonl           # Performance data
├── advanced-memory/
│   └── semantic-index.jsonl    # Memory entries
├── feedback/
│   ├── history.jsonl           # Feedback reports
│   └── check-in-schedule.json  # Schedule
└── versions/
    ├── history.json            # Version history
    └── user-data-*.json        # Backups
```

---

## ✅ Integration Checklist

- [ ] Import modules in agent loop
- [ ] Add `recordMetric()` after tasks
- [ ] Add `addMemory()` for lessons
- [ ] Use `recommendModelForTask()` for selection
- [ ] Call `checkIn()` periodically
- [ ] Export data before updates
- [ ] Test: `npm run test:self-improvement`

---

## 🚨 Troubleshooting

### Tests failing
```bash
node src/kairos/test/self-improvement.js
# Should show: ✅ Tests Passed: 31
```

### Memory growing too large
```javascript
const memory = require('./advanced-memory');
memory.decayMemories(); // Remove old entries
```

### Reset analytics (warning: destructive)
```javascript
const analytics = require('./analytics');
analytics.clearAnalytics();
```

### Check data compatibility
```javascript
const version = require('./version-manager');
const compat = version.getDataCompatibility('2.0.0', '2.1.0');
console.log(compat); // { compatible: true/false, ... }
```

---

## 📖 Documentation

- **User Guide**: `docs/SELF_IMPROVEMENT_GUIDE.md`
- **Implementation Details**: `SELF_IMPROVEMENT_IMPLEMENTATION.md`
- **Completion Summary**: `IMPLEMENTATION_COMPLETE.md`
- **Test Suite**: `src/kairos/test/self-improvement.js`

---

## 🎓 Example: Full Integration

```javascript
// In your agent loop

const analytics = require('./analytics');
const memory = require('./advanced-memory');
const routing = require('./adaptive-routing');
const feedback = require('./feedback-engine');

async function executeTask(goal) {
  const startTime = Date.now();
  
  // 1. Get smart recommendation
  const model = routing.recommendModelForTask(goal.type);
  
  // 2. Execute task
  let result, error = null;
  try {
    result = await callModel(model.id, goal);
  } catch (e) {
    error = e;
  }
  
  // 3. Record metrics
  analytics.recordMetric({
    modelId: model.id,
    taskType: goal.type,
    duration: Date.now() - startTime,
    success: !error,
    qualityScore: assessQuality(result)
  });
  
  // 4. Learn from experience
  if (error) {
    memory.addMemory({
      content: `${model.id} failed: ${error.message}`,
      metadata: { error: true, type: goal.type }
    }, 'episodic');
  } else {
    memory.addMemory({
      content: `${model.id} succeeded on ${goal.type}`,
      metadata: { success: true, type: goal.type }
    }, 'episodic');
  }
  
  // 5. Check for feedback (hourly)
  if (shouldCheckIn()) {
    const results = feedback.checkIn();
    if (results.length > 0) {
      notifyUser(results[0].formatted);
    }
  }
  
  return result;
}
```

---

## 🔗 API Summary

| Module | Functions |
|--------|-----------|
| **Analytics** | `recordMetric`, `getPerformanceSummary`, `getModelSuccessRate` |
| **Memory** | `addMemory`, `retrieveMemories`, `getAugmentedContext`, `decayMemories` |
| **Routing** | `recommendModelForTask`, `getRoutingInsights`, `getModelComparison` |
| **Planning** | `createAdvancedPlan`, `TreeSearchPlanner`, `GraphPlanner`, `MonteCarloPlanner` |
| **Feedback** | `checkIn`, `generateFeedback`, `formatFeedback`, `getRecentFeedback` |
| **Version** | `exportUserData`, `importUserData`, `recordUpgrade`, `getDataCompatibility` |
| **Migration** | `createFullBackup`, `restoreFromBackup`, `validateBackup`, `mergeBackups` |

---

## 📈 Performance Tips

1. **Batch metrics**: Collect metrics, then call `recordMetric()` once
2. **Limit memory retrieval**: Use `limit` parameter (default 5)
3. **Periodic decay**: Call `decayMemories()` monthly
4. **Archive old feedback**: Export and archive old feedback reports
5. **Version checkpoints**: Export before major updates

---

## 🎉 You're Ready!

Your Kairos agent now has:
- ✅ Smart memory system
- ✅ Adaptive routing
- ✅ Advanced planning
- ✅ Self-improvement feedback
- ✅ Safe data migration

Start using it today! 🚀

---

**Version**: 2.1.0+  
**Status**: ✅ Production Ready  
**Tests**: 31/31 passing  
**Backward Compatible**: ✅ Yes
