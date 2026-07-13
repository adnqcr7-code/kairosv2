const fs = require('node:fs');
const path = require('node:path');
const { kairosDataDir } = require('./storage');
const { exportAnalytics, importAnalytics } = require('./analytics');
const { exportMemories, importMemories } = require('./advanced-memory');

function versionDir() {
  return path.join(kairosDataDir(), 'versions');
}

function versionHistoryPath() {
  return path.join(versionDir(), 'history.json');
}

function exportDataPath(version) {
  return path.join(versionDir(), `backup-${version}.zip`);
}

function ensureVersionDir() {
  fs.mkdirSync(versionDir(), { recursive: true });
}

/**
 * Get current Kairos version
 */
function getCurrentVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', '..', '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '2.0.0';
  } catch {
    return '2.0.0';
  }
}

/**
 * Initialize version history
 */
function initializeVersionHistory() {
  return {
    createdAt: new Date().toISOString(),
    currentVersion: getCurrentVersion(),
    upgrades: [],
    rollbacks: [],
    dataExports: []
  };
}

/**
 * Load version history
 */
function loadVersionHistory() {
  ensureVersionDir();
  const historyPath = versionHistoryPath();

  if (!fs.existsSync(historyPath)) {
    const history = initializeVersionHistory();
    saveVersionHistory(history);
    return history;
  }

  return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
}

/**
 * Save version history
 */
function saveVersionHistory(history) {
  ensureVersionDir();
  fs.writeFileSync(versionHistoryPath(), JSON.stringify(history, null, 2));
  return history;
}

/**
 * Record version upgrade
 */
function recordUpgrade(fromVersion, toVersion, notes = '') {
  const history = loadVersionHistory();

  history.upgrades.push({
    timestamp: new Date().toISOString(),
    fromVersion,
    toVersion,
    notes,
    dataBackupCreated: false
  });

  history.currentVersion = toVersion;
  saveVersionHistory(history);

  return history.upgrades[history.upgrades.length - 1];
}

/**
 * Record rollback
 */
function recordRollback(fromVersion, toVersion, reason = '') {
  const history = loadVersionHistory();

  history.rollbacks.push({
    timestamp: new Date().toISOString(),
    fromVersion,
    toVersion,
    reason
  });

  history.currentVersion = toVersion;
  saveVersionHistory(history);

  return history.rollbacks[history.rollbacks.length - 1];
}

/**
 * Export all user data for migration/backup
 */
function exportUserData() {
  ensureVersionDir();

  const exportData = {
    timestamp: new Date().toISOString(),
    version: getCurrentVersion(),
    data: {
      analytics: exportAnalytics(),
      memories: exportMemories(),
      memoryStats: require('./advanced-memory').getMemoryStats(),
      routingStats: require('./adaptive-routing').getRoutingInsights()
    },
    metadata: {
      exportedBy: 'Kairos self-improvement system',
      exportedAt: new Date().toISOString(),
      kairosVersion: getCurrentVersion()
    }
  };

  const exportPath = path.join(versionDir(), `user-data-${Date.now()}.json`);
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

  // Record in history
  const history = loadVersionHistory();
  history.dataExports.push({
    timestamp: exportData.timestamp,
    version: exportData.version,
    filePath: exportPath,
    recordCount: {
      analytics: exportData.data.analytics.length,
      memories: exportData.data.memories.length
    }
  });
  saveVersionHistory(history);

  return exportPath;
}

/**
 * Import user data from backup
 */
