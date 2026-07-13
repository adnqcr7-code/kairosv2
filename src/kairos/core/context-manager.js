// Conversation context management for Kairos
//
// Manages the sliding window of conversation history, applies token budgets,
// and generates summaries of older context when the window overflows.

const { askBrain } = require('./brain');
const { estimateTokens } = require('./cost');

const DEFAULT_TOKEN_BUDGET = 4000;

function estimateMessageTokens(messages = []) {
  return messages.reduce((sum, msg) => {
    return sum + estimateTokens(msg.content || '') + 4;
  }, 0);
}

async function summarizeOldContext(oldMessages) {
  if (!oldMessages || oldMessages.length === 0) return '';
  
  const turnsText = oldMessages
    .slice(-10)
    .map(msg => msg.role + ': ' + String(msg.content || '').slice(0, 300))
    .join('\n');

  try {
    const summary = await askBrain(
      'Summarize the following conversation context in 2-3 concise sentences, preserving key facts, decisions, and any code/project references. Do not add new information.\n\n' + turnsText,
      [],
      null
    );
    return summary || '';
  } catch {
    return turnsText.split('\n').slice(0, 3).join(' | ').slice(0, 500);
  }
}

async function applySlidingWindow(history = [], options = {}) {
  const tokenBudget = options.tokenBudget || DEFAULT_TOKEN_BUDGET;
  const maxMessages = options.maxMessages || 20;
  const shouldSummarize = options.summarize !== false;

  if (history.length <= maxMessages) {
    const tokens = estimateMessageTokens(history);
    if (tokens <= tokenBudget) {
      return { messages: history, summary: null, trimmed: 0 };
    }
  }

  const kept = [];
  let usedTokens = 0;
  let trimmed = 0;
  let summary = null;

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const msgTokens = estimateTokens(msg.content || '') + 4;
    if (kept.length >= maxMessages || usedTokens + msgTokens > tokenBudget) {
      trimmed = i + 1;
      break;
    }
    kept.unshift(msg);
    usedTokens += msgTokens;
  }

  const oldMessages = history.slice(0, trimmed);
  if (shouldSummarize && oldMessages.length > 0) {
    summary = await summarizeOldContext(oldMessages);
    if (summary) {
      kept.unshift({
        role: 'system',
        content: '[Summary of earlier conversation]: ' + summary,
        _summarized: true
      });
    }
  }

  return { messages: kept, summary, trimmed };
}

async function buildOptimizedMessages(prompt, history = [], options = {}) {
  const windowed = await applySlidingWindow(history, {
    tokenBudget: options.tokenBudget || DEFAULT_TOKEN_BUDGET,
    maxMessages: options.maxMessages || 20,
    summarize: options.summarize !== false
  });

  const messages = [
    { role: 'system', content: options.systemPrompt || '' }
  ];

  for (const msg of windowed.messages) {
    if (msg.role === 'system' && msg._summarized) {
      messages.push(msg);
    } else if (msg.role && msg.content) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: prompt });
  return messages;
}

module.exports = {
  estimateMessageTokens,
  summarizeOldContext,
  applySlidingWindow,
  buildOptimizedMessages,
  DEFAULT_TOKEN_BUDGET
};
