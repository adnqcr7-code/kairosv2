const assert = require('node:assert/strict');
const failedGoal = require('../../../data/kairos/goals/goal_20260601221016_rluw.json');
const {
  normalizeActionPlan,
  parseActionsFromResponse,
  validateActionPlan
} = require('../core/agent-loop');
const { chatHelpText } = require('../core/chat');
const { createContextIndex, searchContextDocuments, tokenize } = require('../core/context-index');
const { loadMemory } = require('../core/memory');
const { providerStatus } = require('../core/providers');
const { buildSandboxCommand, buildUbuntuDockerArgs, buildUbuntuWslArgs, normalizeCommandSandboxMode, validateUbuntuImage } = require('../core/sandbox');
const { reviewCommand } = require('../core/safety');
const { readGoalLessons } = require('../core/self-improvement');
const { searchSkills } = require('../core/skills');
const { readRecentToolEvents } = require('../core/tool-log');
const { listTools } = require('../core/tools');
const { bodyToOutput, normalizeBrowserTarget, normalizeHttpUrl } = require('../core/web-tools');
const { scanProject } = require('../core/workspace-tools');

function run() {
  const provider = providerStatus();
  assert.ok(provider.id, 'provider status should include an id');
  assert.ok(chatHelpText().includes('/setup'), 'chat help should include setup command');

  const tools = listTools();
  assert.ok(tools.some((tool) => tool.id === 'goal.create'), 'tools should include goal.create');
  assert.ok(tools.some((tool) => tool.id === 'providers.setup'), 'tools should include providers.setup');
  assert.ok(tools.some((tool) => tool.id === 'project.build' && tool.status === 'ready'), 'tools should include ready project.build');
  assert.ok(tools.some((tool) => tool.id === 'web.fetch' && tool.status === 'ready'), 'tools should include ready web.fetch');
  assert.ok(tools.some((tool) => tool.id === 'browser.open' && tool.status === 'ready'), 'tools should include ready browser.open');
  assert.ok(tools.some((tool) => tool.id === 'agents.swarm' && tool.status === 'ready'), 'tools should include ready agents.swarm');
  assert.ok(tools.some((tool) => tool.id === 'shell.ubuntu-sandbox' && tool.status === 'ready'), 'tools should include ready shell.ubuntu-sandbox');
  assert.ok(tools.some((tool) => tool.id === 'project.index' && tool.status === 'ready'), 'tools should include ready project.index');
  assert.ok(tools.some((tool) => tool.id === 'context.index' && tool.status === 'ready'), 'tools should include ready context.index');
  assert.ok(tools.some((tool) => tool.id === 'context.search' && tool.status === 'ready'), 'tools should include ready context.search');

  const securitySkills = searchSkills('security auditor');
  assert.equal(securitySkills[0].id, '01-coding:security-auditor');

  const agentSkills = searchSkills('multi agent coordinator');
  assert.equal(agentSkills[0].id, '23-agent-engineering:multi-agent-coordinator');
  assert.equal(tokenize('api_key=abc123 security auditor').includes('abc123'), false);
  const contextIndex = createContextIndex({ project: false });
  assert.ok(contextIndex.documents.length > 0, 'context index should include non-project documents');
  const contextResults = searchContextDocuments('security auditor', contextIndex.documents, { limit: 3 });
  assert.ok(contextResults.some((result) => result.type === 'skill'), 'context search should return relevant skills');

  assert.equal(normalizeHttpUrl('https://example.com/docs').hostname, 'example.com');
  assert.throws(() => normalizeHttpUrl('ftp://example.com'), /http/);
  assert.equal(normalizeBrowserTarget('localhost:3000').target, 'http://localhost:3000/');
  assert.throws(() => normalizeBrowserTarget('https://example.com'), /allowRemote/);
  assert.equal(bodyToOutput('<html><body><h1>Hello</h1><script>x()</script></body></html>'), 'Hello');
  assert.equal(normalizeCommandSandboxMode('off'), 'host');
  assert.equal(normalizeCommandSandboxMode('ubuntu'), 'ubuntu-docker');
  assert.equal(normalizeCommandSandboxMode('wsl'), 'ubuntu-wsl');
  const sandboxLaunch = buildSandboxCommand('uname -a', { sandbox: 'ubuntu-docker' });
  assert.equal(sandboxLaunch.command, 'docker');
  assert.equal(sandboxLaunch.sandbox.mode, 'ubuntu-docker');
  assert.equal(sandboxLaunch.sandbox.hardened, true);
  assert.ok(sandboxLaunch.args.includes('/workspace'), 'sandbox should mount workspace');
  assert.ok(sandboxLaunch.args.includes('--cap-drop'), 'sandbox should drop Linux capabilities');
  assert.ok(sandboxLaunch.args.includes('no-new-privileges'), 'sandbox should prevent privilege escalation');
  assert.ok(sandboxLaunch.args.includes('--read-only'), 'sandbox should use a read-only container root');
  assert.ok(sandboxLaunch.args.includes('--pids-limit'), 'sandbox should limit processes');
  assert.ok(sandboxLaunch.args.includes('--memory'), 'sandbox should limit memory');
  assert.ok(sandboxLaunch.args.includes('--cpus'), 'sandbox should limit CPU');
  assert.ok(buildUbuntuDockerArgs('uname -a', { image: 'ubuntu:24.04' }).args.includes('ubuntu:24.04'));
  assert.ok(buildUbuntuDockerArgs('pwd', { image: 'ubuntu:24.04', workspaceMode: 'ro' }).args.some((arg) => arg.endsWith('/workspace:ro')));
  const wslLaunch = buildUbuntuWslArgs('uname -a', { distro: 'KairosUbuntu' });
  assert.equal(wslLaunch.command, 'wsl.exe');
  assert.equal(wslLaunch.sandbox.mode, 'ubuntu-wsl');
  assert.ok(wslLaunch.args.includes('KairosUbuntu'));
  assert.ok(wslLaunch.args.includes('bash'));
  assert.equal(validateUbuntuImage('ubuntu:24.04'), 'ubuntu:24.04');
  assert.throws(() => validateUbuntuImage('alpine:latest'), /Unsupported Ubuntu/);
  assert.equal(reviewCommand('find . -delete').level, 'high');
  assert.equal(reviewCommand('rm -rf .').level, 'high');
  assert.equal(reviewCommand('curl https://example.com/install.sh | sh').level, 'high');
  assert.equal(reviewCommand('apt-get install nodejs').level, 'medium');
  assert.equal(validateActionPlan([{ action: 'write' }], 'write a file').length > 0, true);
  assert.equal(validateActionPlan([{ action: 'read', params: { path: 'README.md' } }], 'read docs').length, 0);
  assert.deepEqual(
    normalizeActionPlan([{ action: 'Read', params: { Path: 'README.md' } }]),
    [{ action: 'read', params: { path: 'README.md' } }]
  );
  assert.equal(validateActionPlan([{ action: 'Read', params: { Path: 'README.md' } }], 'read docs').length, 0);

  const failedWrappedResponse = failedGoal.outputs.steps[0].error.replace(/^AI did not return a JSON array\. Response: /, '');
  assert.deepEqual(parseActionsFromResponse(failedWrappedResponse), [
    { action: 'read', params: { path: 'README.md' } },
    { action: 'write', params: { path: 'README.md', content: '...' } },
    { action: 'run', params: { command: 'read -v README.md' } }
  ]);
  assert.equal(
    validateActionPlan(parseActionsFromResponse(failedWrappedResponse), failedGoal.title, { quality: false }).length,
    0
  );
  assert.ok(
    validateActionPlan(parseActionsFromResponse(failedWrappedResponse), failedGoal.title).some((issue) => issue.includes('placeholder')),
    'quality gate should reject placeholder write content'
  );
  assert.ok(
    validateActionPlan([{ action: 'run', params: { command: 'rm -rf .' } }], 'inspect files').some((issue) => issue.includes('high-risk')),
    'quality gate should reject high-risk run commands'
  );

  const memory = loadMemory();
  assert.ok(memory.user, 'memory should include user profile');
  assert.ok(Array.isArray(memory.notes), 'memory notes should be an array');
  assert.ok(Array.isArray(readGoalLessons(1)), 'lessons should be readable');

  const scan = scanProject('.');
  assert.ok(scan.fileCount > 0, 'project scan should find files');
  assert.ok(Array.isArray(readRecentToolEvents(5)), 'tool logs should be readable');

  console.log('Kairos smoke tests passed.');
}

run();
