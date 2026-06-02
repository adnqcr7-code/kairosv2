const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { askBrain, getSessionCost, resetSessionCost } = require('./brain');
const { checkProvider } = require('./provider-health');
const { providerStatus, setupProvider } = require('./providers');
const {
  loadConversationHistory,
  addToConversationHistory,
  clearConversationHistory,
  loadMemory,
  saveConversationHistory
} = require('./memory');

const MAX_HISTORY_MESSAGES = 40;

function chatHelpText() {
  return [
    'Chat commands',
    '/help       Show this help',
    '/setup      Choose or fix the AI brain provider',
    '/brain      Show provider and health status',
    '/history    Show recent conversation turns',
    '/clear      Reset conversation history',
    '/cost       Show estimated session cost',
    '/exit       Leave chat',
    '',
    'You can ask normal questions, paste code, brainstorm, or ask Kairos to explain errors.'
  ].join('\n');
}

function printChatSetupCommands() {
  console.log('Set up a brain with one of these:');
  console.log('  npm.cmd run kairos -- chat setup');
  console.log('  npm.cmd run kairos -- brain setup --provider ollama --yes');
  console.log('  npm.cmd run kairos -- brain setup --provider openai');
}

function printHealthProblem(provider, health) {
  console.log('');
  console.log(`Brain needs attention: ${provider.label}`);
  console.log(health.message || 'Provider health check failed.');
  if (health.detail) console.log(`Detail: ${health.detail}`);
  if (Array.isArray(health.fix) && health.fix.length > 0) {
    console.log('');
    console.log('Try:');
    for (const item of health.fix) console.log(`  ${item}`);
  }
  console.log('');
}

function printAssistant(reply) {
  console.log('');
  console.log('Kairos:');
  console.log(reply.trim() || '(empty response)');
  console.log('');
}

function printHistory(history) {
  const recent = history.slice(-10);
  if (recent.length === 0) {
    console.log('No conversation history yet.');
    return;
  }

  for (const item of recent) {
    const label = item.role === 'assistant' ? 'Kairos' : 'You';
    const preview = String(item.content || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    console.log(`${label}: ${preview}`);
  }
}

async function askLine(prompt) {
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(prompt)).trim();
  } finally {
    rl.close();
  }
}

async function runChatSetup(flags = {}) {
  console.log('');
  console.log('Kairos Chat Setup');
  console.log('Choose the model provider that will power normal AI chat.');
  console.log('');
  const result = await setupProvider(flags.provider, flags);
  const health = await checkProvider(result.status.id);
  console.log('');
  console.log(`Brain: ${result.status.label}`);
  console.log(`Configured: ${result.status.configured ? 'yes' : 'no'}`);
  console.log(`Health: ${health.ok ? 'ready' : 'not ready'} - ${health.message}`);
  if (!health.ok && health.detail) console.log(`Detail: ${health.detail}`);
  return { provider: result.status, health };
}

async function ensureChatReady(flags = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let provider = providerStatus();

    if (flags.setup || provider.id === 'offline' || !provider.configured) {
      console.log('');
      console.log(provider.id === 'offline'
        ? 'Kairos chat needs an AI brain before it can answer like a normal assistant.'
        : `The selected brain is missing setup: ${provider.missing.join(', ')}`);

      if (flags.yes || flags.setup) {
        await runChatSetup({ ...flags, setup: false });
        flags.setup = false;
        provider = providerStatus();
      } else {
        const answer = await askLine('Run chat setup now? (yes/no): ');
        if (!['y', 'yes'].includes(answer.toLowerCase())) {
          printChatSetupCommands();
          return null;
        }
        await runChatSetup({ ...flags, setup: false });
        provider = providerStatus();
      }
    }

    if (provider.id === 'offline' || !provider.configured) {
      printChatSetupCommands();
      return null;
    }

    if (flags['no-check']) {
      return { provider, health: { ok: true, message: 'Health check skipped.' } };
    }

    const health = await checkProvider(provider.id);
    if (health.ok) return { provider, health };

    printHealthProblem(provider, health);
    if (flags.yes) return null;

    const action = (await askLine('Choose: retry, setup, continue, exit (setup): ')).toLowerCase() || 'setup';
    if (action === 'retry') continue;
    if (action === 'continue' || action === 'c') return { provider, health };
    if (action === 'setup' || action === 's') {
      await runChatSetup({ ...flags, setup: false });
      continue;
    }
    return null;
  }

  return null;
}

