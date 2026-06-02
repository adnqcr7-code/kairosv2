const readline = require('node:readline/promises');
const os = require('node:os');
const path = require('node:path');
const { stdin: input, stdout: output } = require('node:process');
const { updateEnvFile } = require('./env');
const { ensureMemory, memoryPath } = require('./memory');
const { DEFAULT_KAIROS_DATA_DIR } = require('./paths');
const { checkProvider, detectCodex } = require('./provider-health');
const { chooseProvider, providerStatus, setupProvider } = require('./providers');

const BANNER = [
  ' _  __     _               ',
  '| |/ /__ _(_)_ __ ___  ___ ',
  "| ' // _` | | '__/ _ \\/ __|",
  '| . \\ (_| | | | | (_) \\__ \\',
  '|_|\\_\\__,_|_|_|  \\___/|___/'
].join('\n');

function setupWarning() {
  return [
    'Kairos Security Warning',
    '',
    'Kairos is a local coding-agent harness. It can become powerful when tools are enabled.',
    'This MVP can start without an AI brain: no model API calls, no file edits, no shell execution.',
    '',
    'Before enabling stronger tools later, remember:',
    '- Review plans before approving goals.',
    '- Never paste API keys or Discord tokens into chat output.',
    '- Keep secrets in .env only.',
    '- Do not approve commands you do not understand.',
    '- Treat remote control from Discord/phone as high risk until permissions are built.',
    '',
    'Current setup will configure:',
    '- Brain provider: choose none, Ollama, OpenAI, Kimi, OpenRouter, or another provider',
    '- Data folder: you choose where Kairos stores goals and memory',
    '- Model calls: disabled',
    '- File editing: disabled',
    '- Shell commands: disabled',
    '- Skills registry: enabled',
    ''
  ].join('\n');
}

function printSetupIntro() {
  console.log('Starting Kairos setup...');
  console.log('');
  console.log('Kairos 0.1.0 - local-first coding agent');
  console.log(BANNER);
  const codex = detectCodex();
  console.log(codex.found ? 'Codex: detected on this PC' : 'Codex: not detected on PATH');
  console.log('');
  console.log(setupWarning());
}

function resolveDataDir(inputPath) {
  const trimmed = inputPath.trim();
  if (!trimmed) return DEFAULT_KAIROS_DATA_DIR;
  if (trimmed.toLowerCase() === 'downloads') {
    return path.join(os.homedir(), 'Downloads', 'kairos');
  }
  if (path.isAbsolute(trimmed)) return trimmed;
  return path.resolve(process.cwd(), trimmed);
}

async function runSetup(flags = {}) {
  printSetupIntro();

  const yes = flags.yes === true;
  let dataDir = resolveDataDir(flags['data-dir'] || DEFAULT_KAIROS_DATA_DIR);
  let rl;
  if (!yes) {
    rl = readline.createInterface({ input, output });
    try {
      const answer = await rl.question('I understand this is powerful and should be used carefully. Continue? (yes/no): ');
      if (!['y', 'yes'].includes(answer.trim().toLowerCase())) {
        return {
          completed: false,
          message: 'Setup cancelled. Nothing changed.'
        };
      }

      const dataAnswer = await rl.question(`Where should Kairos store local data and memory? (${DEFAULT_KAIROS_DATA_DIR}): `);
      dataDir = resolveDataDir(dataAnswer || DEFAULT_KAIROS_DATA_DIR);
    } finally {
      rl.close();
    }
  }

  updateEnvFile({
    KAIROS_DATA_DIR: dataDir
  });

  if (flags.provider) {
    const providerResult = await setupProvider(flags.provider, flags);
    updateEnvFile({ KAIROS_FIRST_RUN_COMPLETE: 'true' });
    ensureMemory();
    const health = await checkProvider(providerResult.status.id);
    return {
      completed: true,
      envPath: providerResult.envPath,
      provider: providerResult.status,
      health,
      dataDir,
      memoryPath: memoryPath(),
      nextCommands: [
        'npm.cmd run kairos -- tools list',
        'npm.cmd run kairos -- skills search "security auditor"',
        'npm.cmd run kairos -- /goal "Review this project safely" --budget cheap --approval step'
      ]
    };
  }

  const providerId = flags.yes ? 'offline' : await chooseProvider('offline');
  const providerResult = providerId === 'offline'
    ? {
        envPath: updateEnvFile({
          KAIROS_DATA_DIR: dataDir,
          KAIROS_PROVIDER: 'offline',
          KAIROS_FIRST_RUN_COMPLETE: 'true'
        }),
        status: providerStatus('offline')
      }
    : await setupProvider(providerId, flags);

  updateEnvFile({ KAIROS_FIRST_RUN_COMPLETE: 'true' });
  ensureMemory();
  const health = await checkProvider(providerResult.status.id);

  return {
    completed: true,
    envPath: providerResult.envPath,
    provider: providerResult.status,
    health,
    dataDir,
    memoryPath: memoryPath(),
    nextCommands: [
      'npm.cmd run kairos -- tools list',
      'npm.cmd run kairos -- skills search "security auditor"',
      'npm.cmd run kairos -- /goal "Review this project safely" --budget cheap --approval step'
    ]
  };
}

module.exports = {
  BANNER,
  runSetup
};
