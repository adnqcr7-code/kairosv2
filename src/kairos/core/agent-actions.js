// High level planning and context utilities for Kairos.  These functions
// assist the agent in choosing relevant skills, building context
// sections for prompts, and generating coherent plans via AI models.

const { askBrain } = require('./brain');
const { logToolEvent } = require('./tool-log');
const { searchSkills, getSkillContent } = require('./skills');
const { loadMemory } = require('./memory');
const { readGoalLessons, formatLessonsForPrompt } = require('./self-improvement');
const { searchContextIndex, formatContextResultsForPrompt } = require('./context-index');
const {
  actionSchemaText,
  actionRulesText,
  sandboxInstructionText,
  ethicsAndQualityText
} = require('./agent-prompts');
const {
  parseObjectFromResponse,
  parseActionsFromResponse,
  normalizeActionPlan
} = require('./agent-parse');
const {
  validateActionPlan,
  isCodingGoal,
  hasCodeActions
} = require('./agent-validate');

/**
 * Safely compact a value into a single line of text, replacing
 * consecutive whitespace with a single space and truncating long
 * strings.  Used to summarise conversation history, memory notes and
 * previous steps in prompt context.
 *
 * @param {any} value
 * @param {number} maxLength
 */
function compactForPrompt(value, maxLength = 900) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Select relevant skills for the goal and return their full content.
 * Skills are matched based on the goal title and up to a small
 * number of candidates are returned.  Only key sections of each
 * skill definition are included to keep prompts concise.
 *
 * @param {string} goalTitle
 */
function getRelevantSkillsContent(goalTitle) {
  try {
    const matchedSkills = searchSkills(goalTitle, 3);
    if (matchedSkills.length === 0) return '';
    const skillContents = [];
    for (const skill of matchedSkills) {
      try {
        const content = getSkillContent(skill.id);
        const sections = [
          'Role Definition',
          'When to Activate',
          'Core Principles (Mental Model)',
          'Workflow / Process',
          'Quality Standards (Checklist)',
          'Anti-Patterns (What NOT to do)'
        ]
          .map((heading) => {
            const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const match = content.match(new RegExp(`## ${escaped}\\s+([\\s\\S]*?)(?=\\n## |$)`));
            return match ? `### ${heading}\n${match[1].trim()}` : '';
          })
          .filter(Boolean);
        skillContents.push(`## Skill: ${skill.id}\n${sections.join('\n\n')}`);
      } catch {
        // If skill content cannot be loaded, silently ignore it
      }
    }
    return skillContents.join('\n\n');
  } catch {
    return '';
  }
}

/**
 * Assemble a rich context section for prompts given the current goal,
 * conversation history and previous execution steps.  Includes a
 * memory snapshot, recent conversation snippets, previous steps,
 * retrieved context documents, sandbox instructions and ethics
 * guidelines.
 *
 * @param {object} goal
 * @param {Array} previousSteps
 * @param {Array} conversationHistory
 * @param {object} flags
 */
function buildAgentContextSection(goal, previousSteps = [], conversationHistory = [], flags = {}) {
  const chunks = [];
  try {
    const memory = loadMemory();
    chunks.push([
      'Memory snapshot:',
      `- user style: ${compactForPrompt(memory.user?.style || 'not set', 220)}`,
      `- budget preference: ${compactForPrompt(memory.preferences?.budget || 'not set', 160)}`,
      `- safety preferences: ${(memory.preferences?.safety || []).slice(0, 4).map((item) => compactForPrompt(item, 120)).join('; ') || 'not set'}`,
      `- recent notes: ${(memory.notes || []).slice(-3).map((note) => compactForPrompt(note.text || note, 160)).join(' | ') || 'none'}`
    ].join('\n'));
  } catch {
    // ignore errors loading memory
  }
  const recentHistory = (conversationHistory || [])
    .slice(-6)
    .map((item) => `- ${item.role}: ${compactForPrompt(item.content, 220)}`)
    .join('\n');
  if (recentHistory) chunks.push(`Recent conversation:\n${recentHistory}`);
  if (previousSteps.length > 0) {
    const lastSteps = previousSteps
      .slice(-5)
      .map((step) => `- ${step.action?.action || 'unknown'}: ${compactForPrompt(step.output || step.error || '', 220)}`)
      .join('\n');
    chunks.push(`Already executed steps:\n${lastSteps}`);
  }
  try {
    const retrieved = searchContextIndex(goal.title, { limit: 5 });
    const formatted = formatContextResultsForPrompt(retrieved);
    if (formatted) chunks.push(formatted);
  } catch (err) {
    chunks.push(`Context index unavailable: ${compactForPrompt(err.message, 220)}`);
  }
  chunks.push(sandboxInstructionText(flags));
  chunks.push(ethicsAndQualityText());
  return chunks.length ? `\nAgent context pack:\n${chunks.join('\n\n')}\n` : '';
}

