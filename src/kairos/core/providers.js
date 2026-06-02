const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { getEnv, maskSecret, updateEnvFile } = require('./env');
const { detectCodex } = require('./provider-health');

const PROVIDER_DEFINITIONS = {
  offline: {
    label: 'No AI brain',
    kind: 'none',
    required: [],
    description: 'No model provider configured yet.'
  },
  ollama: {
    label: 'Ollama',
    kind: 'local-model',
    required: ['KAIROS_OLLAMA_BASE_URL', 'KAIROS_OLLAMA_MODEL'],
    defaults: {
      KAIROS_OLLAMA_BASE_URL: 'http://localhost:11434',
      KAIROS_OLLAMA_MODEL: 'llama3.1'
    },
    description: 'Local models through Ollama.'
  },
  openai: {
    label: 'OpenAI',
    kind: 'api',
    required: ['OPENAI_API_KEY', 'KAIROS_OPENAI_MODEL'],
    defaults: {
      KAIROS_OPENAI_MODEL: 'gpt-4.1-mini'
    },
    secretKeys: ['OPENAI_API_KEY'],
    description: 'OpenAI API provider.'
  },
  anthropic: {
    label: 'Anthropic',
    kind: 'api',
    required: ['ANTHROPIC_API_KEY', 'KAIROS_ANTHROPIC_MODEL'],
    defaults: {
      KAIROS_ANTHROPIC_MODEL: 'claude-3-5-sonnet-latest'
    },
    secretKeys: ['ANTHROPIC_API_KEY'],
    description: 'Claude API provider.'
  },
  gemini: {
    label: 'Gemini',
    kind: 'api',
    required: ['GEMINI_API_KEY', 'KAIROS_GEMINI_MODEL'],
    defaults: {
      KAIROS_GEMINI_MODEL: 'gemini-1.5-flash'
    },
    secretKeys: ['GEMINI_API_KEY'],
    description: 'Google Gemini API provider.'
  },
  kimi: {
    label: 'Kimi',
    kind: 'api',
    required: ['KIMI_API_KEY', 'KAIROS_KIMI_MODEL'],
    defaults: {
      KAIROS_KIMI_MODEL: 'kimi-latest'
    },
    secretKeys: ['KIMI_API_KEY'],
    description: 'Kimi API provider.'
  },
  openrouter: {
    label: 'OpenRouter',
    kind: 'api',
    required: ['OPENROUTER_API_KEY', 'KAIROS_OPENROUTER_MODEL'],
    defaults: {
      KAIROS_OPENROUTER_MODEL: 'openai/gpt-4.1-mini'
    },
    secretKeys: ['OPENROUTER_API_KEY'],
    description: 'OpenAI-compatible routing across many models.'
  },
  codex: {
    label: 'Codex Bridge',
    kind: 'worker',
    required: ['KAIROS_CODEX_COMMAND', 'KAIROS_CODEX_ARGS'],
    defaults: {
      KAIROS_CODEX_COMMAND: 'codex',
      KAIROS_CODEX_ARGS: 'exec'
    },
    description: 'Future worker bridge to a local Codex command.'
  }
};

const PROVIDER_MENU = [
  ['offline', 'No AI brain yet'],
  ['ollama', 'Ollama'],
  ['openai', 'OpenAI'],
  ['anthropic', 'Anthropic'],
  ['gemini', 'Gemini'],
  ['kimi', 'Kimi'],
  ['openrouter', 'OpenRouter'],
  ['codex', 'Codex bridge']
];

function activeProviderId() {
  return getEnv('KAIROS_PROVIDER', 'offline');
}

function hasBrain(providerId = activeProviderId()) {
  return providerId !== 'offline';
}