function buildChatIntro(provider, health) {
  const memory = loadMemory();
  const name = memory.user?.name ? `, ${memory.user.name}` : '';
  return [
    '',
    `Kairos Chat${name}`,
    `Brain: ${provider.label}`,
    `Status: ${health.ok ? 'ready' : 'continuing despite health warning'}`,
    'Type /help for commands or /exit to leave.',
    ''
  ].join('\n');
}

function rememberExchange(history, message, reply) {
  addToConversationHistory('user', message);
  addToConversationHistory('assistant', reply);
  history.push({ role: 'user', content: message });
  history.push({ role: 'assistant', content: reply });

  if (history.length > MAX_HISTORY_MESSAGES) {
    const trimmed = history.slice(-MAX_HISTORY_MESSAGES);
    history.length = 0;
    history.push(...trimmed);
    saveConversationHistory(trimmed);
  }
}

async function runChat(flags = {}) {
  const ready = await ensureChatReady(flags);
  if (!ready) return;

  let { provider, health } = ready;
  resetSessionCost();
  console.log('');
  console.log(buildChatIntro(provider, health));

  const rl = readline.createInterface({ input, output });
  let closed = false;
  const closeChat = () => {
    if (!closed) {
      closed = true;
      rl.close();
    }
  };
  const history = loadConversationHistory().slice(-MAX_HISTORY_MESSAGES);

  try {
    while (true) {
      const message = (await rl.question('You: ')).trim();
      if (!message) continue;
      if (['/exit', 'exit', 'quit'].includes(message.toLowerCase())) {
        console.log('Kairos: Chat closed.');
        return;
      }

      if (message.toLowerCase() === '/help') {
        console.log(chatHelpText());
        continue;
      }

      if (message.toLowerCase() === '/brain') {
        provider = providerStatus();
        health = flags['no-check'] ? { ok: true, message: 'Health check skipped.' } : await checkProvider(provider.id);
        console.log(JSON.stringify({ provider, health }, null, 2));
        continue;
      }

      if (message.toLowerCase() === '/setup') {
        closeChat();
        await runChatSetup({ ...flags, setup: false });
        await runChat({ ...flags, setup: false });
        return;
      }

      if (message.toLowerCase() === '/clear') {
        clearConversationHistory();
        history.length = 0;
        console.log('Kairos: Conversation history cleared.');
        continue;
      }

      if (message.toLowerCase() === '/history') {
        printHistory(history);
        continue;
      }

      if (message.toLowerCase() === '/cost') {
        console.log(`Kairos: Estimated session cost: $${getSessionCost().toFixed(6)}`);
        continue;
      }

      console.log('Kairos is thinking...');
      // Track whether any streamed tokens were emitted.
      let streamed = false;
      const reply = await askBrain(message, history, (token) => {
        // When streaming, print tokens immediately without Kairos prefix.
        if (!streamed) {
          streamed = true;
          // Start a new line for assistant reply.
          process.stdout.write('\nKairos (streaming):\n');
        }
        process.stdout.write(token);
      });
      // Record the exchange and print the final reply.  If streaming
      // occurred, the tokens have already been printed to the console,
      // so avoid duplicating the output.
      rememberExchange(history, message, reply);
      if (!streamed) {
        printAssistant(reply);
      } else {
        // Ensure final newline after streaming.
        console.log('\n');
      }
    }
  } finally {
    closeChat();
  }
}

module.exports = {
  chatHelpText,
  runChat
};