/**
 * Generate a plan using the planner/builder/reviewer swarm when
 * multi‑agent mode is enabled.  Returns an array of normalised
 * actions or null on failure.  The underlying askBrain calls are
 * logged via the tool log.
 *
 * @param {object} options
 */
async function generateMultiAgentPlan({ goal, skillsSection, lessonsSection, contextSection, conversationHistory }) {
  const plannerPrompt = `You are the planner agent for Kairos.\n\nMission: turn the user goal into small, testable tasks for a terminal coding agent. Do not write executable action JSON yet.\n\n${skillsSection}\n${lessonsSection}\n${contextSection}\nGoal: ${goal.title}\n\nRespond ONLY with JSON:\n{"summary":"...","tasks":["..."],"constraints":["..."],"successCriteria":["..."],"needsClarification":false,"question":""}`;
  const plannerResponse = await askBrain(plannerPrompt, conversationHistory);
  const plannerPlan = parseObjectFromResponse(plannerResponse);
  logToolEvent({ tool: 'agents.planner', goalId: goal.id, completed: !!plannerPlan });
  if (!plannerPlan) return null;
  if (plannerPlan.needsClarification && plannerPlan.question) {
    return [{ action: 'think', params: { reasoning: plannerPlan.question, isQuestion: true } }];
  }
  const builderPrompt = `You are the builder agent for Kairos.\n\nConvert this planner output into executable Kairos action JSON.\n\nPlanner output:\n${JSON.stringify(plannerPlan, null, 2)}\n\n${actionSchemaText()}\n\n${actionRulesText()}\n\nGoal: ${goal.title}\n\nRespond ONLY with the JSON array of actions.`;
  const builderResponse = await askBrain(builderPrompt, conversationHistory);
  const builderActions = parseActionsFromResponse(builderResponse);
  logToolEvent({ tool: 'agents.builder', goalId: goal.id, completed: !!builderActions, actions: builderActions?.length || 0 });
  if (!builderActions) return null;
  const localIssues = validateActionPlan(builderActions, goal.title);
  const reviewerPrompt = `You are the reviewer agent for Kairos.\n\nReview this action plan for schema validity, safety, missing validation, and whether it satisfies the goal. If it is weak, repair it.\n\nGoal: ${goal.title}\nLocal schema issues already detected:\n${localIssues.length ? localIssues.map((issue) => `- ${issue}`).join('\n') : '- none'}\n\nActions:\n${JSON.stringify(builderActions, null, 2)}\n\n${actionSchemaText()}\n\n${actionRulesText()}\n\nRespond ONLY with JSON:\n{"approved":true,"issues":[],"actions":[{"action":"think","params":{"reasoning":"..."}}]}`;
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

/**
 * Generate a plan for a goal using a single agent.  This function
 * constructs a prompt including skills, lessons, context and prior
 * steps, then calls the model.  It performs retries on invalid
 * responses and falls back to a simple think action if no valid plan
 * can be produced.
 *
 * @param {object} goal
 * @param {Array} previousSteps
 * @param {number|null} resumeFromActionIndex
 * @param {Array} conversationHistory
 * @param {object} flags
 */
async function generatePlan(goal, previousSteps = [], resumeFromActionIndex = null, conversationHistory = [], flags = {}) {
  const relevantSkills = getRelevantSkillsContent(goal.title);
  const skillsSection = relevantSkills ? `\n\nRelevant skills:\n${relevantSkills}\n` : '';
  const lessons = formatLessonsForPrompt(readGoalLessons(6));
  const lessonsSection = lessons ? `\n\n${lessons}\n` : '';
  const agentContextSection = buildAgentContextSection(goal, previousSteps, conversationHistory, flags);
  let contextSection = '';
  if (previousSteps.length > 0) {
    const lastSteps = previousSteps.slice(-5);
    contextSection = `\nAlready executed steps:\n${lastSteps.map((s) => `- ${s.action.action}: ${s.output || s.error}`).join('\n')}\n`;
    if (resumeFromActionIndex !== null) {
      contextSection += `Resume from action index ${resumeFromActionIndex} (do not repeat previous actions).\n`;
    }
  }
  if (flags.multiAgent || flags['multi-agent'] || goal.executionMode === 'multi-agent') {
    const multiAgentActions = await generateMultiAgentPlan({
      goal,
      skillsSection,
      lessonsSection,
      contextSection: `${agentContextSection}${contextSection}`,
      conversationHistory
    });
    if (multiAgentActions) return multiAgentActions;
  }
  const systemPrompt = `You are Kairos, a local-first coding agent. Break the goal into a JSON array of actions.\n\n${actionSchemaText()}\n\n${actionRulesText()}\n\nExample (one-shot):\n[{"action":"write","params":{"path":"math.js","content":"function add(a,b){return a+b;}\nmodule.exports=add;"}},\n{"action":"write","params":{"path":"math.test.js","content":"const add = require('./math.js');\nconsole.log(add(2,3));"}},\n{"action":"run","params":{"command":"node math.test.js"}}]\n\n${skillsSection}${lessonsSection}${agentContextSection}${contextSection}Goal: ${goal.title}\nNow produce the plan.`;
  const response = await askBrain(systemPrompt, conversationHistory);
  let actions = parseActionsFromResponse(response);
  let invalidPlanIssues = [];
  function acceptValidActions(candidate) {
    if (!candidate) return null;
    const normalized = normalizeActionPlan(candidate);
    const issues = validateActionPlan(normalized, goal.title);
    if (issues.length > 0) {
      invalidPlanIssues = issues;
      return null;
    }
    return normalized;
  }
  actions = acceptValidActions(actions);
  const needsCodeActions = isCodingGoal(goal.title);
  if (!actions || (needsCodeActions && !hasCodeActions(actions))) {
    const retryPrompt = `Your previous response did not include the required actions. Respond ONLY with a JSON array of actions. For a coding goal, include at least one write action to create the file and one run or test action to execute it. Do not return only a think action.\nGoal: ${goal.title}`;
    const retryResponse = await askBrain(retryPrompt, conversationHistory);
    actions = acceptValidActions(parseActionsFromResponse(retryResponse));
  }
  if (!actions) {
    if (needsCodeActions) {
      const fallbackPrompt = `Respond ONLY with a JSON array of actions. For this coding goal, include at least one write action and one run or test action. Goal: ${goal.title}`;
      const fallbackResponse = await askBrain(fallbackPrompt, conversationHistory);
      actions = acceptValidActions(parseActionsFromResponse(fallbackResponse));
    }
  }
  if (!actions) {
    const tinyPrompt = `Respond ONLY with this JSON array: [{"action":"think","params":{"reasoning":"answer the question"}}]\nGoal: ${goal.title}`;
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
      throw new Error(`Invalid action plan: ${invalidPlanIssues.join('; ')}`);
    }
    return [{ action: 'think', params: { reasoning: response.trim() } }];
  }
  return actions;
}

module.exports = {
  compactForPrompt,
  getRelevantSkillsContent,
  buildAgentContextSection,
  generateMultiAgentPlan,
  generatePlan
};