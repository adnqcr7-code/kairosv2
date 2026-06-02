const fs = require('node:fs');
const path = require('node:path');
const { kairosDataDir, ROOT_DIR } = require('./storage');
const { loadMemory } = require('./memory');
const { readGoalLessons } = require('./self-improvement');
const { getSkillContent, listSkills } = require('./skills');

const INDEX_VERSION = 1;
const MAX_FILE_BYTES = 180_000;
const MAX_CHUNK_CHARS = 1400;
// Default maximum number of chunks per source.  Can be overridden via
// options.maxChunksPerSource when building the index.
const DEFAULT_MAX_CHUNKS_PER_SOURCE = 4;
const MAX_PROJECT_FILES = 450;
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'agent', 'also', 'because', 'before', 'being', 'build',
  'code', 'could', 'current', 'does', 'done', 'each', 'from', 'goal', 'have',
  'into', 'kairos', 'local', 'make', 'need', 'needs', 'only', 'project', 'should',
  'system', 'that', 'this', 'through', 'tools', 'user', 'when', 'with', 'work'
]);

function contextIndexPath() {
  return path.join(kairosDataDir(), 'context-index.json');
}

function redact(text = '') {
  return String(text)
    .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^"'\s]+/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/DISCORD_TOKEN\s*=\s*[^\s]+/gi, 'DISCORD_TOKEN=[redacted]')
    // Generic patterns for API keys and JWTs
    .replace(/(sk|pk|rk|sess)_[A-Za-z0-9]{10,}/gi, '[redacted]')
    .replace(/[A-Za-z0-9]{24,}\.[A-Za-z0-9]{6}\.[A-Za-z0-9-_]{27}/g, '[redacted]');
}

function tokenize(text = '') {
  return redact(text)
    .toLowerCase()
    .split(/[^a-z0-9_./:-]+/)
    .map((token) => token.replace(/^[-./:_]+|[-./:_]+$/g, ''))
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    .slice(0, 800);
}

function termCounts(text = '') {
  const counts = {};
  for (const token of tokenize(text)) counts[token] = (counts[token] || 0) + 1;
  return counts;
}

