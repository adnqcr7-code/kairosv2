const fs = require('node:fs');
const path = require('node:path');
const { kairosDataDir } = require('./storage');
const { logToolEvent } = require('./tool-log');

function lessonsPath() {
  return path.join(kairosDataDir(), 'lessons.jsonl');
}

function ensureLessonsDir() {
  fs.mkdirSync(path.dirname(lessonsPath()), { recursive: true });
}

function redact(text = '') {
  return String(text)
    .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^"'\s]+/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]');
}

function compactText(text = '', maxLength = 280) {
  const cleaned = redact(text).replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 3)}...`;
}

function readGoalLessons(limit = 8) {
  const filePath = lessonsPath();
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function formatLessonsForPrompt(lessons = readGoalLessons()) {
  if (!lessons.length) return '';

  const lines = lessons.map((lesson) => {
    const status = lesson.completed ? 'success' : 'failure';
    return `- ${status}: ${lesson.lesson}`;
  });

  return [
    'Recent Kairos lessons from prior goal runs:',
    ...lines
  ].join('\n');
}

function summarizeActions(steps = []) {
  const counts = {};
  for (const step of steps) {
    const actionType = step.action?.action || 'unknown';
    counts[actionType] = (counts[actionType] || 0) + 1;
  }
  return counts;
}

function recordGoalLesson(goal, summary, steps = []) {
  ensureLessonsDir();

  const failedSteps = steps.filter((step) => step.success === false);
  const actionCounts = summarizeActions(steps);
  const actionTypes = Object.keys(actionCounts);
  const completed = !!summary.completed;
  const firstFailure = failedSteps[0];
  const failedAction = firstFailure?.action?.action;
  const failureDetail = compactText(firstFailure?.error || firstFailure?.output || '');

  const lesson = completed
    ? `For "${goal.title}", the action mix ${actionTypes.join(', ') || 'none'} completed successfully. Reuse this shape for similar goals.`
    : `For "${goal.title}", ${failedAction || 'planning'} failed${failureDetail ? `: ${failureDetail}` : ''}. Future plans should inspect context, keep actions smaller, and add validation before repeating that step.`;

  const record = {
    at: new Date().toISOString(),
    goalId: goal.id,
    title: goal.title,
    completed,
    actionCounts,
    failedActions: failedSteps.slice(0, 3).map((step) => ({
      index: step.index,
      action: step.action?.action || 'unknown',
      detail: compactText(step.error || step.output || '')
    })),
    lesson
  };

  fs.appendFileSync(lessonsPath(), `${JSON.stringify(record)}\n`, 'utf8');
  logToolEvent({
    tool: 'self.lessons',
    goalId: goal.id,
    completed,
    actionTypes,
    failedActions: record.failedActions.length
  });
  return record;
}

module.exports = {
  formatLessonsForPrompt,
  lessonsPath,
  readGoalLessons,
  recordGoalLesson
};
