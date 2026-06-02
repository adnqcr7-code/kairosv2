// Helper functions for assembling prompt snippets used by the Kairos
// agent.  These were extracted from agent-loop.js to keep the core
// orchestrator focused on high‑level control flow.

const { commandSandboxMode } = require('./sandbox');

/**
 * Describe the available actions and their parameters.  The returned
 * string is embedded directly into prompts sent to the AI planner.
 */
function actionSchemaText() {
  return `Available actions (use lowercase names exactly):
- read: { "path": "..." }
- write: { "path": "...", "content": "..." }
- run: { "command": "..." }
- test: { "command": "npm test" }
- web_fetch: { "url": "https://...", "maxBytes": 120000 }
- browser_open: { "target": "http://localhost:3000", "allowRemote": false }
- think: { "reasoning": "...", "isQuestion": false }`;
}

/**
 * Provide the rules for composing action plans.  These are injected
 * into prompts to help the AI avoid invalid or unsafe plans.
 */
function actionRulesText() {
  return `IMPORTANT RULES:
1. If the goal involves writing code or creating files, you MUST include at least one write action and one run or test action. Do not output only a think action for an actionable goal.
2. If the goal is ambiguous or you need clarification, output a think action with "isQuestion": true and ask the user what they mean.
3. Use web_fetch only when a specific URL is needed for docs or evidence. Prefer official docs and cite the fetched URL in later reasoning.
4. Use browser_open only for local previews or workspace files after a run action starts something worth previewing. Remote browser_open requires "allowRemote": true.
5. Prefer small, reversible actions. Read or inspect before writing unless the goal is trivial.
6. Do not create actions that steal secrets, bypass access controls, spam, harm users, or hide destructive behavior.
7. For explanation-only goals, use a think action with the answer. Do not invent file edits just to look busy.
8. Respond ONLY with the JSON requested, nothing else.`;
}

/**
 * Describe the command execution environment to the AI, depending on
 * whether sandboxing is enabled.  This helps the AI choose
 * appropriate commands and avoid using Linux semantics on Windows.
 */
function sandboxInstructionText(flags = {}) {
  let mode;
  try {
    mode = commandSandboxMode(flags);
  } catch {
    mode = 'host';
  }

  if (mode === 'ubuntu-docker') {
    return [
      'Execution environment: approved run/test commands execute in a hardened Ubuntu Docker sandbox.',
      'Use bash/Linux commands for run/test actions. The workspace is mounted at /workspace.',
      'Network is disabled by default. Do not install packages unless the user explicitly approved it.'
    ].join('\n');
  }

  if (mode === 'ubuntu-wsl') {
    return [
      'Execution environment: approved run/test commands execute in Ubuntu through WSL.',
      'Use bash/Linux commands for run/test actions. Treat WSL as less isolated than Docker.',
      'Do not install packages or modify system state unless the user explicitly approved it.'
    ].join('\n');
  }

  return [
    'Execution environment: approved run/test commands execute on the host shell.',
    'On Windows, prefer npm.cmd and PowerShell-compatible commands unless a sandbox mode says otherwise.'
  ].join('\n');
}

/**
 * Summarise the ethical guidelines and quality standards that the AI
 * should follow when generating responses.  These guidelines are
 * constant across goals.
 */
function ethicsAndQualityText() {
  return `Responsible AI and QA rules:
- Be transparent about uncertainty and limitations.
- Minimize access to private files and secrets. Never request or expose tokens, passwords, API keys, or personal data.
- Validate outputs before execution: schema, action order, safety risk, and goal fit.
- Keep final user-facing output concise, scannable, and grounded in executed evidence.
- If a plan may affect user data or system state, choose the least risky action and rely on approval gates.`;
}

module.exports = {
  actionSchemaText,
  actionRulesText,
  sandboxInstructionText,
  ethicsAndQualityText
};