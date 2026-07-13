const { spawnSync } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const { getEnv } = require('./env');
const { providerStatus, activeProviderId } = require('./providers');
const { ROOT_DIR } = require('./storage');
const { countTokensFromResponse } = require('./cost');

let _sessionCost = 0;

// ─── Circuit Breaker State ────────────────────────────────────────────
const circuitState = new Map();

function circuitBreakerTrip(providerId) {
  const state = circuitState.get(providerId) || { failures: 0, lastFailAt: 0, open: false };
  state.failures += 1;
  state.lastFailAt = Date.now();
  if (state.failures >= 3) state.open = true;
  circuitState.set(providerId, state);
}

function circuitBreakerReset(providerId) {
  circuitState.set(providerId, { failures: 0, lastFailAt: 0, open: false });
}

function circuitBreakerIsOpen(providerId) {
  const state = circuitState.get(providerId);
  if (!state || !state.open) return false;
  if (Date.now() - state.lastFailAt > 60000) {
    state.open = false;
    state.failures = 0;
    circuitState.set(providerId, state);
    return false;
  }
  return true;
}

// ─── Fallback Chain ───────────────────────────────────────────────────
const FALLBACK_CHAINS = {
  ollama: ['openrouter', 'openai'],
  openai: ['openrouter', 'ollama'],
  anthropic: ['openrouter', 'openai'],
  gemini: ['openrouter', 'openai'],
  kimi: ['openrouter', 'openai'],
  openrouter: ['openai', 'ollama'],
  codex: ['ollama', 'openrouter'],
  offline: []
};

function getFallbackProviders(primaryId) {
  const chain = FALLBACK_CHAINS[primaryId] || [];
  return chain.filter(id => {
    if (circuitBreakerIsOpen(id)) return false;
    try {
      const status = providerStatus(id);
      return status.configured;
    } catch { return false; }
  });
}

// ─── Retry with exponential backoff ───────────────────────────────────
async function withRetry(fn, maxRetries = 2, baseDelayMs = 1000, providerId = '') {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (providerId) circuitBreakerReset(providerId);
      return result;
    } catch (err) {
      lastError = err;
      if (providerId) circuitBreakerTrip(providerId);
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────
function splitArgs(text) {
  return text ? text.split(/\s+/).filter(Boolean) : [];
}

/**
 * Streaming HTTP POST for OpenAI-compatible endpoints.
 * Reads SSE stream and calls onToken for each delta.
 */
function postJsonStream(url, payload, options = {}) {
  const body = JSON.stringify({ ...payload, stream: true });
  const client = url.startsWith('https:') ? https : http;
  const onToken = typeof options.onToken === 'function' ? options.onToken : null;

  return new Promise((resolve, reject) => {
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        ...(options.headers || {})
      },
      timeout: options.timeout || 120000
    }, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        let errorText = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { errorText += chunk; });
        response.on('end', () => {
          reject(new Error('HTTP ' + response.statusCode + ': ' + errorText.slice(0, 240)));
        });
        return;
      }

      let buffer = '';
      let content = '';
      response.setEncoding('utf8');

      response.on('data', (chunk) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line || !line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const obj = JSON.parse(data);
            const delta = obj.choices?.[0]?.delta?.content || '';
            if (delta) {
              content += delta;
              if (onToken) onToken(delta);
            }
          } catch { /* ignore SSE parse errors */ }
        }
      });

      response.on('end', () => {
        const remaining = buffer.trim();
        if (remaining && remaining.startsWith('data:')) {
          const data = remaining.slice(5).trim();
          if (data !== '[DONE]') {
            try {
              const obj = JSON.parse(data);
              const delta = obj.choices?.[0]?.delta?.content || '';
              if (delta) {
                content += delta;
                if (onToken) onToken(delta);
              }
            } catch { /* ignore */ }
          }
        }
        resolve(content);
      });
    });

    req.on('timeout', () => { req.destroy(new Error('Request timed out.')); });
    req.on('error', (err) => { reject(err); });
    req.write(body);
    req.end();
  });
}

function postJson(url, payload, options = {}) {
  const body = JSON.stringify(payload);
  const client = url.startsWith('https:') ? https : http;

  return new Promise((resolve) => {
    const request = client.request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        ...(options.headers || {})
      },
      timeout: options.timeout || 120000
    }, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          text
        });
      });
    });

    request.on('timeout', () => { request.destroy(new Error('Request timed out.')); });
    request.on('error', (error) => { resolve({ ok: false, error: error.message }); });
    request.write(body);
    request.end();
  });
}

