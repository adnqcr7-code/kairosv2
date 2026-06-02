// Validation utilities for planned actions.  These functions check
// that the generated plan adheres to schema requirements, avoids
// unsafe behaviours, and includes appropriate actions for coding
// goals.

const { reviewCommand } = require('./safety');
const { normalizeActionPlan } = require('./agent-parse');

/**
 * Detect whether a goal is likely to involve coding.  This uses a
 * regular expression to match words associated with writing or
 * executing code.
 * @param {string} goalTitle
 */
function isCodingGoal(goalTitle) {
  return /\b(write|create|build|implement|code|script|function|test|math\.js|js)\b/i.test(goalTitle);
}

/**
 * Determine whether a list of actions contains at least one write
 * action and one run or test action.  Coding goals should always
 * include both.
 * @param {Array} actions
 */
function hasCodeActions(actions) {
  return actions.some((a) => a.action === 'write') && actions.some((a) => a.action === 'run' || a.action === 'test');
}

/**
 * Perform additional quality checks on a validated plan.  Flags
 * placeholder content, repeated writes to the same file, and high
 * risk commands.  Returns an array of issue messages.
 * @param {Array} actions
 * @param {string} goalTitle
 */
function validateActionQuality(actions, goalTitle) {
  const issues = [];
  const normalized = normalizeActionPlan(actions);
  if (!Array.isArray(normalized)) return ['Plan must be a JSON array before quality review.'];
  if (normalized.length > 12) {
    issues.push('Plan has too many actions. Keep plans small and resumable.');
  }
  const seenWrites = new Set();
  normalized.forEach((item, index) => {
    const params = item.params || {};
    if (item.action === 'write') {
      if (typeof params.content === 'string' && params.content.trim() === '...') {
        issues.push(`Action ${index} writes placeholder content.`);
      }
      if (params.path) {
        if (seenWrites.has(params.path)) issues.push(`Action ${index} writes the same path more than once: ${params.path}`);
        seenWrites.add(params.path);
      }
    }
    if (item.action === 'run' || item.action === 'test') {
      const command = params.command || (item.action === 'test' ? 'npm test' : '');
      const review = reviewCommand(command);
      if (review.level === 'high') {
        issues.push(`Action ${index} contains a high-risk command: ${command}`);
      }
    }
  });
  if (!isCodingGoal(goalTitle) && normalized.some((item) => item.action === 'write')) {
    issues.push('Non-coding goals should usually answer with think instead of writing files.');
  }
  return issues;
}

/**
 * Validate an array of actions against required parameters and
 * high‑level quality rules.  Returns an array of issues; an empty
 * array means the plan is valid.  Setting options.quality to false
 * disables quality checks.
 * @param {Array} actions
 * @param {string} goalTitle
 * @param {object} options
 */
function validateActionPlan(actions, goalTitle, options = {}) {
  actions = normalizeActionPlan(actions);
  const issues = [];
  if (!Array.isArray(actions) || actions.length === 0) {
    return ['Plan must be a non-empty JSON array of actions.'];
  }
  const requiredParams = {
    read: ['path'],
    write: ['path', 'content'],
    run: ['command'],
    test: [],
    web_fetch: ['url'],
    browser_open: [],
    think: []
  };
  actions.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      issues.push(`Action ${index} must be an object.`);
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(requiredParams, item.action)) {
      issues.push(`Action ${index} has unknown action type: ${item.action}`);
      return;
    }
    const params = item.params || {};
    if (typeof params !== 'object' || Array.isArray(params)) {
      issues.push(`Action ${index} params must be an object.`);
      return;
    }
    for (const key of requiredParams[item.action]) {
      if (params[key] === undefined || params[key] === '') {
        issues.push(`Action ${index} (${item.action}) missing "${key}" parameter.`);
      }
    }
    if (item.action === 'browser_open' && !params.target && !params.url) {
      issues.push(`Action ${index} (browser_open) missing "target" parameter.`);
    }
  });
  if (isCodingGoal(goalTitle) && !hasCodeActions(actions)) {
    issues.push('Coding goals must include at least one write action and one run or test action.');
  }
  if (options.quality !== false) {
    issues.push(...validateActionQuality(actions, goalTitle));
  }
  return issues;
}

module.exports = {
  isCodingGoal,
  hasCodeActions,
  validateActionQuality,
  validateActionPlan
};