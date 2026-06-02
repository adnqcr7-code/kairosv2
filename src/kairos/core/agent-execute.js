// Execution helpers for performing actions during the agent loop.  These
// functions wrap lower‑level workspace tools, safety checks and tool
// logging to ensure consistent behaviour across write/read/run/test
// operations.  Extracted from agent-loop.js to improve modularity.

const fs = require('node:fs');
const path = require('node:path');
const { readTextFile, runReviewedCommand, safeResolve } = require('./workspace-tools');
const { runTests } = require('./test-runner');
const { requireApproval, reviewAction } = require('./safety');
const { logToolEvent } = require('./tool-log');
const { webFetch, browserOpen } = require('./web-tools');
const { addToConversationHistory } = require('./memory');
const { normalizeAction } = require('./agent-parse');

/**
 * Write content to a file safely (with approval and path restrictions).
 * Returns an object describing the outcome.  When approval is
 * declined, completed is false and a message is provided.  On
 * success the resolved path is returned.
 *
 * @param {string} filePath
 * @param {string} content
 * @param {object} flags
 */
async function writeFileSafe(filePath, content, flags = {}) {
  const resolved = safeResolve(filePath);
  const exists = fs.existsSync(resolved);
  const review = reviewAction({ kind: 'write', targetPath: resolved, exists, overwrite: exists });
  if (!await requireApproval(review, flags)) {
    return { completed: false, message: 'File write cancelled.', review };
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, 'utf8');
  return { completed: true, path: resolved, review };
}

/**
 * Execute a single normalised action.  Supports reading and
 * writing files, running shell commands, running tests, fetching
 * URLs, opening a browser, and recording thoughts.  All side effects
 * go through guarded helpers to respect safety policies.
 *
 * @param {object} action The action to execute
 * @param {object} goal The current goal metadata
 * @param {object} flags Additional execution flags
 */
async function executeAction(action, goal, flags = {}) {
  const normalized = normalizeAction(action);
  const { action: type, params = {} } = normalized;
  switch (type) {
    case 'read': {
      const { path: filePath } = params;
      if (!filePath) throw new Error('read action missing "path" parameter');
      const result = readTextFile(filePath);
      logToolEvent({ tool: 'agent.read', goalId: goal.id, path: filePath, completed: true });
      return { success: true, output: result.content, action: type };
    }
    case 'write': {
      const { path: filePath, content } = params;
      if (!filePath) throw new Error('write action missing "path" parameter');
      if (content === undefined) throw new Error('write action missing "content" parameter');
      const result = await writeFileSafe(filePath, content, flags);
      logToolEvent({ tool: 'agent.write', goalId: goal.id, path: filePath, completed: result.completed });
      if (!result.completed) {
        return { success: false, output: result.message, action: type };
      }
      return { success: true, output: `Wrote ${filePath}`, action: type };
    }
    case 'run': {
      const { command } = params;
      if (!command) throw new Error('run action missing "command" parameter');
      const result = await runReviewedCommand(command, flags);
      logToolEvent({ tool: 'agent.run', goalId: goal.id, command, completed: result.completed });
      return { success: result.completed, output: result.stdout || result.stderr, action: type };
    }
    case 'test': {
      const { command = 'npm test' } = params || {};
      const result = await runTests(command);
      logToolEvent({ tool: 'agent.test', goalId: goal.id, command, completed: result.ok });
      return { success: result.ok, output: result.output, failures: result.failures, action: type };
    }
    case 'web_fetch': {
      const { url, maxBytes, timeoutMs } = params || {};
      if (!url) throw new Error('web_fetch action missing "url" parameter');
      const result = await webFetch(url, flags, { maxBytes, timeoutMs });
      return {
        success: result.completed,
        output: result.output,
        action: type,
        statusCode: result.statusCode,
        finalUrl: result.finalUrl
      };
    }
    case 'browser_open': {
      const { target, url, allowRemote = false } = params || {};
      const openTarget = target || url;
      if (!openTarget) throw new Error('browser_open action missing "target" parameter');
      const result = await browserOpen(openTarget, flags, { allowRemote });
      return {
        success: result.completed,
        output: result.output || `Opened ${result.target}`,
        action: type,
        target: result.target
      };
    }
    case 'think': {
      const { reasoning, isQuestion } = params;
      logToolEvent({ tool: 'agent.think', goalId: goal.id, reasoning: reasoning?.substring(0, 200) });
      if (isQuestion) {
        addToConversationHistory('assistant', reasoning, { goalId: goal.id, isQuestion: true });
      }
      return { success: true, output: `Thought: ${reasoning || 'No reasoning provided'}`, action: type, isQuestion };
    }
    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

module.exports = {
  writeFileSafe,
  executeAction
};