function formatHttpFailure(result) {
  if (result.error) return result.error;
  if (result.statusCode) return 'HTTP ' + result.statusCode + ': ' + (result.text?.slice(0, 240) || '');
  return 'No HTTP response received.';
}

function resetSessionCost() { _sessionCost = 0; }
function getSessionCost() { return _sessionCost; }

// ─── System Prompt ────────────────────────────────────────────────────
function kairosSystemPrompt() {
  return [
    'You are Kairos, a warm, capable AI assistant for normal conversation, coding help, planning, research, and troubleshooting.',
    'Answer naturally like a high-quality ChatGPT-style assistant: clear, useful, friendly, and not robotic.',
    'Use markdown when it helps readability, but keep simple answers simple.',
    'Ask a short clarifying question only when the missing detail truly matters.',
    'Prefer Windows PowerShell commands when giving local commands for this user.',
    'Do not suggest malware, token stealing, spam, raids, or bypass abuse.',
    'For risky file/shell actions, tell the user Kairos should ask for approval first.'
  ].join(' ');
}

function normalizeChatMessages(prompt, history = []) {
  const messages = [{ role: 'system', content: kairosSystemPrompt() }];
  for (const item of history.slice(-12)) {
    if (item?.role && item?.content) {
      messages.push({ role: item.role, content: item.content });
    }
  }
  messages.push({ role: 'user', content: prompt });
  return messages;
}

// ─── Ollama (streaming native) ────────────────────────────────────────
async function askOllama(prompt, history = [], options = {}) {
  const baseUrl = getEnv('KAIROS_OLLAMA_BASE_URL', 'http://localhost:11434').replace(/\/$/, '');
  const model = getEnv('KAIROS_OLLAMA_MODEL', 'llama3.1');
  const messages = normalizeChatMessages(prompt, history);
  const requestText = JSON.stringify(messages);
  const onToken = typeof options.onToken === 'function' ? options.onToken : null;

  return withRetry(async () => {
    if (onToken) {
      const body = JSON.stringify({ model, messages, stream: true });
      const client = baseUrl.startsWith('https:') ? https : http;
      return await new Promise((resolve, reject) => {
        const req = client.request(baseUrl + '/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
          timeout: options.timeout || 120000
        }, (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            let errorText = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { errorText += chunk; });
            res.on('end', () => { reject(new Error('Ollama HTTP ' + res.statusCode + ': ' + errorText.slice(0, 240))); });
            return;
          }
          let buffer = '';
          let content = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            buffer += chunk;
            let index;
            while ((index = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, index).trim();
              buffer = buffer.slice(index + 1);
              if (!line) continue;
              try {
                const obj = JSON.parse(line);
                const part = obj.message?.content || obj.response;
                if (part) { onToken(part); content += part; }
              } catch { /* ignore */ }
            }
          });
          res.on('end', () => {
            const remaining = buffer.trim();
            if (remaining) {
              try {
                const obj = JSON.parse(remaining);
                const part = obj.message?.content || obj.response;
                if (part) { onToken(part); content += part; }
              } catch { /* ignore */ }
            }
            try { const { cost } = countTokensFromResponse('ollama', content || '', requestText); _sessionCost += cost; } catch { /* ignore */ }
            resolve(content || '');
          });
        });
        req.on('timeout', () => { req.destroy(new Error('Request timed out.')); });
        req.on('error', (err) => { reject(err); });
        req.write(body);
        req.end();
      });
    }

    const result = await postJson(baseUrl + '/api/chat', { model, messages, stream: false });
    if (!result.ok) throw new Error('Ollama call failed. ' + formatHttpFailure(result));
    try {
      const json = JSON.parse(result.text);
      const content = json.message?.content || json.response || '';
      const { cost } = countTokensFromResponse('ollama', content, requestText);
      _sessionCost += cost;
      return content;
    } catch { throw new Error('Ollama returned invalid JSON.'); }
  }, 2, 1000, 'ollama');
}

