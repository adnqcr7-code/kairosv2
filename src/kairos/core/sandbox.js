const { spawnSync } = require('node:child_process');
const { getEnv } = require('./env');
const { kairosDataDir, ROOT_DIR } = require('./storage');

const DISABLED_MODES = new Set(['', 'off', 'none', 'host', 'false']);
const ALLOWED_UBUNTU_IMAGES = new Set([
  'ubuntu:20.04',
  'ubuntu:22.04',
  'ubuntu:24.04',
  'ubuntu:jammy',
  'ubuntu:noble'
]);

function normalizeCommandSandboxMode(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (DISABLED_MODES.has(normalized)) return 'host';
  if (['ubuntu', 'docker', 'ubuntu-docker'].includes(normalized)) return 'ubuntu-docker';
  if (['wsl', 'ubuntu-wsl'].includes(normalized)) return 'ubuntu-wsl';
  throw new Error(`Unknown command sandbox mode: ${value}. Use host, ubuntu-docker, or ubuntu-wsl.`);
}

function commandSandboxMode(flags = {}) {
  const flagValue = flags.sandbox === true ? 'ubuntu-docker' : flags.sandbox;
  return normalizeCommandSandboxMode(flagValue || getEnv('KAIROS_COMMAND_SANDBOX', 'host'));
}

function sandboxImage() {
  return validateUbuntuImage(getEnv('KAIROS_UBUNTU_IMAGE', 'ubuntu:24.04'));
}

function sandboxDistro() {
  const value = getEnv('KAIROS_WSL_DISTRO', 'KairosUbuntu').trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error(`Invalid WSL distro name: ${value}`);
  }
  return value;
}

function validateUbuntuImage(image) {
  const normalized = String(image || '').trim().toLowerCase();
  if (ALLOWED_UBUNTU_IMAGES.has(normalized)) return normalized;
  throw new Error(`Unsupported Ubuntu sandbox image: ${image}. Allowed: ${[...ALLOWED_UBUNTU_IMAGES].join(', ')}`);
}

function sandboxNetwork() {
  const value = getEnv('KAIROS_SANDBOX_NETWORK', 'none').trim().toLowerCase();
  return value === 'host' ? 'host' : 'none';
}

function sandboxWorkspaceMode() {
  const value = getEnv('KAIROS_SANDBOX_WORKSPACE_MODE', 'rw').trim().toLowerCase();
  return value === 'ro' ? 'ro' : 'rw';
}

function sandboxPullPolicy() {
  const value = getEnv('KAIROS_SANDBOX_PULL', 'never').trim().toLowerCase();
  return ['never', 'missing', 'always'].includes(value) ? value : 'never';
}

function sandboxUser() {
  const value = getEnv('KAIROS_SANDBOX_USER', '1000:1000').trim();
  return /^[0-9]+:[0-9]+$/.test(value) ? value : '1000:1000';
}

function mountSpec(sourcePath, targetPath, mode = 'rw') {
  return `${sourcePath}:${targetPath}${mode === 'ro' ? ':ro' : ''}`;
}

function buildUbuntuDockerArgs(command, options = {}) {
  const workspaceMode = options.workspaceMode || sandboxWorkspaceMode();
  const image = validateUbuntuImage(options.image || sandboxImage());
  const network = options.network || sandboxNetwork();
  const pullPolicy = options.pullPolicy || sandboxPullPolicy();
  const user = options.user || sandboxUser();
  const args = [
    'run',
    '--rm',
    '--pull',
    pullPolicy,
    '--network',
    network,
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--pids-limit',
    '128',
    '--memory',
    '512m',
    '--cpus',
    '1',
    '--read-only',
    '--tmpfs',
    '/tmp:rw,nosuid,nodev,size=64m',
    '--tmpfs',
    '/var/tmp:rw,nosuid,nodev,size=64m',
    '--user',
    user,
    '-v',
    mountSpec(ROOT_DIR, '/workspace', workspaceMode),
    '-v',
    mountSpec(kairosDataDir(), '/kairos-data', 'rw'),
    '-w',
    '/workspace',
    image,
    'bash',
    '-lc',
    command
  ];

  return {
    command: 'docker',
    args,
    cwd: ROOT_DIR,
    sandbox: {
      mode: 'ubuntu-docker',
      image,
      network,
      workspace: '/workspace',
      workspaceMode,
      dataDir: '/kairos-data',
      pullPolicy,
      user,
      hardened: true
    }
  };
}

function cleanProcessText(text = '') {
  return String(text).replace(/\u0000/g, '').trim();
}

function buildUbuntuWslArgs(command, options = {}) {
  const distro = options.distro || sandboxDistro();
  return {
    command: 'wsl.exe',
    args: [
      '-d',
      distro,
      '--cd',
      ROOT_DIR,
      '--',
      'bash',
      '-lc',
      command
    ],
    cwd: ROOT_DIR,
    sandbox: {
      mode: 'ubuntu-wsl',
      distro,
      workspace: ROOT_DIR,
      network: 'host-shared',
      hardened: false
    }
  };
}

function buildSandboxCommand(command, flags = {}) {
  const mode = commandSandboxMode(flags);
  if (mode === 'host') {
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-Command', command],
      cwd: ROOT_DIR,
      sandbox: { mode: 'host' }
    };
  }

  if (mode === 'ubuntu-wsl') return buildUbuntuWslArgs(command);

  return buildUbuntuDockerArgs(command);
}

function runCommandInConfiguredSandbox(command, flags = {}, options = {}) {
  const launch = buildSandboxCommand(command, flags);
  const result = spawnSync(launch.command, launch.args, {
    encoding: 'utf8',
    cwd: launch.cwd,
    timeout: options.timeout || 120000
  });

  return {
    completed: result.status === 0,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr || result.error?.message || '',
    sandbox: launch.sandbox
  };
}

function dockerStatus() {
  const result = spawnSync('docker', ['--version'], {
    encoding: 'utf8',
    timeout: 10000
  });

  return {
    found: result.status === 0,
    version: result.status === 0 ? result.stdout.trim() : '',
    error: result.status === 0 ? '' : (result.stderr || result.error?.message || 'docker was not found on PATH').trim()
  };
}

function wslStatus() {
  const result = spawnSync('wsl.exe', ['--list', '--all', '--verbose'], {
    encoding: 'utf8',
    timeout: 10000
  });
  const distro = sandboxDistro();
  const output = cleanProcessText(`${result.stdout || ''}\n${result.stderr || ''}`);
  return {
    found: result.status === 0 && output.toLowerCase().includes(distro.toLowerCase()),
    distro,
    output,
    error: result.status === 0 ? '' : cleanProcessText(result.stderr || result.error?.message || 'wsl.exe could not list distros')
  };
}

function sandboxStatus(flags = {}) {
  const mode = commandSandboxMode(flags);
  return {
    mode,
    enabled: mode !== 'host',
    image: sandboxImage(),
    network: sandboxNetwork(),
    workspaceMode: sandboxWorkspaceMode(),
    pullPolicy: sandboxPullPolicy(),
    user: sandboxUser(),
    hardened: mode === 'ubuntu-docker',
    wslDistro: sandboxDistro(),
    workspace: ROOT_DIR,
    dataDir: kairosDataDir(),
    docker: dockerStatus(),
    wsl: wslStatus()
  };
}

module.exports = {
  buildSandboxCommand,
  buildUbuntuDockerArgs,
  buildUbuntuWslArgs,
  commandSandboxMode,
  normalizeCommandSandboxMode,
  runCommandInConfiguredSandbox,
  sandboxStatus,
  validateUbuntuImage
};
