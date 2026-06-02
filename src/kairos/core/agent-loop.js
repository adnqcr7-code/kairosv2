// Orchestrator for the Kairos agent loop.  This module coordinates
// plan generation and action execution, delegating to specialised
// helper modules for parsing, validation and execution.  The goal is
// to keep the top‑level control flow clear and maintainable.

const { resetSessionCost, getSessionCost } = require('./brain');
const { saveCheckpoint, deleteCheckpoint } = require('./checkpoint');
const { loadConversationHistory, addToConversationHistory } = require('./memory');
const { recordGoalLesson } = require('./self-improvement');
const { logToolEvent } = require('./tool-log');
const { executeAction } = require('./agent-execute');
const { generatePlan } = require('./agent-actions');
const { parseActionsFromResponse, normalizeAction, normalizeActionPlan } = require('./agent-parse');
const { validateActionPlan } = require('./agent-validate');

/**
 * Main agent loop with checkpointing and resume.  Given a goal and
 * optional flags, this function generates a plan, executes each
 * action in sequence, handles checkpointing on success or failure,
 * and records a summary of the run.
 *
 * @param {object} goal The goal metadata
 * @param {object} flags Execution flags (e.g. budget limits)
 */
async function runAgentLoop(goal, flags = {}) {
  resetSessionCost();
  const startTime = Date.now();
  const steps = [];
  let actions = [];
  let startIndex = 0;
  const conversationHistory = loadConversationHistory().slice(-20);
  if (flags.resumeFrom) {
    const checkpoint = flags.resumeFrom;
    actions = checkpoint.actions;
    startIndex = checkpoint.stepIndex;
    steps.push(...checkpoint.steps);
    console.log(`Resuming from action ${startIndex} of ${actions.length}`);
  } else {
    let retries = 0;
    const maxRetries = 2;
    let lastError = null;
    while (retries <= maxRetries) {
      try {
        actions = await generatePlan(goal, steps, null, conversationHistory, flags);
        if (flags.budgetLimit && getSessionCost() > flags.budgetLimit) {
          throw new Error(`Budget exceeded: $${getSessionCost().toFixed(4)} > $${flags.budgetLimit.toFixed(4)}`);
        }
        break;
      } catch (err) {
        lastError = err.message;
        steps.push({ action: { action: 'plan', params: {} }, success: false, error: lastError, at: new Date().toISOString() });
        retries++;
        if (retries > maxRetries) {
          throw new Error(`Failed to generate plan: ${lastError}`);
        }
      }
    }
  }
  for (let i = startIndex; i < actions.length; i++) {
    const action = actions[i];
    const stepStart = Date.now();
    try {
      const result = await executeAction(action, goal, flags);
      steps.push({
        index: i,
        action,
        success: result.success,
        output: result.output,
        at: new Date().toISOString(),
        durationMs: Date.now() - stepStart
      });
      if (result.success && action.action !== 'think') {
        saveCheckpoint(goal.id, i + 1, actions, steps);
      }
      if (result.isQuestion) {
        addToConversationHistory('assistant', action.params.reasoning, { goalId: goal.id, isQuestion: true });
        break;
      }
      if (!result.success && action.action !== 'think') {
        break;
      }
    } catch (err) {
      steps.push({
        index: i,
        action,
        success: false,
        error: err.message,
        at: new Date().toISOString(),
        durationMs: Date.now() - stepStart
      });
      saveCheckpoint(goal.id, i, actions, steps);
      break;
    }
  }
  const summary = {
    goalId: goal.id,
    completed: steps.length > 0 && steps.every((s) => s.success !== false),
    steps: steps.length,
    durationMs: Date.now() - startTime,
    actionsExecuted: steps.length,
    totalCost: getSessionCost(),
    output: steps.filter((s) => s.output).map((s) => s.output).join('\n')
  };
  try {
    summary.lesson = recordGoalLesson(goal, summary, steps);
  } catch (err) {
    summary.lessonError = err.message;
  }
  logToolEvent({
    tool: 'agent.loop',
    goalId: goal.id,
    completed: summary.completed,
    steps: steps.length,
    durationMs: summary.durationMs
  });
  if (summary.completed) {
    deleteCheckpoint(goal.id);
  }
  return {
    role: 'agent-loop',
    output: summary,
    steps
  };
}

module.exports = {
  runAgentLoop,
  parseActionsFromResponse,
  normalizeAction,
  normalizeActionPlan,
  validateActionPlan
};