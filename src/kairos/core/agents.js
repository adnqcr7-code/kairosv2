function plannerAgent(goal) {
  const title = goal.title.toLowerCase();
  const tasks = [
    'Define the target user and success criteria.',
    'Inspect the current project structure before changing files.',
    'Choose the smallest implementation that proves the goal.',
    'Add setup instructions and runnable commands.',
    'Run checks and capture the result.'
  ];

  if (title.includes('discord')) {
    tasks.splice(2, 0, 'Create or reuse a Discord.js template with .env.example and slash command setup.');
  }

  if (title.includes('extension') || title.includes('chrome') || title.includes('brave')) {
    tasks.splice(2, 0, 'Create a browser extension manifest, content script, popup, and local rules data.');
  }

  return {
    role: 'planner',
    output: {
      summary: 'Goal split into small, verifiable steps.',
      tasks
    }
  };
}

function builderAgent(plan) {
  return {
    role: 'builder',
    output: {
      summary: 'Builder is in safe proposal mode for MVP 0.1.',
      proposedChanges: plan.output.tasks.map((task, index) => ({
        step: index + 1,
        action: task,
        status: 'proposal'
      }))
    }
  };
}

function reviewerAgent(goal, build) {
  const risks = [
    'No automatic edits yet, so implementation still needs a guarded patch layer.',
    'No real model APIs are connected yet.',
    'No command runner is enabled yet; tests are recommendations only.'
  ];

  if (goal.budgetMode === 'best') {
    risks.push('Best mode selects future cloud providers, but this MVP refuses network calls until adapters are configured.');
  }

  return {
    role: 'reviewer',
    output: {
      summary: 'Reviewed the proposed work for safety and missing pieces.',
      risks,
      recommendation: 'Next version should add a patch tool with path restrictions and approval prompts.'
    }
  };
}

function testerAgent() {
  return {
    role: 'tester',
    output: {
      summary: 'Recommended checks for the next implementation stage.',
      checks: [
        'node --check changed JavaScript files',
        'npm run check when a project provides it',
        'manual run of generated CLI command',
        'review generated README/setup instructions'
      ]
    }
  };
}

function packagerAgent(goal) {
  return {
    role: 'packager',
    output: {
      summary: 'Delivery checklist created.',
      checklist: [
        `Goal title: ${goal.title}`,
        'Confirm generated project runs from clean install.',
        'Include README and .env.example.',
        'Include pricing/delivery notes for POSEIDON-style client work.'
      ]
    }
  };
}

function runOfflineSwarm(goal) {
  const plan = plannerAgent(goal);
  const build = builderAgent(plan);
  const review = reviewerAgent(goal, build);
  const test = testerAgent(goal);
  const packageStep = packagerAgent(goal);

  return [plan, build, review, test, packageStep];
}

module.exports = {
  runOfflineSwarm
};
