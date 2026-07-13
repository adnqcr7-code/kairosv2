// Execution helpers — v2.1 with prompt injection scanning
//
// Key improvement: tool outputs (file reads, web fetch, shell output)
// are scanned for injection patterns before being used in agent context.

const fs = require('node:fs');
const path = require('node:path');
const { readTextFile, runReviewedCommand, safeResolve } = require('./workspace-tools');
const { runTests } = require('./test-runner');
const { requireApproval, reviewAction } = require('./safety');
const { logToolEvent } = require('./tool-log');
const { webFetch, browserOpen } = require('./web-tools');
const { addToConversationHistory } = require('./memory');
const { normalizeAction } = require('./agent-parse');
const { scanToolOutput } = require('./prompt-sanitizer');

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

async function executeAction(action, goal, flags = {}) {
  const normalized = normalizeAction(action);
  const { action: type, params = {} } = normalized;

  switch (type) {
    case 'read': {
      const { path: filePath } = params;
      if (!filePath) throw new Error('read action missing "path" parameter');
      const result = readTextFile(filePath);
      // Scan file content for injection patterns
      const { content: safeContent, warnings } = scanToolOutput(result.content, 'file-read:' + filePath);
      if (warnings.length > 0) {
        logToolEvent({ tool: 'agent.read.security', goalId: goal.id, path: filePath, warnings: warnings.length });
      }
      logToolEvent({ tool: 'agent.read', goalId: goal.id, path: filePath, completed: true });
      return { success: true, output: safeContent, action: type, _warnings: warnings };
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
      return { success: true, output: 'Wrote ' + filePath, action: type };
    }
    case 'run': {
      const { command } = params;
      if (!command) throw new Error('run action missing "command" parameter');
      const result = await runReviewedCommand(command, flags);
      logToolEvent({ tool: 'agent.run', goalId: goal.id, command, completed: result.completed });
      const output = result.stdout || result.stderr || '';
      const { content: safeOutput } = scanToolOutput(output, 'shell:' + command);
      return { success: result.completed, output: safeOutput, action: type };
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
      const output = result.output || '';
      const { content: safeOutput, warnings } = scanToolOutput(output, 'web-fetch:' + url);
      if (warnings.length > 0) {
        logToolEvent({ tool: 'agent.web_fetch.security', goalId: goal.id, url, warnings: warnings.length });
      }
      return {
        success: result.completed,
        output: safeOutput,
        action: type,
        statusCode: result.statusCode,
        finalUrl: result.finalUrl,
        _warnings: warnings
      };
    }
    case 'browser_open': {
      const { target, url, allowRemote = false } = params || {};
      const openTarget = target || url;
      if (!openTarget) throw new Error('browser_open action missing "target" parameter');
      const result = await browserOpen(openTarget, flags, { allowRemote });
      return {
        success: result.completed,
        output: result.output || 'Opened ' + result.target,
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
      return { success: true, output: 'Thought: ' + (reasoning || 'No reasoning provided'), action: type, isQuestion };
    }
    default:
      throw new Error('Unknown action type: ' + type);
  }
}

module.exports = {
  writeFileSafe,
  executeAction
};