// ─── OpenAI-compatible with streaming ─────────────────────────────────
async function askOpenAiCompatible({ prompt, apiKey, model, url, label, providerId, extraHeaders = {}, history = [], onToken }) {
  const messages = normalizeChatMessages(prompt, history);
  const requestText = JSON.stringify(messages);
  const headers = { ...extraHeaders };
  if (onToken) delete headers.onToken;
  const authHeaders = { Authorization: 'Bearer ' + apiKey, ...headers };

  return withRetry(async () => {
    if (onToken) {
      try {
        const content = await postJsonStream(url, { model, messages }, { headers: authHeaders, onToken, timeout: 120000 });
        const { cost } = countTokensFromResponse(providerId, content, requestText);
        _sessionCost += cost;
        return content;
      } catch (streamErr) { /* fall through to non-streaming */ }
    }

    const result = await postJson(url, { model, messages }, { headers: authHeaders });
    if (!result.ok) throw new Error(label + ' call failed. ' + formatHttpFailure(result));
    try {
      const data = JSON.parse(result.text);
      const content = data.choices?.[0]?.message?.content || (label + ' returned no response.');
      const { cost } = countTokensFromResponse(providerId, content, requestText);
      _sessionCost += cost;
      return content;
    } catch { throw new Error(label + ' returned invalid JSON.'); }
  }, 2, 1000, providerId);
}

// ─── Anthropic with streaming ─────────────────────────────────────────
async function askAnthropic(prompt, history = [], onToken) {
  const apiKey = getEnv('ANTHROPIC_API_KEY');
  const model = getEnv('KAIROS_ANTHROPIC_MODEL', 'claude-3-5-sonnet-latest');
  const allMessages = normalizeChatMessages(prompt, history);
  const systemMessage = allMessages.find(m => m.role === 'system')?.content || kairosSystemPrompt();
  const messages = allMessages.filter(m => m.role !== 'system');
  const requestText = JSON.stringify({ model, max_tokens: 4096, system: systemMessage, messages });

  return withRetry(async () => {
    if (onToken) {
      try {
        const body = JSON.stringify({ model, max_tokens: 4096, system: systemMessage, messages, stream: true });
        const content = await new Promise((resolve, reject) => {
          const req = https.request('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            timeout: 120000
          }, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              let errText = '';
              res.setEncoding('utf8');
              res.on('data', c => { errText += c; });
              res.on('end', () => reject(new Error('Anthropic HTTP ' + res.statusCode + ': ' + errText.slice(0, 240))));
              return;
            }
            let buffer = '';
            let content = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              buffer += chunk;
              let idx;
              while ((idx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line || !line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                try {
                  const obj = JSON.parse(data);
                  if (obj.type === 'content_block_delta') {
                    const delta = obj.delta?.text || '';
                    if (delta) { content += delta; onToken(delta); }
                  }
                } catch { /* ignore */ }
              }
            });
            res.on('end', () => { resolve(content); });
          });
          req.on('timeout', () => { req.destroy(new Error('Request timed out.')); });
          req.on('error', (err) => { reject(err); });
          req.write(body);
          req.end();
        });
        const { cost } = countTokensFromResponse('anthropic', content, requestText);
        _sessionCost += cost;
        return content;
      } catch (streamErr) { /* fall through */ }
    }

    const result = await postJson('https://api.anthropic.com/v1/messages', { model, max_tokens: 4096, system: systemMessage, messages }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } });
    if (!result.ok) throw new Error('Anthropic call failed. ' + formatHttpFailure(result));
    try {
      const content = JSON.parse(result.text).content?.map(item => item.text).filter(Boolean).join('\n') || '';
      const { cost } = countTokensFromResponse('anthropic', content, requestText);
      _sessionCost += cost;
      return content;
    } catch { throw new Error('Anthropic returned invalid JSON.'); }
  }, 2, 1000, 'anthropic');
}

// ─── Gemini with streaming ────────────────────────────────────────────
async function askGemini(prompt, history = [], onToken) {
  const apiKey = getEnv('GEMINI_API_KEY');
  const model = getEnv('KAIROS_GEMINI_MODEL', 'gemini-1.5-flash');
  const allMessages = normalizeChatMessages(prompt, history);
  const contentText = allMessages.map(m => m.role + ': ' + m.content).join('\n\n');
  const requestText = JSON.stringify({ model, contents: [{ parts: [{ text: contentText }] }] });

  return withRetry(async () => {
    if (onToken) {
      try {
        const body = JSON.stringify({ model, contents: [{ parts: [{ text: contentText }] }], generationConfig: { maxOutputTokens: 4096 } });
        const streamUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(apiKey);
        const content = await new Promise((resolve, reject) => {
          const req = https.request(streamUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
            timeout: 120000
          }, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              let errText = '';
              res.setEncoding('utf8');
              res.on('data', c => { errText += c; });
              res.on('end', () => reject(new Error('Gemini HTTP ' + res.statusCode + ': ' + errText.slice(0, 240))));
              return;
            }
            let buffer = '';
            let content = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              buffer += chunk;
              let idx;
              while ((idx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line || !line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                try {
                  const obj = JSON.parse(data);
                  const parts = obj.candidates?.[0]?.content?.parts || [];
                  for (const part of parts) {
                    if (part.text) { content += part.text; onToken(part.text); }
                  }
                } catch { /* ignore */ }
              }
            });
            res.on('end', () => { resolve(content); });
          });
          req.on('timeout', () => { req.destroy(new Error('Request timed out.')); });
          req.on('error', (err) => { reject(err); });
          req.write(body);
          req.end();
        });
        const { cost } = countTokensFromResponse('gemini', content, requestText);
        _sessionCost += cost;
        return content;
      } catch (streamErr) { /* fall through */ }
    }

    const result = await postJson('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey), { contents: [{ parts: [{ text: contentText }] }] });
    if (!result.ok) throw new Error('Gemini call failed. ' + formatHttpFailure(result));
    try {
      const content = JSON.parse(result.text).candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
      const { cost } = countTokensFromResponse('gemini', content, requestText);
      _sessionCost += cost;
      return content;
    } catch { throw new Error('Gemini returned invalid JSON.'); }
  }, 2, 1000, 'gemini');
}

