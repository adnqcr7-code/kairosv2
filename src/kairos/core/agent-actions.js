// High level planning and context utilities for Kairos — v2.1
//
// Key improvements:
// - Self-critique verification pass on generated plans
// - Prompt injection defense via prompt-sanitizer
// - Better structured output enforcement in prompts
// - verifyAndRepairActions before validation

const { askBrain } = require('./brain');
const { logToolEvent } = require('./tool-log');
const { searchSkills, getSkillContent } = require('./skills');
const { loadMemory } = require('./memory');
const { readGoalLessons, formatLessonsForPrompt } = require('./self-improvement');
const { searchContextIndex, formatContextResultsForPrompt } = require('./context-index');
const { scanToolOutput, injectionDefensePrompt } = require('./prompt-sanitizer');
const {
  actionSchemaText,
  actionRulesText,
  sandboxInstructionText,
  ethicsAndQualityText
} = require('./agent-prompts');
const {
  parseObjectFromResponse,
  parseActionsFromResponse,
  normalizeActionPlan,
  verifyAndRepairActions
} = require('./agent-parse');
const {
  validateActionPlan,
  isCodingGoal,
  hasCodeActions
} = require('./agent-validate');

function compactForPrompt(value, maxLength = 900) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function getRelevantSkillsContent(goalTitle) {
  try {
    const matchedSkills = searchSkills(goalTitle, 3);
    if (matchedSkills.length === 0) return '';
    const skillContents = [];
    for (const skill of matchedSkills) {
      try {
        let content = getSkillContent(skill.id);
        const { content: sanitized } = scanToolOutput(content, 'skill:' + skill.id);
        content = sanitized;
        const sections = [
          'Role Definition',
          'When to Activate',
          'Core Principles (Mental Model)',
          'Workflow / Process',
          'Quality Standards (Checklist)',
          'Anti-Patterns (What NOT to do)'
        ]
          .map(heading => {
            const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const match = content.match(new RegExp('## ' + escaped + '\\s+([\\s\\S]*?)(?=\\n## |$)'));
            return match ? '### ' + heading + '\n' + match[1].trim() : '';
          })
          .filter(Boolean);
        skillContents.push('## Skill: ' + skill.id + '\n' + sections.join('\n\n'));
      } catch { /* ignore */ }
    }
    return skillContents.join('\n\n');
  } catch {
    return '';
  }
}

function buildAgentContextSection(goal, previousSteps = [], conversationHistory = [], flags = {}) {
  const chunks = [];
  try {
    const memory = loadMemory();
    chunks.push([
      'Memory snapshot:',
      '- user style: ' + compactForPrompt(memory.user?.style || 'not set', 220),
      '- budget preference: ' + compactForPrompt(memory.preferences?.budget || 'not set', 160),
      '- safety preferences: ' + (memory.preferences?.safety || []).slice(0, 4).map(item => compactForPrompt(item, 120)).join('; ') || 'not set',
      '- recent notes: ' + (memory.notes || []).slice(-3).map(note => compactForPrompt(note.text || note, 160)).join(' | ') || 'none'
    ].join('\n'));
  } catch { /* ignore */ }

  const recentHistory = (conversationHistory || [])
    .slice(-6)
    .map(item => '- ' + item.role + ': ' + compactForPrompt(item.content, 220))
    .join('\n');
  if (recentHistory) chunks.push('Recent conversation:\n' + recentHistory);

  if (previousSteps.length > 0) {
    const lastSteps = previousSteps
      .slice(-5)
      .map(step => '- ' + (step.action?.action || 'unknown') + ': ' + compactForPrompt(step.output || step.error || '', 220))
      .join('\n');
    chunks.push('Already executed steps:\n' + lastSteps);
  }

  try {
    const retrieved = searchContextIndex(goal.title, { limit: 5 });
    const formatted = formatContextResultsForPrompt(retrieved);
    if (formatted) {
      const { content: sanitizedFormatted } = scanToolOutput(formatted, 'context-index');
      chunks.push(sanitizedFormatted);
    }
  } catch (err) {
    chunks.push('Context index unavailable: ' + compactForPrompt(err.message, 220));
  }

  chunks.push(sandboxInstructionText(flags));
  chunks.push(ethicsAndQualityText());
  chunks.push(injectionDefensePrompt());
  return chunks.length ? '\nAgent context pack:\n' + chunks.join('\n\n') + '\n' : '';
}

