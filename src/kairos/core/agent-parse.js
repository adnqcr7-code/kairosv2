// Parsing utilities for agent planning — v2.1 with robust repair
//
// Key improvements over original:
// - Handles markdown-wrapped JSON (```json ... ```)
// - Repairs common JSON errors (trailing commas, single quotes, comments)
// - Multi-strategy extraction (JSON array → action blocks → numbered list → action conversion)
// - Self-critique verification of parsed plans

const ACTION_ALIASES = {
  read: 'read',
  write: 'write',
  run: 'run',
  test: 'test',
  webfetch: 'web_fetch',
  web_fetch: 'web_fetch',
  browseropen: 'browser_open',
  browser_open: 'browser_open',
  think: 'think'
};

const PARAM_ALIASES = {
  path: 'path',
  filepath: 'path',
  file: 'path',
  content: 'content',
  text: 'content',
  command: 'command',
  cmd: 'command',
  url: 'url',
  target: 'target',
  maxbytes: 'maxBytes',
  max_bytes: 'maxBytes',
  timeoutms: 'timeoutMs',
  timeout_ms: 'timeoutMs',
  allowremote: 'allowRemote',
  allow_remote: 'allowRemote',
  reasoning: 'reasoning',
  reason: 'reasoning',
  isquestion: 'isQuestion',
  is_question: 'isQuestion'
};

function normalizeKey(key) {
  return String(key || '').trim().replace(/[\s-]+/g, '_').toLowerCase();
}

function normalizeActionName(name) {
  return ACTION_ALIASES[normalizeKey(name)] || null;
}

function normalizeParamName(name) {
  return PARAM_ALIASES[normalizeKey(name)] || name;
}

function normalizeParams(params = {}) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  const normalized = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[normalizeParamName(key)] = value;
  }
  return normalized;
}

function actionFromActionKey(item) {
  for (const [key, value] of Object.entries(item || {})) {
    const action = normalizeActionName(key);
    if (action) {
      const params = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      return { action, params };
    }
  }
  return null;
}

function normalizeAction(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  const keyedAction = !Object.prototype.hasOwnProperty.call(item, 'action') ? actionFromActionKey(item) : null;
  const source = keyedAction || item;
  const action = normalizeActionName(source.action);
  const rawParams = source.params && typeof source.params === 'object' && !Array.isArray(source.params) ? source.params : source;
  const params = normalizeParams(rawParams);
  return { ...item, action: action || source.action, params };
}

function normalizeActionPlan(actions) {
  if (!Array.isArray(actions)) return actions;
  return actions.map(action => normalizeAction(action));
}

// ─── JSON Repair Strategies ───────────────────────────────────────────

function repairJson(text) {
  let repaired = text;
  repaired = repaired.replace(/\/\/.*$/gm, '');
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');
  repaired = repaired.replace(/,\s*([\]}])/g, '$1');
  repaired = repaired.replace(/'([^']+)'\s*:/g, '"$1":');
  return repaired;
}

function extractFromCodeBlocks(response) {
  const codeBlockPattern = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
  const matches = [];
  let match;
  while ((match = codeBlockPattern.exec(response)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function extractJsonArray(response) {
  const codeBlocks = extractFromCodeBlocks(response);
  for (const block of codeBlocks) {
    const arrayMatch = block.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        try {
          const repaired = repairJson(arrayMatch[0]);
          const parsed = JSON.parse(repaired);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* continue */ }
      }
    }
  }

  const arrayMatch = response.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {
      try { return JSON.parse(repairJson(arrayMatch[0])); } catch { /* continue */ }
    }
  }
  return null;
}

function parseActionBlocksFromResponse(response) {
  const actions = [];
  const pattern = /\bAction\s*:\s*([A-Za-z_ -]+)[^\n{]*({[^\n]*})/gi;
  let match;
  while ((match = pattern.exec(response)) !== null) {
    const action = normalizeActionName(match[1]);
    if (!action) continue;
    try {
      const params = JSON.parse(match[2]);
      actions.push(normalizeAction({ action, params }));
    } catch { continue; }
  }
  const runPattern = /\b\d+\.\s*Run\s*:[\s\S]*?\bcommand\s+"([^"]+)"/gi;
  while ((match = runPattern.exec(response)) !== null) {
    actions.push({ action: 'run', params: { command: match[1] } });
  }
  return actions.length > 0 ? actions : null;
}

function parseNumberedListToActions(response) {
  const steps = [];
  const numberedItem = /^\s*\d+\.\s+(.+)$/gm;
  let match;
  while ((match = numberedItem.exec(response)) !== null) {
    const text = match[1].trim();
    if (/\b(write|create|save)\b.*\b(file|module|component|script|class|function)\b/i.test(text)) {
      const filePathMatch = text.match(/(?:to|as|at|in|:)\s+"?([^\s"\\.]+\.[a-z]+)"?/i);
      steps.push({ action: 'write', params: { path: filePathMatch ? filePathMatch[1] : 'output.js', content: '// TODO: implement based on step: ' + text.slice(0, 200) } });
    } else if (/\b(run|execute|test)\b/i.test(text)) {
      const cmdMatch = text.match(/"([^"]+)"/);
      steps.push({ action: 'run', params: { command: cmdMatch ? cmdMatch[1] : 'npm test' } });
    } else {
      steps.push({ action: 'think', params: { reasoning: text.slice(0, 500) } });
    }
  }
  return steps.length > 0 ? steps : null;
}

function parseActionsFromResponse(response) {
  const jsonArray = extractJsonArray(response);
  if (jsonArray) return normalizeActionPlan(jsonArray);

  const actionBlocks = parseActionBlocksFromResponse(response);
  if (actionBlocks) return normalizeActionPlan(actionBlocks);

  const listActions = parseNumberedListToActions(response);
  if (listActions) return normalizeActionPlan(listActions);

  return null;
}

function parseObjectFromResponse(response) {
  const codeBlocks = extractFromCodeBlocks(response);
  for (const block of codeBlocks) {
    const start = block.indexOf('{');
    const end = block.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const parsed = JSON.parse(block.slice(start, end + 1));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch {
        try {
          const repaired = repairJson(block.slice(start, end + 1));
          const parsed = JSON.parse(repaired);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch { /* continue */ }
      }
    }
  }

  const start = response.indexOf('{');
  const end = response.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(response.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    try {
      const repaired = repairJson(response.slice(start, end + 1));
      const parsed = JSON.parse(repaired);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }
}

function verifyAndRepairActions(actions, goalTitle = '') {
  if (!Array.isArray(actions)) return actions;
  const knownTypes = ['read', 'write', 'run', 'test', 'web_fetch', 'browser_open', 'think'];
  const repaired = [];
  for (const action of actions) {
    const normalized = normalizeAction(action);
    if (!knownTypes.includes(normalized.action)) {
      repaired.push({ action: 'think', params: { reasoning: 'Original action "' + normalized.action + '" was not recognized. Intent: ' + JSON.stringify(normalized.params || {}).slice(0, 200) } });
      continue;
    }
    repaired.push(normalized);
  }
  return repaired;
}

module.exports = {
  ACTION_ALIASES,
  PARAM_ALIASES,
  normalizeKey,
  normalizeActionName,
  normalizeParamName,
  normalizeParams,
  actionFromActionKey,
  normalizeAction,
  normalizeActionPlan,
  repairJson,
  extractFromCodeBlocks,
  extractJsonArray,
  parseActionBlocksFromResponse,
  parseNumberedListToActions,
  parseActionsFromResponse,
  parseObjectFromResponse,
  verifyAndRepairActions
};