// ─── Codex bridge ─────────────────────────────────────────────────────
function askCodex(prompt) {
  const command = getEnv('KAIROS_CODEX_COMMAND', 'codex');
  const args = splitArgs(getEnv('KAIROS_CODEX_ARGS', 'exec')).concat([prompt]);
  const result = spawnSync(command, args, { cwd: ROOT_DIR, encoding: 'utf8', timeout: 120000 });
  if (result.error) return ['Codex bridge failed: ' + result.error.message, 'Tip: set the command with:', 'npm.cmd run kairos -- brain setup --provider codex --yes', 'Then edit KAIROS_CODEX_COMMAND / KAIROS_CODEX_ARGS in .env if needed.'].join('\n');
  if (result.status !== 0) return result.stderr || result.stdout || 'Codex exited with status ' + result.status;
  return result.stdout.trim() || 'Codex returned no output.';
}

// ─── Main entry point with fallback ───────────────────────────────────
async function askBrain(prompt, history = [], onToken) {
  const provider = providerStatus();
  if (provider.id === 'offline') return 'No AI brain configured. Run: npm.cmd run kairos -- brain setup';

  if (circuitBreakerIsOpen(provider.id)) {
    const fallbacks = getFallbackProviders(provider.id);
    if (fallbacks.length > 0) {
      console.log('[Kairos] Circuit breaker open for ' + provider.id + ', falling back to ' + fallbacks[0]);
      return askBrainWithProvider(fallbacks[0], prompt, history, onToken);
    }
    circuitBreakerReset(provider.id);
  }

  return askBrainWithProvider(provider.id, prompt, history, onToken);
}

async function askBrainWithProvider(providerId, prompt, history = [], onToken) {
  if (providerId === 'codex') return askCodex(prompt);
  if (providerId === 'ollama') return askOllama(prompt, history, { onToken });
  if (providerId === 'openai') return askOpenAiCompatible({ prompt, apiKey: getEnv('OPENAI_API_KEY'), model: getEnv('KAIROS_OPENAI_MODEL', 'gpt-4.1-mini'), url: 'https://api.openai.com/v1/chat/completions', label: 'OpenAI', providerId: 'openai', history, onToken });
  if (providerId === 'openrouter') return askOpenAiCompatible({ prompt, apiKey: getEnv('OPENROUTER_API_KEY'), model: getEnv('KAIROS_OPENROUTER_MODEL', 'openai/gpt-4.1-mini'), url: 'https://openrouter.ai/api/v1/chat/completions', label: 'OpenRouter', providerId: 'openrouter', history, onToken, extraHeaders: { 'HTTP-Referer': 'http://localhost/kairos', 'X-Title': 'Kairos Agent' } });
  if (providerId === 'kimi') return askOpenAiCompatible({ prompt, apiKey: getEnv('KIMI_API_KEY'), model: getEnv('KAIROS_KIMI_MODEL', 'kimi-latest'), url: 'https://api.moonshot.ai/v1/chat/completions', label: 'Kimi', providerId: 'kimi', history, onToken });
  if (providerId === 'anthropic') return askAnthropic(prompt, history, onToken);
  if (providerId === 'gemini') return askGemini(prompt, history, onToken);
  return 'Unknown brain provider: ' + providerId;
}

module.exports = {
  askBrain,
  askCodex,
  resetSessionCost,
  getSessionCost,
  circuitBreakerIsOpen,
  circuitBreakerReset,
  circuitBreakerTrip,
  getFallbackProviders,
  withRetry
};