async function selfCritiquePlan(actions, goalTitle, conversationHistory = []) {
  const prompt = 'You are a plan verification agent for Kairos. Review this action plan:\n\n' +
    'Goal: ' + goalTitle + '\n\n' +
    'Plan:\n' + JSON.stringify(actions, null, 2) + '\n\n' +
    'Check for:\n' +
    '1. Are all action types valid? (read, write, run, test, web_fetch, browser_open, think)\n' +
    '2. Are all required parameters present?\n' +
    '3. Does the plan actually accomplish the goal?\n' +
    '4. Are there any unsafe or placeholder actions?\n' +
    '5. Is the plan too long (over 12 actions)?\n\n' +
    'If the plan is good, respond with: {"approved": true, "actions": <original actions>}\n' +
    'If the plan needs repair, respond with: {"approved": false, "actions": <repaired actions>}\n\n' +
    'Respond ONLY with JSON.';

  try {
    const response = await askBrain(prompt, conversationHistory);
    const review = parseObjectFromResponse(response);
    if (!review) return actions;
    if (review.approved) return review.actions || actions;
    if (Array.isArray(review.actions)) {
      logToolEvent({ tool: 'agents.self-critique', goalTitle, result: 'repaired' });
      return normalizeActionPlan(review.actions);
    }
    return actions;
  } catch {
    return actions;
  }
}

async function generateMultiAgentPlan({ goal, skillsSection, lessonsSection, contextSection, conversationHistory }) {
  const plannerPrompt = 'You are the planner agent for Kairos.\n\n' +
    'Mission: turn the user goal into small, testable tasks for a terminal coding agent. Do not write executable action JSON yet.\n\n' +
    skillsSection + '\n' + lessonsSection + '\n' + contextSection + '\n\n' +
    'Goal: ' + goal.title + '\n\n' +
    'IMPORTANT: Respond ONLY with valid JSON in this exact format:\n' +
    '{"summary":"...","tasks":["..."],"constraints":["..."],"successCriteria":["..."],"needsClarification":false,"question":""}\n\n' +
    'Do not include any text before or after the JSON object.';

  const plannerResponse = await askBrain(plannerPrompt, conversationHistory);
  const plannerPlan = parseObjectFromResponse(plannerResponse);
  logToolEvent({ tool: 'agents.planner', goalId: goal.id, completed: !!plannerPlan });
  if (!plannerPlan) return null;
  if (plannerPlan.needsClarification && plannerPlan.question) {
    return [{ action: 'think', params: { reasoning: plannerPlan.question, isQuestion: true } }];
  }

  const builderPrompt = 'You are the builder agent for Kairos.\n\n' +
    'Convert this planner output into executable Kairos action JSON.\n\n' +
    'Planner output:\n' + JSON.stringify(plannerPlan, null, 2) + '\n\n' +
    actionSchemaText() + '\n\n' + actionRulesText() + '\n\n' +
    'Goal: ' + goal.title + '\n\n' +
    'IMPORTANT: Respond ONLY with a JSON array of actions. No markdown, no explanation, just the array.\n' +
    'Example: [{"action":"write","params":{"path":"file.js","content":"..."}},{"action":"run","params":{"command":"node file.js"}}]';

  const builderResponse = await askBrain(builderPrompt, conversationHistory);
  const builderActions = parseActionsFromResponse(builderResponse);
  logToolEvent({ tool: 'agents.builder', goalId: goal.id, completed: !!builderActions, actions: builderActions?.length || 0 });
  if (!builderActions) return null;

  const localIssues = validateActionPlan(builderActions, goal.title);
  const reviewerPrompt = 'You are the reviewer agent for Kairos.\n\n' +
    'Review this action plan for schema validity, safety, missing validation, and whether it satisfies the goal. If it is weak, repair it.\n\n' +
    'Goal: ' + goal.title + '\n' +
    'Local schema issues already detected:\n' +
    (localIssues.length ? localIssues.map(issue => '- ' + issue).join('\n') : '- none') + '\n\n' +
    'Actions:\n' + JSON.stringify(builderActions, null, 2) + '\n\n' +
    actionSchemaText() + '\n\n' + actionRulesText() + '\n\n' +
    'IMPORTANT: Respond ONLY with valid JSON in this exact format:\n' +
    '{"approved":true,"issues":[],"actions":[{"action":"think","params":{"reasoning":"..."}}]}\n\n' +
    'If the plan needs repair, set approved to false and include repaired actions.';

  const reviewerResponse = await askBrain(reviewerPrompt, conversationHistory);
  const review = parseObjectFromResponse(reviewerResponse);
  const reviewedActions = Array.isArray(review?.actions)
    ? review.actions
    : Array.isArray(review?.repairedActions)
      ? review.repairedActions
      : builderActions;
  const reviewedIssues = validateActionPlan(reviewedActions, goal.title);
  logToolEvent({ tool: 'agents.reviewer', goalId: goal.id, completed: reviewedIssues.length === 0, issues: reviewedIssues.length });
  if (reviewedIssues.length > 0) return null;
  return normalizeActionPlan(reviewedActions);
}

