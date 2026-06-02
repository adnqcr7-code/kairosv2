// Expanded tool definitions.  Each tool includes a name, risk level
// and parameter schema in addition to the existing id, status and
// description fields.  Handlers are provided for tools that are
// currently implemented.  Where a handler is not yet available, it
// may be null or a stub that throws an informative error.
// Import handlers for patch/diff commands from workspace-tools.  Only
// require what we need so that this file remains dependency-light.
const {
  previewPatch,
  applyFilePatch,
  viewPendingPatch
} = require('./workspace-tools');

const TOOL_DEFINITIONS = [
  {
    id: 'goal.create',
    name: 'Create goal',
    status: 'ready',
    description: 'Create a guarded /goal run and save it locally.',
    risk: 'low',
    params: { title: { type: 'string', required: true } },
    handler: null
  },
  {
    id: 'goal.approve',
    name: 'Approve goal',
    status: 'ready',
    description: 'Approve a pending goal and run the offline-safe swarm.',
    risk: 'low',
    params: { id: { type: 'string', required: true } },
    handler: null
  },
  {
    id: 'skills.list',
    name: 'List skills',
    status: 'ready',
    description: 'Scan and list local markdown skills.',
    risk: 'low',
    params: {},
    handler: null
  },
  {
    id: 'skills.search',
    name: 'Search skills',
    status: 'ready',
    description: 'Find relevant built-in skills for a task.',
    risk: 'low',
    params: { query: { type: 'string', required: true } },
    handler: null
  },
  {
    id: 'skills.show',
    name: 'Show skill',
    status: 'ready',
    description: 'Display a specific skill by id.',
    risk: 'low',
    params: { id: { type: 'string', required: true } },
    handler: null
  },
  {
    id: 'brain.setup',
    name: 'Setup brain',
    status: 'ready',
    description: 'Choose or change the AI brain provider.',
    risk: 'low',
    params: { provider: { type: 'string', required: false } },
    handler: null
  },
  {
    id: 'brain.status',
    name: 'Brain status',
    status: 'ready',
    description: 'Show current AI brain config without exposing secrets.',
    risk: 'low',
    params: {},
    handler: null
  },
  {
    id: 'providers.setup',
    name: 'Setup provider',
    status: 'ready',
    description: 'Lower-level provider configuration command.',
    risk: 'low',
    params: { provider: { type: 'string', required: false } },
    handler: null
  },
  {
    id: 'providers.status',
    name: 'Provider status',
    status: 'ready',
    description: 'Lower-level provider status command.',
    risk: 'low',
    params: { provider: { type: 'string', required: false } },
    handler: null
  },
  {
    id: 'files.read',
    name: 'Read file',
    status: 'ready',
    description: 'Read approved project files for agent context.',
    risk: 'low',
    params: { path: { type: 'string', required: true } },
    async handler({ path }, flags = {}) {
      // Lazy import to avoid circular dependencies.
      const { readTextFile } = require('./workspace-tools');
      return readTextFile(path, {});
    }
  },
  {
    id: 'files.search',
    name: 'Search files',
    status: 'ready',
    description: 'Search files with fast ripgrep-style matching.',
    risk: 'low',
    params: { query: { type: 'string', required: true } },
    async handler({ query, path }, flags = {}) {
      const { searchFiles } = require('./workspace-tools');
      return searchFiles(query, path || '.');
    }
  },
  {
    id: 'files.write',
    name: 'Write file',
    status: 'ready',
    description: 'Create approved files inside the workspace.',
    risk: 'medium',
    params: { path: { type: 'string', required: true }, content: { type: 'string', required: true } },
    async handler({ path, content }, flags = {}) {
      const fs = require('node:fs');
      const pathModule = require('node:path');
      const { safeResolve } = require('./workspace-tools');
      const { reviewAction, requireApproval } = require('./safety');
      const { logToolEvent } = require('./tool-log');
      // Resolve file path relative to project roots and check outside boundaries.
      const resolved = safeResolve(path);
      const overwrite = fs.existsSync(resolved);
      // Build review object for writing or overwriting.
      const review = reviewAction({ kind: 'write', overwrite });
      // Require approval unless flags.yes is supplied.
      const approved = await requireApproval(review, flags);
      if (!approved) {
        return { completed: false, message: 'Write cancelled by user.', review };
      }
      // Ensure directory exists and write content.
      fs.mkdirSync(pathModule.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, content, 'utf8');
      logToolEvent({ tool: 'files.write', path: path, completed: true, risk: review.level });
      return { completed: true, path, review };
    }
  },
  {
    id: 'files.patch',
    name: 'Patch file',
    // Once implemented, mark as ready to accept staged patches and apply
    // them after approval.
    status: 'ready',
    description: 'Apply guarded file patches only inside approved folders.',
    risk: 'medium',
    params: { path: { type: 'string', required: true }, patch: { type: 'string', required: true } },
    async handler({ path, patch }, flags = {}) {
      if (!path || !patch) {
        throw new Error('files.patch requires "path" and "patch" parameters.');
      }
      // Stage the patch for preview and compute diff.
      const preview = previewPatch(path, patch);
      // Request approval and apply the patch.  The caller can override
      // interactive prompts via flags.yes or flags.proof.
      const result = await applyFilePatch(path, flags);
      return {
        preview,
        result
      };
    }
  },
  {
    id: 'diff.view',
    name: 'View diff',
    // Mark as ready when implemented.
    status: 'ready',
    description: 'Show pending code changes before approval.',
    risk: 'low',
    params: { path: { type: 'string', required: false } },
    handler({ path }) {
      // If a specific path is given, return the diff for that path.
      // Otherwise return all staged diffs.
      return viewPendingPatch(path);
    }
  },
  {
    id: 'git.status',
    name: 'Git status',
    status: 'planned',
    description: 'Inspect repository status and changed files.',
    risk: 'low',
    params: {},
    handler: null
  },
  {
    id: 'git.diff',
    name: 'Git diff',
    status: 'planned',
    description: 'Inspect code diffs for review and planning.',
    risk: 'low',
    params: {},
    handler: null
  },
  {
    id: 'git.branch',
    name: 'Git branch',
    status: 'planned',
    description: 'Create or switch guarded working branches.',
    risk: 'medium',
    params: { name: { type: 'string', required: true } },
    handler: null
  },
  {
    id: 'shell.safe-run',
    name: 'Safe shell run',
    status: 'ready',
    description: 'Run allowlisted commands with approval and logs.',
    risk: 'medium',
    params: { command: { type: 'string', required: true } },
    async handler({ command }, flags = {}) {
      const { runReviewedCommand } = require('./workspace-tools');
      return runReviewedCommand(command, flags);
    }
  },
  {
    id: 'shell.ubuntu-sandbox',
    name: 'Ubuntu sandbox',
    status: 'ready',
    description: 'Optionally run approved shell commands inside an Ubuntu Docker sandbox.',
    risk: 'medium',
    params: { command: { type: 'string', required: true }, image: { type: 'string', required: false } },
    handler: null
  },
  {
    id: 'shell.approve',
    name: 'Approve shell',
    status: 'ready',
    description: 'Ask before risky commands, installs, deletes, or network actions.',
    risk: 'low',
    params: { command: { type: 'string', required: true } },
    handler: null
  },
  {
    id: 'npm.install',
    name: 'Install npm',
    status: 'planned',
    description: 'Install Node dependencies only after approval.',
    risk: 'high',
    params: { packages: { type: 'array', required: true } },
    handler: null
  },
  {
    id: 'tests.run',
    name: 'Run tests',
    status: 'planned',
    description: 'Run project test/check scripts and summarize failures.',
    risk: 'low',
    params: { command: { type: 'string', required: false } },
    handler: null
  },
  {
    id: 'project.scan',
    name: 'Scan project',
    status: 'ready',
    description: 'Inspect a project stack, scripts, and structure.',
    risk: 'low',
    params: { path: { type: 'string', required: false } },
    async handler({ path }, flags = {}) {
      const { scanProject } = require('./workspace-tools');
      return scanProject(path || '.');
    }
  },
  {
    id: 'project.build',
    name: 'Build project',
    status: 'ready',
    description: 'Generate approved starter project templates such as Discord bots and Node CLIs.',
    risk: 'medium',
    params: { type: { type: 'string', required: true }, target: { type: 'string', required: true }, force: { type: 'boolean', required: false } },
    handler: null
  },
  {
    id: 'project.index',
    name: 'Index project',
    status: 'ready',
    description: 'Build a local context index of skills, memory, lessons, and project snippets.',
    risk: 'low',
    params: { project: { type: 'boolean', required: false } },
    handler: null
  },
  {
    id: 'context.index',
    name: 'Index context',
    status: 'ready',
    description: 'Refresh the local context index used by the agent loop before planning.',
    risk: 'low',
    params: { project: { type: 'boolean', required: false } },
    async handler({ project }, flags = {}) {
      const { buildContextIndex } = require('./context-index');
      const opts = {};
      if (project !== undefined) opts.project = project;
      return buildContextIndex(opts);
    }
  },
  {
    id: 'context.search',
    name: 'Search context',
    status: 'ready',
    description: 'Search the local context index for relevant skills, memory, lessons, and project snippets.',
    risk: 'low',
    params: { query: { type: 'string', required: true }, limit: { type: 'number', required: false } },
    async handler({ query, limit }, flags = {}) {
      const { searchContextIndex } = require('./context-index');
      const results = searchContextIndex(query, { limit, autoBuild: true });
      return results;
    }
  },
  {
    id: 'web.fetch',
    name: 'Fetch web',
    status: 'ready',
    description: 'Fetch approved HTTP(S) URLs for docs/research with size limits and logs.',
    risk: 'low',
    params: { url: { type: 'string', required: true }, maxBytes: { type: 'number', required: false }, timeoutMs: { type: 'number', required: false } },
    handler: null
  },
  {
    id: 'browser.open',
    name: 'Open browser',
    status: 'ready',
    description: 'Open local app previews or workspace files in the browser with approval for remote targets.',
    risk: 'low',
    params: { target: { type: 'string', required: true }, allowRemote: { type: 'boolean', required: false } },
    handler: null
  },
  {
    id: 'memory.read',
    name: 'Read memory',
    status: 'ready',
    description: 'Read local user/project memory.',
    risk: 'low',
    params: {},
    handler: null
  },
  {
    id: 'memory.write',
    name: 'Write memory',
    status: 'ready',
    description: 'Add local user/project memory notes.',
    risk: 'low',
    params: { key: { type: 'string', required: true }, value: { type: 'string', required: true } },
    handler: null
  },
  {
    id: 'security.scan',
    name: 'Scan security',
    status: 'planned',
    description: 'Run security checks for secrets, risky commands, and dangerous code patterns.',
    risk: 'medium',
    params: { path: { type: 'string', required: false } },
    handler: null
  },
  {
    id: 'agents.swarm',
    name: 'Run swarm',
    status: 'ready',
    description: 'Coordinate planner, builder, and reviewer passes for guarded action plans.',
    risk: 'medium',
    params: { goal: { type: 'object', required: true } },
    handler: null
  },
  {
    id: 'self.lessons',
    name: 'Lessons',
    status: 'ready',
    description: 'Record and inspect local lessons from completed or failed goal runs.',
    risk: 'low',
    params: { limit: { type: 'number', required: false } },
    handler: null
  },
  {
    id: 'package.export',
    name: 'Export package',
    status: 'ready',
    description: 'Prepare client delivery zips, README, and .env.example.',
    risk: 'low',
    params: { target: { type: 'string', required: true } },
    handler: null
  }
];

// Generate a backwards-compatible listing of tools.  Older versions
// of Kairos expected listTools() to return only a few basic fields.
function listTools() {
  return TOOL_DEFINITIONS.map(({ id, status, description }) => ({ id, status, description }));
}

/**
 * Retrieve the full definition for a tool by id.  Returns undefined
 * if the tool is not found.
 * @param {string} id
 */
function getTool(id) {
  return TOOL_DEFINITIONS.find((tool) => tool.id === id);
}

module.exports = {
  listTools,
  getTool
};
