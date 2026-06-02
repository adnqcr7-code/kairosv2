const fs = require('node:fs');
const path = require('node:path');
const { getEnv } = require('./env');
const { DEFAULT_KAIROS_DATA_DIR } = require('./paths');

function memoryDir() {
  return path.join(getEnv('KAIROS_DATA_DIR', DEFAULT_KAIROS_DATA_DIR), 'memory');
}

function memoryPath() {
  return path.join(memoryDir(), 'profile.json');
}

function conversationPath() {
  return path.join(memoryDir(), 'conversation.json');
}

function defaultMemory() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      name: '',
      style: 'direct, practical, cheap/free tools, MVP first',
      goals: [
        'learn coding by building real tools',
        'make money with POSEIDON STUDIOS',
        'build Kairos as a local-first coding agent'
      ]
    },
    preferences: {
      shell: 'powershell',
      stack: ['Node.js', 'Discord.js', 'Chrome extensions', 'PowerShell'],
      safety: ['no token stealers', 'no spam/raid tools', 'ask before risky actions'],
      budget: 'cheap/free first',
      defaultBrain: 'none until configured'
    },
    projects: [
      {
        name: 'Kairos',
        path: '.',
        type: 'local coding agent',
        status: 'active'
      },
      {
        name: 'POSEIDON Discord Bot',
        path: 'poseidon-bot',
        type: 'discord bot',
        status: 'active'
      }
    ],
    builds: [],
    notes: []
  };
}

function normalizeMemory(memory) {
  const defaults = defaultMemory();
  return {
    ...defaults,
    ...memory,
    user: { ...defaults.user, ...(memory.user || {}) },
    preferences: { ...defaults.preferences, ...(memory.preferences || {}) },
    projects: memory.projects || defaults.projects,
    builds: memory.builds || [],
    notes: memory.notes || []
  };
}

function ensureMemory() {
  fs.mkdirSync(memoryDir(), { recursive: true });
  if (!fs.existsSync(memoryPath())) {
    fs.writeFileSync(memoryPath(), `${JSON.stringify(defaultMemory(), null, 2)}\n`);
  }
}

function loadMemory() {
  ensureMemory();
  const memory = normalizeMemory(JSON.parse(fs.readFileSync(memoryPath(), 'utf8')));
  saveMemory(memory);
  return memory;
}

function saveMemory(memory) {
  fs.mkdirSync(memoryDir(), { recursive: true });
  const next = {
    ...memory,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(memoryPath(), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function setMemoryValue(key, value) {
  const memory = loadMemory();
  if (key === 'name') memory.user.name = value;
  else if (key === 'style') memory.user.style = value;
  else if (key === 'note') memory.notes.push({ at: new Date().toISOString(), text: value });
  else memory.preferences[key] = value;
  return saveMemory(memory);
}

function addProject(project) {
  const memory = loadMemory();
  const nextProject = {
    addedAt: new Date().toISOString(),
    status: 'active',
    ...project
  };
  memory.projects = memory.projects.filter((item) => item.path !== nextProject.path);
  memory.projects.push(nextProject);
  return saveMemory(memory);
}

function addBuild(build) {
  const memory = loadMemory();
  memory.builds.push({
    at: new Date().toISOString(),
    ...build
  });
  return saveMemory(memory);
}

function loadConversationHistory() {
  try {
    const path = conversationPath();
    if (!fs.existsSync(path)) return [];
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveConversationHistory(history) {
  fs.mkdirSync(memoryDir(), { recursive: true });
  fs.writeFileSync(conversationPath(), `${JSON.stringify(history, null, 2)}\n`);
  return history;
}

function addToConversationHistory(role, content, metadata = {}) {
  const history = loadConversationHistory();
  history.push({
    at: new Date().toISOString(),
    role,
    content,
    ...metadata
  });
  return saveConversationHistory(history);
}

function clearConversationHistory() {
  return saveConversationHistory([]);
}

module.exports = {
  addBuild,
  addProject,
  addToConversationHistory,
  clearConversationHistory,
  conversationPath,
  ensureMemory,
  loadConversationHistory,
  loadMemory,
  memoryDir,
  memoryPath,
  saveConversationHistory,
  saveMemory,
  setMemoryValue
};
