/**
 * Data Migration Utilities
 * Handles data export, import, and compatibility checks
 */

const fs = require('node:fs');
const path = require('node:path');
const { exportAnalytics, importAnalytics } = require('./analytics');
const { exportMemories, importMemories, getMemoryStats } = require('./advanced-memory');
const { exportUserData, importUserData, getDataCompatibility } = require('./version-manager');

/**
 * Create full backup with all data
 */
function createFullBackup(outputDir = null) {
  const targetDir = outputDir || path.join(process.env.HOME || process.env.USERPROFILE, '.kairos', 'backups');
  fs.mkdirSync(targetDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `kairos-backup-${timestamp}`;
  const backupPath = path.join(targetDir, `${backupName}.json`);

  const backup = {
    timestamp: new Date().toISOString(),
    version: require('./version-manager').getCurrentVersion(),
    data: {
      analytics: exportAnalytics(),
      memories: exportMemories(),
      stats: {
        memory: getMemoryStats()
      }
    },
    metadata: {
      backupName,
      backupPath,
      totalEntries: {
        analytics: exportAnalytics().length,
        memories: exportMemories().length
      }
    }
  };

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  return { backupPath, backup };
}

/**
 * Restore from backup
 */
function restoreFromBackup(backupPath, options = {}) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  // Validate backup
  if (!backup.data) {
    throw new Error('Invalid backup format');
  }

  const results = {
    timestamp: new Date().toISOString(),
    restored: {}
  };

  // Restore analytics
  if (backup.data.analytics && options.restoreAnalytics !== false) {
    const count = importAnalytics(backup.data.analytics);
    results.restored.analytics = count;
  }

  // Restore memories
  if (backup.data.memories && options.restoreMemories !== false) {
    const count = importMemories(backup.data.memories);
    results.restored.memories = count;
  }

  return results;
}

/**
 * Validate backup integrity
 */
function validateBackup(backupPath) {
  if (!fs.existsSync(backupPath)) {
    return { valid: false, error: 'File not found' };
  }

  try {
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    if (!backup.data || !backup.timestamp || !backup.version) {
      return { valid: false, error: 'Missing required fields' };
    }

    if (!Array.isArray(backup.data.analytics) || !Array.isArray(backup.data.memories)) {
      return { valid: false, error: 'Invalid data format' };
    }

    return {
      valid: true,
      version: backup.version,
      timestamp: backup.timestamp,
      entries: {
        analytics: backup.data.analytics.length,
        memories: backup.data.memories.length
      }
    };
  } catch (error) {
    return { valid: false, error: `Parse error: ${error.message}` };
  }
}

/**
 * Merge multiple backups (for consolidation)
 */
function mergeBackups(backupPaths, outputPath = null) {
  const merged = {
    timestamp: new Date().toISOString(),
    version: require('./version-manager').getCurrentVersion(),
    data: {
      analytics: [],
      memories: []
    },
    metadata: {
      mergedFrom: [],
      totalEntries: {}
    }
  };

  for (const backupPath of backupPaths) {
    const validation = validateBackup(backupPath);
    if (!validation.valid) {
      console.warn(`Skipping invalid backup: ${backupPath}`);
      continue;
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    merged.data.analytics.push(...(backup.data.analytics || []));
    merged.data.memories.push(...(backup.data.memories || []));
    merged.metadata.mergedFrom.push(backup.timestamp);
  }

  // Deduplicate by timestamp
  const analyticsSet = new Map();
  for (const item of merged.data.analytics) {
    analyticsSet.set(item.timestamp + item.modelId, item);
  }
  merged.data.analytics = Array.from(analyticsSet.values());

  const memoriesSet = new Map();
  for (const item of merged.data.memories) {
    memoriesSet.set(item.id, item);
  }
  merged.data.memories = Array.from(memoriesSet.values());

  merged.metadata.totalEntries = {
    analytics: merged.data.analytics.length,
    memories: merged.data.memories.length
  };

  const finalPath = outputPath || path.join(process.env.HOME || process.env.USERPROFILE, '.kairos', 'backups', `merged-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  fs.writeFileSync(finalPath, JSON.stringify(merged, null, 2));

  return { mergedPath: finalPath, merged };
}

/**
 * Export in migration-friendly format
 */
function exportForMigration(targetVersion) {
  const guide = require('./version-manager').getMigrationGuide(
    require('./version-manager').getCurrentVersion(),
    targetVersion
  );

  return {
    timestamp: new Date().toISOString(),
    sourceVersion: require('./version-manager').getCurrentVersion(),
    targetVersion,
    migrationGuide: guide,
    backup: {
      analytics: exportAnalytics(),
      memories: exportMemories()
    },
    precheck: {
      compatibility: getDataCompatibility(
        require('./version-manager').getCurrentVersion(),
        targetVersion
      ),
      dataSize: {
        analytics: exportAnalytics().length,
        memories: exportMemories().length
      }
    }
  };
}

/**
 * CLI helper: display migration options
 */
function showMigrationOptions() {
  const currentVersion = require('./version-manager').getCurrentVersion();
  const options = [];

  if (currentVersion === '2.0.0') {
    options.push({
      from: '2.0.0',
      to: '2.1.0',
      description: 'Add semantic memory and adaptive routing',
      command: 'kairos --migrate-to 2.1.0'
    });
  }

  if (currentVersion === '2.1.0' || currentVersion === '2.0.0') {
    options.push({
      from: currentVersion,
      to: '2.2.0',
      description: 'Add feedback engine and version tracking',
      command: `kairos --migrate-to 2.2.0`
    });
  }

  return options;
}

module.exports = {
  createFullBackup,
  exportForMigration,
  mergeBackups,
  restoreFromBackup,
  showMigrationOptions,
  validateBackup
};