async function generatePlan(goal, previousSteps = [], resumeFromActionIndex = null, conversationHistory = [], flags = {}) {
  const relevantSkills = getRelevantSkillsContent(goal.title);
  const skillsSection = relevantSkills ? '\n\nRelevant skills:\n' + relevantSkills + '\n' : '';
  const lessons = formatLessonsForPrompt(readGoalLessons(6));
  const lessonsSection = lessons ? '\n\n' + lessons + '\n' : '';
  const agentContextSection = buildAgentContextSection(goal, previousSteps, conversationHistory, flags);

  let contextSection = '';
  if (previousSteps.length > 0) {
    const lastSteps = previousSteps.slice(-5);
    contextSection = '\nAlready executed steps:\n' + lastSteps.map(s => '- ' + s.action.action + ': ' + (s.output || s.error)).join('\n') + '\n';
    if (resumeFromActionIndex !== null) {
      contextSection += 'Resume from action index ' + resumeFromActionIndex + ' (do not repeat previous actions).\n';
    }
  }

  if (flags.multiAgent || flags['multi-agent'] || goal.executionMode === 'multi-agent') {
    const multiAgentActions = await generateMultiAgentPlan({
      goal, skillsSection, lessonsSection,
      contextSection: agentContextSection + contextSection,
      conversationHistory
    });
    if (multiAgentActions) return multiAgentActions;
  }

  const systemPrompt = 'You are Kairos, a local-first coding agent. Break the goal into a JSON array of actions.\n\n' +
    actionSchemaText() + '\n\n' +
    actionRulesText() + '\n\n' +
    'CRITICAL OUTPUT FORMAT:\n' +
    '- Respond ONLY with a JSON array of action objects.\n' +
    '- Do NOT wrap the array in markdown code blocks.\n' +
    '- Do NOT add any explanatory text before or after the array.\n' +
    '- Do NOT use trailing commas.\n' +
    '- The response must start with [ and end with ].\n\n' +
    'Example (one-shot):\n' +
    '[{"action":"write","params":{"path":"math.js","content":"function add(a,b){return a+b;}\\nmodule.exports=add;"}},' +
    '{"action":"write","params":{"path":"math.test.js","content":"const add = require(\'./math.js\');\\nconsole.log(add(2,3));"}},' +
    '{"action":"run","params":{"command":"node math.test.js"}}]\n\n' +
    skillsSection + lessonsSection + agentContextSection + contextSection +
    'Goal: ' + goal.title + '\n\n' +
    'Now produce the plan as a JSON array.';

  const response = await askBrain(systemPrompt, conversationHistory);
  let actions = parseActionsFromResponse(response);
  let invalidPlanIssues = [];

  function acceptValidActions(candidate) {
    if (!candidate) return null;
    const normalized = normalizeActionPlan(candidate);
    const verified = verifyAndRepairActions(normalized, goal.title);
    const issues = validateActionPlan(verified, goal.title);
    if (issues.length > 0) {
      invalidPlanIssues = issues;
      return null;
    }
    return verified;
  }

  actions = acceptValidActions(actions);
  const needsCodeActions = isCodingGoal(goal.title);

  if (!actions || (needsCodeActions && !hasCodeActions(actions))) {
    const retryPrompt = 'Your previous response did not include valid actions.\n\n' +
      'RESPOND ONLY WITH A JSON ARRAY. No markdown, no explanation.\n\n' +
      'For coding goals: include at least one "write" action and one "run" or "test" action.\n\n' +
      'Goal: ' + goal.title + '\n\nJSON array:';
    const retryResponse = await askBrain(retryPrompt, conversationHistory);
    actions = acceptValidActions(parseActionsFromResponse(retryResponse));
  }

  if (!actions) {
    if (needsCodeActions) {
      const fallbackPrompt = 'Create a JSON array of actions for this goal. Include at least one write and one run action.\n\nGoal: ' + goal.title + '\n\nRespond with ONLY the JSON array, nothing else:';
      const fallbackResponse = await askBrain(fallbackPrompt, conversationHistory);
      actions = acceptValidActions(parseActionsFromResponse(fallbackResponse));
    }
  }

  if (!actions) {
    const tinyPrompt = 'Respond ONLY with this JSON array: [{"action":"think","params":{"reasoning":"answer the question"}}]\nGoal: ' + goal.title;
    const retry = await askBrain(tinyPrompt, conversationHistory);
    const retryMatch = retry.match(/\[[\s\S]*\]/);
    if (retryMatch) {
      try {
        const parsedRetry = JSON.parse(retryMatch[0]);
        if (Array.isArray(parsedRetry)) actions = acceptValidActions(parsedRetry);
      } catch {
        actions = null;
      }
    }
  }

  if (!actions) {
    if (invalidPlanIssues.length > 0) {
      throw new Error('Invalid action plan: ' + invalidPlanIssues.join('; '));
    }
    return [{ action: 'think', params: { reasoning: response.trim() } }];
  }

  // Self-critique verification pass (only for plans with 3+ actions)
  if (actions.length >= 3) {
    try {
      actions = await selfCritiquePlan(actions, goal.title, conversationHistory);
    } catch { /* Keep original actions */ }
  }

  return actions;
}

module.exports = {
  compactForPrompt,
  getRelevantSkillsContent,
  buildAgentContextSection,
  generateMultiAgentPlan,
  generatePlan,
  selfCritiquePlan
};