function compact(text = '', maxLength = MAX_CHUNK_CHARS) {
  const cleaned = redact(text).replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 3)}...`;
}

function chunkText(text = '', maxChunks = DEFAULT_MAX_CHUNKS_PER_SOURCE) {
  const cleaned = redact(text).replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  const chunks = [];
  let cursor = 0;
  while (cursor < cleaned.length && chunks.length < maxChunks) {
    const slice = cleaned.slice(cursor, cursor + MAX_CHUNK_CHARS);
    const nextBreak = slice.lastIndexOf('\n\n') > 400
      ? slice.lastIndexOf('\n\n')
      : slice.length;
    chunks.push(compact(slice.slice(0, nextBreak)));
    cursor += Math.max(nextBreak, MAX_CHUNK_CHARS);
  }
  return chunks.filter(Boolean);
}

function makeDocument({ type, title, sourcePath = '', content, chunk = 0 }) {
  const id = `${type}:${sourcePath || title}:${chunk}`.replace(/\\/g, '/');
  const searchable = `${type} ${title} ${sourcePath} ${content}`;
  return {
    id,
    type,
    title,
    path: sourcePath,
    chunk,
    content: compact(content),
    terms: termCounts(searchable)
  };
}

function isTextProjectFile(filePath) {
  const name = path.basename(filePath).toLowerCase();
  if (name === '.env' || name.endsWith('.zip') || name.endsWith('.tar')) return false;
  return ['.js', '.json', '.md', '.txt'].includes(path.extname(name));
}

function shouldSkipDir(name) {
  return ['.git', 'node_modules', 'data', '.kairos-wsl'].includes(name) || /^\d{2}-/.test(name);
}

function walkProjectFiles(dirPath = ROOT_DIR) {
  const files = [];
  const stack = [dirPath];

  while (stack.length && files.length < MAX_PROJECT_FILES) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkipDir(entry.name)) stack.push(fullPath);
      } else if (entry.isFile() && isTextProjectFile(fullPath)) {
        files.push(fullPath);
        if (files.length >= MAX_PROJECT_FILES) break;
      }
    }
  }

  return files;
}

function indexSkills(options = {}) {
  const docs = [];
  const { skills } = listSkills();
  for (const skill of skills) {
    let content = '';
    try {
      content = getSkillContent(skill.id);
    } catch {
      content = [skill.title, skill.role, skill.whenToActivate].filter(Boolean).join('\n');
    }

    const sourcePath = skill.relativePath || skill.path || skill.id;
    chunkText(content, options.maxChunksPerSource).forEach((chunk, index) => {
      docs.push(makeDocument({
        type: 'skill',
        title: `${skill.id} ${skill.title}`,
        sourcePath,
        content: chunk,
        chunk: index
      }));
    });
  }
  return docs;
}

function indexMemory(options = {}) {
  try {
    const memory = loadMemory();
    const pieces = [
      `User style: ${memory.user?.style || ''}`,
      `User goals: ${(memory.user?.goals || []).join('; ')}`,
      `Preferences: ${JSON.stringify(memory.preferences || {})}`,
      `Projects: ${JSON.stringify(memory.projects || [])}`,
      `Builds: ${JSON.stringify((memory.builds || []).slice(-10))}`,
      `Notes: ${JSON.stringify((memory.notes || []).slice(-20))}`
    ];

    return chunkText(pieces.join('\n'), options.maxChunksPerSource).map((chunk, index) => makeDocument({
      type: 'memory',
      title: 'Kairos local memory',
      sourcePath: 'memory/profile.json',
      content: chunk,
      chunk: index
    }));
  } catch {
    return [];
  }
}

function indexLessons(options = {}) {
  return readGoalLessons(40).map((lesson, index) => makeDocument({
    type: 'lesson',
    title: lesson.title || `Goal lesson ${lesson.goalId || index}`,
    sourcePath: 'lessons.jsonl',
    content: JSON.stringify(lesson),
    chunk: index
  }));
}

function indexProjectFiles(options = {}) {
  const docs = [];
  for (const filePath of walkProjectFiles()) {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_BYTES) continue;

    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    chunkText(content, options.maxChunksPerSource).forEach((chunk, index) => {
      docs.push(makeDocument({
        type: 'project',
        title: relativePath,
        sourcePath: relativePath,
        content: chunk,
        chunk: index
      }));
    });
  }
  return docs;
}

function createContextIndex(options = {}) {
  // Collect documents from each source.  Allow overriding the
  // maximum number of chunks per source via options.maxChunksPerSource.
  const documents = [];
  const seenChunks = new Set();
  const addDocs = (docs) => {
    for (const doc of docs) {
      // Filter duplicate chunks by content and source path.  The key
      // combines type, path and content to avoid collisions across
      // different files with identical text.
      const key = `${doc.type}:${doc.path}:${doc.content}`;
      if (seenChunks.has(key)) continue;
      seenChunks.add(key);
      documents.push(doc);
    }
  };
  addDocs(indexSkills({ maxChunksPerSource: options.maxChunksPerSource }));
  addDocs(indexMemory({ maxChunksPerSource: options.maxChunksPerSource }));
  addDocs(indexLessons({ maxChunksPerSource: options.maxChunksPerSource }));
  if (options.project !== false) {
    addDocs(indexProjectFiles({ maxChunksPerSource: options.maxChunksPerSource }));
  }
  const index = {
    version: INDEX_VERSION,
    builtAt: new Date().toISOString(),
    root: ROOT_DIR,
    documents
  };
  return index;
}

function summarizeIndex(index) {
  return {
    path: contextIndexPath(),
    version: index.version,
    builtAt: index.builtAt,
    documents: index.documents.length,
    byType: index.documents.reduce((counts, doc) => {
      counts[doc.type] = (counts[doc.type] || 0) + 1;
      return counts;
    }, {})
  };
}

function buildContextIndex(options = {}) {
  // If incremental rebuild is requested, and the context index file exists,
  // check whether any project files have been modified since the index was last built.
  if (options.incremental && fs.existsSync(contextIndexPath())) {
    try {
      // If project scanning is disabled, skip modification checks and assume
      // nothing has changed.  This avoids expensive file system walking when
      // the caller only wants to index skills, memory and lessons.
      if (options.project === false) {
        const existing = loadContextIndex({ autoBuild: false });
        if (existing) return summarizeIndex(existing);
      }
      const indexMtime = fs.statSync(contextIndexPath()).mtimeMs;
      const files = walkProjectFiles();
      let changed = false;
      for (const filePath of files) {
        try {
          if (fs.statSync(filePath).mtimeMs > indexMtime) {
            changed = true;
            break;
          }
        } catch {
          // ignore files that cannot be stat'ed
        }
      }
      if (!changed) {
        // No files have changed since the index was built; return existing summary.
        const existing = loadContextIndex({ autoBuild: false });
        if (existing) return summarizeIndex(existing);
      }
    } catch {
      // Fall through and rebuild index on error.
    }
  }
  const index = createContextIndex(options);
  if (options.write === false) return summarizeIndex(index);
  fs.mkdirSync(path.dirname(contextIndexPath()), { recursive: true });
  // Write compact JSON when requested by the caller.
  const json = options.compact ? JSON.stringify(index) : JSON.stringify(index, null, 2);
  fs.writeFileSync(contextIndexPath(), `${json}\n`, 'utf8');
  return summarizeIndex(index);
}

function loadContextIndex(options = {}) {
  if (!fs.existsSync(contextIndexPath())) {
    if (options.autoBuild === false) return null;
    buildContextIndex();
  }

  try {
    const index = JSON.parse(fs.readFileSync(contextIndexPath(), 'utf8'));
    if (index.version !== INDEX_VERSION) {
      if (options.autoBuild === false) return index;
      buildContextIndex();
      return JSON.parse(fs.readFileSync(contextIndexPath(), 'utf8'));
    }
    return index;
  } catch {
    if (options.autoBuild === false) return null;
    buildContextIndex();
    return JSON.parse(fs.readFileSync(contextIndexPath(), 'utf8'));
  }
}

function scoreDocument(doc, queryTerms) {
  let score = 0;
  const title = `${doc.title} ${doc.path}`.toLowerCase();
  for (const term of queryTerms) {
    score += Math.min(doc.terms?.[term] || 0, 5);
    if (title.includes(term)) score += 4;
  }
  if (doc.type === 'skill') score += 0.5;
  if (doc.type === 'memory') score += 0.4;
  if (doc.type === 'lesson') score += 0.3;
  return score;
}

function searchContextDocuments(query, documents = [], options = {}) {
  const queryTerms = [...new Set(tokenize(query))];
  if (queryTerms.length === 0) return [];

  return documents
    .map((doc) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      path: doc.path,
      chunk: doc.chunk,
      score: scoreDocument(doc, queryTerms),
      content: doc.content
    }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, options.limit || 8);
}

function searchContextIndex(query, options = {}) {
  const index = loadContextIndex({ autoBuild: options.autoBuild !== false });
  if (!index) return [];
  return searchContextDocuments(query, index.documents, options);
}

function formatContextResultsForPrompt(results = []) {
  if (!results.length) return '';
  const lines = results.map((result, index) => [
    `${index + 1}. [${result.type}] ${result.title}${result.path ? ` (${result.path})` : ''}`,
    `   relevance=${result.score.toFixed(2)} snippet=${compact(result.content, 420)}`
  ].join('\n'));
  return `Retrieved local context:\n${lines.join('\n')}`;
}

module.exports = {
  buildContextIndex,
  contextIndexPath,
  createContextIndex,
  formatContextResultsForPrompt,
  loadContextIndex,
  searchContextDocuments,
  searchContextIndex,
  tokenize
};
