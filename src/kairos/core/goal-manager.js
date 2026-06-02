const { runAgentLoop } = require('./agent-loop');
const { buildWarning, approveGoal } = require('./governor');
const { BUDGET_MODES, routeModels } = require('./model-router');
const { providerStatus } = require('./providers');
const { suggestSkillsForGoal } = require('./skills');
const { saveGoal, loadGoal, listGoals } = require('./storage');
const { loadCheckpoint, deleteCheckpoint } = require('./checkpoint');

const APPROVAL_MODES = Object.freeze(['step', 'auto-safe', 'manual']);

function nextGoalId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `goal_${stamp}_${suffix}`;
}

function createGoal({ title, budgetMode, approvalMode, executionMode = 'agent-loop' }) {
  if (!BUDGET_MODES.includes(budgetMode)) {
    throw new Error(`Invalid budget mode: ${budgetMode}. Use one of: ${BUDGET_MODES.join(', ')}`);
  }

  if (!APPROVAL_MODES.includes(approvalMode)) {
    throw new Error(`Invalid approval mode: ${approvalMode}. Use one of: ${APPROVAL_MODES.join(', ')}`);
  }

  const modelPlan = routeModels(budgetMode);
  const activeProvider = providerStatus();
  const suggestedSkills = suggestSkillsForGoal(title);
  const goal = {
    id: nextGoalId(),
    title,
    status: 'pending_approval',
    budgetMode,
    approvalMode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    modelPlan: Object.fromEntries(
      Object.entries(modelPlan).map(([role, provider]) => [role, provider.id])
    ),
    suggestedSkills: suggestedSkills.map((skill) => ({
      id: skill.id,
      title: skill.title,
      relativePath: skill.relativePath
    })),
    successCriteria: [
      'Plan is clear enough to implement.',
      'Safety rules are visible before work starts.',
      'No file edits happen without a later approval layer.',
      'Goal state can be resumed from disk.'
    ],
    executionMode,
    activeProvider,
    events: [
      {
        at: new Date().toISOString(),
        type: 'goal.created',
        message: 'Goal created and waiting for approval.'
      }
    ]
  };

  goal.warning = buildWarning(goal, modelPlan);
  return saveGoal(goal);
}

async function runApprovedGoal(goalId, flags = {}) {
  const loaded = loadGoal(goalId);
  const approved = approveGoal(loaded);
  
  // Check for existing checkpoint
  const checkpoint = loadCheckpoint(goalId);
  let outputs;
  if (checkpoint && flags.resume !== false) {
    console.log(`Resuming goal ${goalId} from step ${checkpoint.stepIndex}`);
    outputs = await runAgentLoop(approved, { ...flags, resumeFrom: checkpoint });
  } else {
    if (checkpoint) deleteCheckpoint(goalId);
    outputs = await runAgentLoop(approved, flags);
  }

  const isCompleted = !!(outputs && outputs.output && outputs.output.completed === true);
  const completed = {
    ...approved,
    status: isCompleted ? 'completed' : 'failed',
    updatedAt: new Date().toISOString(),
    completedAt: isCompleted ? new Date().toISOString() : null,
    totalCost: outputs.output?.totalCost || 0,
    outputs,
    events: [
      ...approved.events,
      {
        at: new Date().toISOString(),
        type: 'goal.approved',
        message: 'User approved the goal.'
      },
      {
        at: new Date().toISOString(),
        type: 'agent.loop.completed',
        message: `Agent loop executed ${outputs.steps?.length || 0} steps. Completed: ${isCompleted}`
      }
    ]
  };

  deleteCheckpoint(goalId);
  return saveGoal(completed);
}

module.exports = {
  APPROVAL_MODES,
  createGoal,
  loadGoal,
  listGoals,
  runApprovedGoal
};
