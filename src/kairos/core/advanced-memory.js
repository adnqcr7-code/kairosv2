const fs = require('node:fs');
const path = require('node:path');
const { kairosDataDir } = require('./storage');

function advancedMemoryDir() {
  return path.join(kairosDataDir(), 'advanced-memory');
}

function semanticIndexPath() {
  return path.join(advancedMemoryDir(), 'semantic-index.jsonl');
}

function memoryTiersPath() {
  return path.join(advancedMemoryDir(), 'tiers.json');
}

function ensureAdvancedMemoryDir() {
  fs.mkdirSync(advancedMemoryDir(), { recursive: true });
}

/**
 * Initialize memory tiers structure
 */
function initializeMemoryTiers() {
  const tiers = {
    shortTerm: {
      maxSize: 10,
      ttlMinutes: 60,
      decay: 0.1,
      entries: []
    },
    episodic: {
      maxSize: 100,
      ttlMinutes: 10080, // 1 week
      decay: 0.05,
      entries: []
    },
    longTerm: {
      maxSize: 1000,
      ttlMinutes: null, // unlimited
      decay: 0.01,
      entries: []
    }
  };

  return tiers;
}

/**
 * Create a semantic vector approximation (simple frequency-based)
 */
function createSemanticVector(text) {
  const words = text.toLowerCase().split(/\s+/);
  const vector = {};

  for (const word of words) {
    vector[word] = (vector[word] || 0) + 1;
  }

  return vector;
}

/**
 * Calculate similarity between two vectors (cosine similarity approximation)
 */
function cosineSimilarity(vec1, vec2) {
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const key of keys) {
    const v1 = vec1[key] || 0;
    const v2 = vec2[key] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * Add memory entry to appropriate tier
 */
function addMemory(entry, tier = 'shortTerm') {
  ensureAdvancedMemoryDir();

  const memory = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tier,
    timestamp: new Date().toISOString(),
    content: entry.content || '',
    metadata: entry.metadata || {},
    vector: createSemanticVector(entry.content || ''),
    relevanceScore: 1.0,
    accessCount: 0,
    lastAccessed: new Date().toISOString()
  };

  fs.appendFileSync(semanticIndexPath(), `${JSON.stringify(memory)}\n`, 'utf8');
  return memory;
}

/**
 * Retrieve memories by semantic similarity
 */
function retrieveMemories(query, limit = 5, tier = null) {
  const filePath = semanticIndexPath();
  if (!fs.existsSync(filePath)) return [];

  const queryVector = createSemanticVector(query);
  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const memories = lines
    .map((line) => {
      try {
        const mem = JSON.parse(line);
        const similarity = cosineSimilarity(queryVector, mem.vector || {});
        return { ...mem, similarity };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((mem) => !tier || mem.tier === tier)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return memories;
}

/**
 * Get augmented context for a query (RAG)
 */
function getAugmentedContext(query, maxContextEntries = 5) {
  const memories = retrieveMemories(query, maxContextEntries);

  if (!memories.length) return '';

  const contextLines = memories.map((mem) => {
    const confidence = Math.round(mem.similarity * 100);
    return `[${confidence}% match] ${mem.content}`;
  });

  return [
    'Retrieved context from memory:',
    ...contextLines
  ].join('\n');
}

/**
 * Access a memory entry (increments counter)
 */
function accessMemory(memoryId) {
  const filePath = semanticIndexPath();
  if (!fs.existsSync(filePath)) return null;

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const updated = lines.map((line) => {
    try {
      const mem = JSON.parse(line);
      if (mem.id === memoryId) {
        mem.accessCount = (mem.accessCount || 0) + 1;
        mem.lastAccessed = new Date().toISOString();
        mem.relevanceScore = Math.min(1.0, mem.relevanceScore + 0.05);
      }
      return mem;
    } catch {
      return null;
    }
  }).filter(Boolean);

  fs.writeFileSync(filePath, updated.map((m) => JSON.stringify(m)).join('\n') + '\n', 'utf8');
  
  return lines.find((line) => {
    try {
      return JSON.parse(line).id === memoryId;
    } catch {
      return false;
    }
  });
}

/**
 * Decay memory relevance over time
 */
function decayMemories() {
  const filePath = semanticIndexPath();
  if (!fs.existsSync(filePath)) return 0;

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  let decayedCount = 0;
  const now = Date.now();

  const updated = lines
    .map((line) => {
      try {
        const mem = JSON.parse(line);
        const tiers = initializeMemoryTiers();
        const tierConfig = tiers[mem.tier] || tiers.longTerm;

        if (tierConfig.ttlMinutes) {
          const ageMinutes = (now - new Date(mem.timestamp).getTime()) / (1000 * 60);
          if (ageMinutes > tierConfig.ttlMinutes) {
            decayedCount += 1;
            return null; // Remove expired entry
          }
        }

        // Apply decay to relevance
        const decayRate = tierConfig.decay || 0.01;
        mem.relevanceScore = Math.max(0, mem.relevanceScore - decayRate);

        return mem.relevanceScore > 0.1 ? mem : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  fs.writeFileSync(filePath, updated.map((m) => JSON.stringify(m)).join('\n') + '\n', 'utf8');
  return decayedCount;
}

/**
 * Export all memories for backup/migration
 */
function exportMemories() {
  const filePath = semanticIndexPath();
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
 * Import memories from backup
 */
function importMemories(memories = []) {
  ensureAdvancedMemoryDir();
  const filePath = semanticIndexPath();

  for (const memory of memories) {
    if (memory && typeof memory === 'object') {
      fs.appendFileSync(filePath, `${JSON.stringify(memory)}\n`, 'utf8');
    }
  }

  return memories.length;
}

/**
 * Get memory statistics
 */
function getMemoryStats() {
  const filePath = semanticIndexPath();
  if (!fs.existsSync(filePath)) {
    return {
      totalEntries: 0,
      byTier: {},
      averageRelevance: 0,
      oldestEntry: null,
      newestEntry: null
    };
  }

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const memories = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const byTier = {};
  let totalRelevance = 0;

  for (const mem of memories) {
    byTier[mem.tier] = (byTier[mem.tier] || 0) + 1;
    totalRelevance += mem.relevanceScore || 0;
  }

  const timestamps = memories.map((m) => new Date(m.timestamp).getTime()).sort((a, b) => a - b);

  return {
    totalEntries: memories.length,
    byTier,
    averageRelevance: memories.length > 0 ? totalRelevance / memories.length : 0,
    oldestEntry: timestamps[0] ? new Date(timestamps[0]).toISOString() : null,
    newestEntry: timestamps[timestamps.length - 1] ? new Date(timestamps[timestamps.length - 1]).toISOString() : null
  };
}

module.exports = {
  accessMemory,
  addMemory,
  advancedMemoryDir,
  cosineSimilarity,
  createSemanticVector,
  decayMemories,
  exportMemories,
  getAugmentedContext,
  getMemoryStats,
  importMemories,
  initializeMemoryTiers,
  retrieveMemories,
  semanticIndexPath
};
