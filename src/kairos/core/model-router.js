const { activeProviderId } = require('./providers');

const PROVIDERS = [
  {
    id: 'offline-rules',
    provider: 'local',
    cost: 0,
    speed: 9,
    coding: 2,
    reasoning: 3,
    privacy: 10,
    offline: true,
    notes: 'Rule-based planner. Safe default, no API calls.'
  },
  {
    id: 'ollama-local',
    provider: 'ollama',
    cost: 0,
    speed: 5,
    coding: 6,
    reasoning: 5,
    privacy: 9,
    offline: true,
    notes: 'Future local model adapter.'
  },
  {
    id: 'openai',
    provider: 'openai',
    cost: 5,
    speed: 7,
    coding: 8,
    reasoning: 8,
    privacy: 4,
    offline: false,
    notes: 'Configured OpenAI API provider.'
  },
  {
    id: 'anthropic',
    provider: 'anthropic',
    cost: 6,
    speed: 6,
    coding: 8,
    reasoning: 9,
    privacy: 4,
    offline: false,
    notes: 'Configured Anthropic Claude provider.'
  },
  {
    id: 'gemini',
    provider: 'gemini',
    cost: 4,
    speed: 8,
    coding: 7,
    reasoning: 7,
    privacy: 4,
    offline: false,
    notes: 'Configured Gemini provider.'
  },
  {
    id: 'kimi',
    provider: 'kimi',
    cost: 4,
    speed: 7,
    coding: 7,
    reasoning: 8,
    privacy: 4,
    offline: false,
    notes: 'Configured Kimi provider.'
  },
  {
    id: 'openrouter',
    provider: 'openrouter',
    cost: 5,
    speed: 7,
    coding: 8,
    reasoning: 8,
    privacy: 4,
    offline: false,
    notes: 'Configured OpenRouter provider.'
  },
  {
    id: 'codex',
    provider: 'codex',
    cost: 0,
    speed: 6,
    coding: 9,
    reasoning: 8,
    privacy: 8,
    offline: true,
    notes: 'Future Codex worker bridge.'
  },
  {
    id: 'cloud-code-model',
    provider: 'api',
    cost: 5,
    speed: 7,
    coding: 8,
    reasoning: 7,
    privacy: 4,
    offline: false,
    notes: 'Future OpenAI/Claude/Kimi/OpenRouter adapter.'
  },
  {
    id: 'cloud-reasoning-model',
    provider: 'api',
    cost: 8,
    speed: 5,
    coding: 7,
    reasoning: 10,
    privacy: 4,
    offline: false,
    notes: 'Future strongest model for architecture and review.'
  }
];

const STRATEGIES = {
  cheap: {
    planner: 'offline-rules',
    builder: 'offline-rules',
    reviewer: 'offline-rules',
    tester: 'offline-rules',
    packager: 'offline-rules'
  },
  balanced: {
    planner: 'offline-rules',
    builder: 'ollama-local',
    reviewer: 'offline-rules',
    tester: 'offline-rules',
    packager: 'offline-rules'
  },
  best: {
    planner: 'cloud-reasoning-model',
    builder: 'cloud-code-model',
    reviewer: 'cloud-reasoning-model',
    tester: 'offline-rules',
    packager: 'offline-rules'
  }
};

const BUDGET_MODES = Object.freeze(Object.keys(STRATEGIES));

function providerIdForActiveConfig() {
  const active = activeProviderId();
  if (active === 'offline') return 'offline-rules';
  if (active === 'ollama') return 'ollama-local';
  return active;
}

function routeModels(budgetMode) {
  if (!BUDGET_MODES.includes(budgetMode)) {
    throw new Error(`Invalid budget mode: ${budgetMode}. Use one of: ${BUDGET_MODES.join(', ')}`);
  }

  const providersById = Object.fromEntries(PROVIDERS.map((provider) => [provider.id, provider]));
  const activeProvider = providersById[providerIdForActiveConfig()] || providersById['offline-rules'];
  const offlineProvider = providersById['offline-rules'];

  if (activeProvider.id !== 'offline-rules') {
    return {
      cheap: {
        planner: offlineProvider,
        builder: activeProvider,
        reviewer: offlineProvider,
        tester: offlineProvider,
        packager: offlineProvider
      },
      balanced: {
        planner: activeProvider,
        builder: activeProvider,
        reviewer: activeProvider,
        tester: offlineProvider,
        packager: offlineProvider
      },
      best: {
        planner: activeProvider,
        builder: activeProvider,
        reviewer: activeProvider,
        tester: offlineProvider,
        packager: offlineProvider
      }
    }[budgetMode];
  }

  const strategy = STRATEGIES[budgetMode];
  return Object.fromEntries(
    Object.entries(strategy).map(([role, providerId]) => [
      role,
      providersById[providerId]
    ])
  );
}

module.exports = {
  BUDGET_MODES,
  PROVIDERS,
  providerIdForActiveConfig,
  routeModels
};