function importUserData(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Export file not found: ${filePath}`);
  }

  const exportData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const results = {
    timestamp: new Date().toISOString(),
    version: getCurrentVersion(),
    imported: {}
  };

  // Validate export
  if (!exportData.data) {
    throw new Error('Invalid export format: missing data field');
  }

  // Import analytics
  if (exportData.data.analytics && options.importAnalytics !== false) {
    const count = importAnalytics(exportData.data.analytics);
    results.imported.analytics = count;
  }

  // Import memories
  if (exportData.data.memories && options.importMemories !== false) {
    const count = importMemories(exportData.data.memories);
    results.imported.memories = count;
  }

  return results;
}

/**
 * Get migration guide for upgrading between versions
 */
function getMigrationGuide(fromVersion, toVersion) {
  const guides = {
    '2.0.0->2.1.0': {
      version: 'v2.1.0',
      title: 'Enhanced Memory & Adaptive Routing',
      breaking: [],
      deprecations: [],
      newFeatures: [
        'Semantic memory retrieval with RAG',
        'Performance-based model routing',
        'Memory tiers (short-term, episodic, long-term)',
        'Advanced planning with tree search'
      ],
      migrations: [
        {
          task: 'Initialize advanced memory system',
          command: 'kairos --init-advanced-memory'
        },
        {
          task: 'Migrate existing memories',
          command: 'kairos --migrate-memory'
        },
        {
          task: 'Build analytics baseline',
          command: 'kairos --build-analytics'
        }
      ],
      rollbackCommand: 'kairos --rollback-to 2.0.0'
    },
    '2.1.0->2.2.0': {
      version: 'v2.2.0',
      title: 'Feedback Engine & Version Tracking',
      breaking: [],
      deprecations: [],
      newFeatures: [
        'Weekly/monthly self-improvement feedback',
        'Automatic performance analysis',
        'Data export/import utilities',
        'Version history tracking'
      ],
      migrations: [
        {
          task: 'Initialize feedback system',
          command: 'kairos --init-feedback'
        },
        {
          task: 'Export current data (recommended)',
          command: 'kairos --export-data'
        }
      ],
      rollbackCommand: 'kairos --rollback-to 2.1.0'
    }
  };

  const key = `${fromVersion}->${toVersion}`;
  return guides[key] || {
    version: toVersion,
    title: 'Custom Migration',
    breaking: [],
    newFeatures: [],
    migrations: [
      {
        task: 'Manual migration required',
        command: `Contact support for ${fromVersion} to ${toVersion} migration`
      }
    ]
  };
}

/**
 * Get data compatibility status
 */
function getDataCompatibility(exportedVersion, targetVersion) {
  const currentVersion = getCurrentVersion();

  // Parse semantic versions
  const parseVersion = (v) => {
    const parts = v.split('.');
    return {
      major: parseInt(parts[0], 10),
      minor: parseInt(parts[1], 10),
      patch: parseInt(parts[2], 10)
    };
  };

  const exported = parseVersion(exportedVersion);
  const target = parseVersion(targetVersion || currentVersion);

  // Major version must match for full compatibility
  if (exported.major !== target.major) {
    return {
      compatible: false,
      reason: 'Major version mismatch',
      exported: exportedVersion,
      target: targetVersion || currentVersion,
      recommendation: 'Use specific migration path'
    };
  }

  // Minor/patch version differences are compatible with possible degradation
  if (exported.minor > target.minor) {
    return {
      compatible: false,
      reason: 'Downgrade not recommended',
      exported: exportedVersion,
      target: targetVersion || currentVersion,
      recommendation: 'Upgrade to newer version or use rollback'
    };
  }

  return {
    compatible: true,
    exported: exportedVersion,
    target: targetVersion || currentVersion,
    note: 'Data should be compatible'
  };
}

/**
 * Format version information for display
 */
function formatVersionInfo() {
  const history = loadVersionHistory();
  const current = getCurrentVersion();

  const lines = [
    '',
    '═'.repeat(60),
    '  Kairos Version Information',
    '═'.repeat(60),
    '',
    `Current Version: ${current}`,
    `Created At: ${new Date(history.createdAt).toLocaleString()}`,
    '',
    `Upgrades: ${history.upgrades.length}`,
    `Rollbacks: ${history.rollbacks.length}`,
    `Data Exports: ${history.dataExports.length}`,
    ''
  ];

  if (history.upgrades.length > 0) {
    lines.push('Recent Upgrades:');
    for (const upgrade of history.upgrades.slice(-3)) {
      lines.push(`  • ${upgrade.fromVersion} → ${upgrade.toVersion}`);
      lines.push(`    ${new Date(upgrade.timestamp).toLocaleString()}`);
    }
    lines.push('');
  }

  lines.push('═'.repeat(60));
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  ensureVersionDir,
  exportDataPath,
  exportUserData,
  formatVersionInfo,
  getCurrentVersion,
  getDataCompatibility,
  getMigrationGuide,
  getVersionHistory: loadVersionHistory,
  importUserData,
  initializeVersionHistory,
  loadVersionHistory,
  recordRollback,
  recordUpgrade,
  saveVersionHistory,
  versionDir,
  versionHistoryPath
};
