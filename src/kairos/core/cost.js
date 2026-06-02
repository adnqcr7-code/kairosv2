// src/kairos/core/cost.js
// Token counting and cost estimation for various providers

// Rough token approximation: 1 token ~= 4 characters in English
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Pricing per 1K tokens (USD) – approximate as of 2025
const PRICING = {
  openai: { input: 0.00015, output: 0.0006 },
  anthropic: { input: 0.00025, output: 0.00125 },
  gemini: { input: 0.000125, output: 0.000375 },
  kimi: { input: 0.0002, output: 0.0006 },
  openrouter: { input: 0.00015, output: 0.0006 },
  ollama: { input: 0, output: 0 },
  codex: { input: 0, output: 0 },
  offline: { input: 0, output: 0 }
};

function calculateCost(providerId, inputTokens, outputTokens) {
  const pricing = PRICING[providerId] || { input: 0, output: 0 };
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

function countTokensFromResponse(providerId, responseText, requestText) {
  const inputTokens = estimateTokens(requestText);
  const outputTokens = estimateTokens(responseText);
  const cost = calculateCost(providerId, inputTokens, outputTokens);
  return { inputTokens, outputTokens, cost };
}

module.exports = {
  estimateTokens,
  calculateCost,
  countTokensFromResponse,
  PRICING
};