function providerStatus(providerId = activeProviderId()) {
  const provider = PROVIDER_DEFINITIONS[providerId];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const values = {};
  const missing = [];
  const secretKeys = new Set(provider.secretKeys || []);

  for (const key of provider.required) {
    const value = getEnv(key, provider.defaults?.[key] || '');
    if (!value) missing.push(key);
    values[key] = secretKeys.has(key) ? maskSecret(value) : value;
  }

  return {
    id: providerId,
    label: provider.label,
    kind: provider.kind,
    active: providerId === activeProviderId(),
    configured: missing.length === 0,
    missing,
    values,
    description: provider.description
  };
}

function listProviders() {
  return Object.entries(PROVIDER_DEFINITIONS).map(([id, provider]) => ({
    id,
    ...provider,
    status: providerStatus(id)
  }));
}

async function promptForMissing(updates, provider, flags) {
  const rl = readline.createInterface({ input, output });
  try {
    for (const key of provider.required) {
      if (updates[key]) continue;
      const fallback = provider.defaults?.[key] || '';
      const answer = await rl.question(`${key}${fallback ? ` (${fallback})` : ''}: `);
      updates[key] = answer.trim() || fallback;
    }
  } finally {
    rl.close();
  }

  if (flags.model && provider.required.some((key) => key.endsWith('_MODEL'))) {
    const modelKey = provider.required.find((key) => key.endsWith('_MODEL'));
    updates[modelKey] = flags.model;
  }
}

async function chooseProvider(defaultProvider = 'offline') {
  const codexDetected = detectCodex().found;
  const suggestedDefault = defaultProvider === 'offline' && codexDetected ? 'codex' : defaultProvider;
  const rl = readline.createInterface({ input, output });
  try {
    console.log('Model/Auth provider');
    if (codexDetected) {
      console.log('Codex detected on this PC, so Codex bridge is selected by default.');
    }
    console.log('');
    for (let index = 0; index < PROVIDER_MENU.length; index += 1) {
      const [id, label] = PROVIDER_MENU[index];
      const marker = id === suggestedDefault ? '*' : ' ';
      const detected = id === 'codex' && codexDetected ? ' (detected)' : '';
      console.log(`${marker} ${index + 1}. ${label}${detected}`);
    }
    console.log('');

    const answer = await rl.question(`Choose provider [1-${PROVIDER_MENU.length}] (default: ${suggestedDefault}): `);
    const choice = Number.parseInt(answer.trim(), 10);
    if (!answer.trim()) return suggestedDefault;
    if (!Number.isInteger(choice) || choice < 1 || choice > PROVIDER_MENU.length) {
      throw new Error(`Invalid provider choice: ${answer}`);
    }

    return PROVIDER_MENU[choice - 1][0];
  } finally {
    rl.close();
  }
}

async function setupProvider(providerId, flags = {}) {
  const selectedProviderId = providerId || await chooseProvider(activeProviderId());
  const provider = PROVIDER_DEFINITIONS[selectedProviderId];
  if (!provider) {
    throw new Error(`Unknown provider: ${selectedProviderId}`);
  }

  const updates = {
    KAIROS_PROVIDER: selectedProviderId,
    ...(provider.defaults || {})
  };

  if (selectedProviderId === 'ollama') {
    if (flags['base-url']) updates.KAIROS_OLLAMA_BASE_URL = flags['base-url'];
    if (flags.model) updates.KAIROS_OLLAMA_MODEL = flags.model;
  }

  const apiKeyMap = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY',
    kimi: 'KIMI_API_KEY',
    openrouter: 'OPENROUTER_API_KEY'
  };
  if (flags['api-key'] && apiKeyMap[selectedProviderId]) {
    updates[apiKeyMap[selectedProviderId]] = flags['api-key'];
  }

  if (!flags.yes && provider.required.length > 0) {
    await promptForMissing(updates, provider, flags);
  }

  const envPath = updateEnvFile(updates);
  return {
    envPath,
    status: providerStatus(selectedProviderId)
  };
}

module.exports = {
  PROVIDER_DEFINITIONS,
  activeProviderId,
  chooseProvider,
  hasBrain,
  listProviders,
  providerStatus,
  setupProvider
};
