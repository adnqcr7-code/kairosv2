// Parsing utilities for agent planning.  These functions normalise
// action definitions provided by the AI and extract useful data
// structures from free‑form responses.

// Mapping of user‑provided action names (and common aliases) to
// canonical internal names.
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

// Mapping of parameter names and aliases to canonical names.  Keys
// correspond to the lower‑cased, normalised forms of user keys.
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
  return String(key || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function normalizeActionName(name) {
  return ACTION_ALIASES[normalizeKey(name)] || null;
}

function normalizeParamName(name) {
  return PARAM_ALIASES[normalizeKey(name)] || name;
}

/**
 * Normalise an arbitrary object of parameters into the canonical form
 * expected by Kairos.  Aliased keys are converted, and unknown
 * properties are passed through unchanged.
 * @param {object} params
 * @returns {object}
 */
function normalizeParams(params = {}) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  const normalized = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[normalizeParamName(key)] = value;
  }
  return normalized;
}

/**
 * Convert a JSON object of the form { "Read": {...} } into the
 * canonical action representation.  Returns null if no known
 * action key is present.
 * @param {object} item
 */
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

/**
 * Normalise a single action object.  Accepts either the form
 * { action: 'read', params: {...} } or keyed forms such as
 * { Read: {...} }.  Parameter keys are normalised via
 * normalizeParamName.
 * @param {object} item
 */
function normalizeAction(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  const keyedAction = !Object.prototype.hasOwnProperty.call(item, 'action') ? actionFromActionKey(item) : null;
  const source = keyedAction || item;
  const action = normalizeActionName(source.action);
  const rawParams = source.params && typeof source.params === 'object' && !Array.isArray(source.params) ? source.params : source;
  const params = normalizeParams(rawParams);
  return {
    ...item,
    action: action || source.action,
    params
  };
}

function normalizeActionPlan(actions) {
  if (!Array.isArray(actions)) return actions;
  return actions.map((action) => normalizeAction(action));
}

/**
 * Attempt to parse actions expressed as "Action: name {\"param\": ...}" blocks
 * from a free‑form string.  Returns an array of actions or null if
 * nothing was matched.
 * @param {string} response
 */
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
    } catch {
      continue;
    }
  }
  // Extract inline "Run" commands of the form "1. Run: command"
  const runPattern = /\b\d+\.\s*Run\s*:[\s\S]*?\bcommand\s+\"([^\"]+)\"/gi;
  while ((match = runPattern.exec(response)) !== null) {
    actions.push({ action: 'run', params: { command: match[1] } });
  }
  return actions.length > 0 ? actions : null;
}

/**
 * Attempt to parse a JSON array of actions from a free‑form response.
 * Falls back to parseActionBlocksFromResponse if no JSON array is
 * found.  Returns null if nothing could be parsed.
 * @param {string} response
 */
function parseActionsFromResponse(response) {
  const match = response.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? normalizeActionPlan(parsed) : null;
    } catch {}
  }
  return parseActionBlocksFromResponse(response);
}

/**
 * Parse a single JSON object from free‑form text.  Locates the first
 * opening brace and the last closing brace to extract a JSON object.
 * @param {string} response
 */
function parseObjectFromResponse(response) {
  const start = response.indexOf('{');
  const end = response.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(response.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
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
  parseActionBlocksFromResponse,
  parseActionsFromResponse,
  parseObjectFromResponse
};