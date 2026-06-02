const ROLE_CONTRACTS = {
  planner: {
    canReadFiles: true,
    canEditFiles: false,
    canRunCommands: false,
    purpose: 'Break the goal into clear, testable tasks.'
  },
  builder: {
    canReadFiles: true,
    canEditFiles: false,
    canRunCommands: false,
    purpose: 'Propose implementation steps. File edits come in a later guarded version.'
  },
  reviewer: {
    canReadFiles: true,
    canEditFiles: false,
    canRunCommands: false,
    purpose: 'Find bugs, missing setup, safety issues, and weak tests.'
  },
  tester: {
    canReadFiles: false,
    canEditFiles: false,
    canRunCommands: false,
    purpose: 'Recommend checks. Command execution will require a future approval gate.'
  },
  packager: {
    canReadFiles: true,
    canEditFiles: false,
    canRunCommands: false,
    purpose: 'Prepare delivery notes and packaging checklist.'
  }
};

function buildWarning(goal, modelPlan) {
  const lines = [
    'Kairos Swarm Warning',
    '',
    `Goal: ${goal.title}`,
    `Budget mode: ${goal.budgetMode}`,
    `Approval mode: ${goal.approvalMode}`,
    `Execution mode: ${goal.executionMode || 'agent-loop'}`,
    `Active provider: ${goal.activeProvider?.id || 'offline'} (${goal.activeProvider?.configured ? 'configured' : 'needs setup'})`,
    '',
    'Agents:'
  ];

  for (const [role, contract] of Object.entries(ROLE_CONTRACTS)) {
    const provider = modelPlan[role];
    lines.push(`- ${role}: ${contract.purpose}`);
    lines.push(`  provider: ${provider.id} (${provider.notes})`);
    lines.push(`  permissions: read=${contract.canReadFiles}, edit=${contract.canEditFiles}, command=${contract.canRunCommands}`);
  }

  lines.push('');
  lines.push('Safety rules for this MVP:');
  lines.push('- planner/builder/reviewer roles propose work; the guarded action runner executes it');
  lines.push('- file writes stay inside approved local roots and ask before overwriting');
  lines.push('- shell commands are reviewed before execution');
  lines.push('- remote web_fetch and remote browser_open targets require approval');
  lines.push('- cloud/model calls only happen when a provider is explicitly configured');
  lines.push('- goals are stored locally under data/kairos/goals');

  return lines.join('\n');
}

function approveGoal(goal) {
  if (goal.status !== 'pending_approval') {
    throw new Error(`Goal is not waiting for approval. Current status: ${goal.status}`);
  }

  return {
    ...goal,
    status: 'approved',
    approvedAt: new Date().toISOString()
  };
}

module.exports = {
  ROLE_CONTRACTS,
  buildWarning,
  approveGoal
};
