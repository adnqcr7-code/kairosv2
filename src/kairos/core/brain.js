const { spawnSync } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const { getEnv } = require('./env');
const { providerStatus } = require('./providers');
const { ROOT_DIR } = require('./storage');
const { countTokensFromResponse } = require('./cost');

let _sessionCost = 0;

function splitArgs(text) {
  return text ? text.split(/\s+/).filter(Boolean) : [];
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
      response.on('data', (chunk) => {
        text += chunk;
      });
      response.on('end', () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          text
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Request timed out.'));
    });
    request.on('error', (error) => {
      resolve({ ok: false, error: error.message });
    });
    request.write(body);
    request.end();
  });
}

function formatHttpFailure(result) {
  if (result.error) return result.error;
  if (result.statusCode) return `HTTP ${result.statusCode}: ${result.text?.slice(0, 240) || ''}`;
  return 'No HTTP response received.';
}

function resetSessionCost() {
  _sessionCost = 0;
}

function getSessionCost() {
  return _sessionCost;
}

function askCodex(prompt) {
  const command = getEnv('KAIROS_CODEX_COMMAND', 'codex');
  const args = splitArgs(getEnv('KAIROS_CODEX_ARGS', 'exec')).concat([prompt]);
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    timeout: 120000
  });

  if (result.error) {
    return [
      `Codex bridge failed: ${result.error.message}`,
      'Tip: set the command with:',
      'npm.cmd run kairos -- brain setup --provider codex --yes',
      'Then edit KAIROS_CODEX_COMMAND / KAIROS_CODEX_ARGS in .env if needed.'
    ].join('\n');
  }

  if (result.status !== 0) {
    return result.stderr || result.stdout || `Codex exited with status ${result.status}`;
  }

  return result.stdout.trim() || 'Codex returned no output.';
}

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
  const messages = [
    {
      role: 'system',
      content: kairosSystemPrompt()
    }
  ];

  for (const item of history.slice(-12)) {
    if (item?.role && item?.content) {
      messages.push({ role: item.role, content: item.content });
    }
  }

  messages.push({ role: 'user', content: prompt });
  return messages;
}

async function askOllama(prompt, history = [], options = {}) {
  const baseUrl = getEnv('KAIROS_OLLAMA_BASE_URL', 'http://localhost:11434').replace(/\/$/, '');
  const model = getEnv('KAIROS_OLLAMA_MODEL', 'llama3.1');
  const messages = normalizeChatMessages(prompt, history);
  const requestText = JSON.stringify(messages);
  const onToken = typeof options.onToken === 'function' ? options.onToken : null;
  // If a streaming callback is provided, enable streaming.
  if (onToken) {
    // Build request payload with streaming enabled.
    const body = JSON.stringify({ model, messages, stream: true });
    const client = baseUrl.startsWith('https:') ? https : http;
    return await new Promise((resolve) => {
      const req = client.request(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body)
        },
        timeout: options.timeout || 120000
      }, (res) => {
        // Check HTTP status code early. If not 2xx, buffer the body and return a detailed error.
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let errorText = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            errorText += chunk;
          });
          res.on('end', () => {
            resolve(`Ollama call failed. HTTP ${res.statusCode}: ${errorText.slice(0, 240)}`);
          });
          return;
        }
        let buffer = '';
        let content = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          buffer += chunk;
          // Process lines delimited by newline. Some chunks may contain multiple lines.
          let index;
          while ((index = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              // Ollama streaming returns either { message: { content } } or { response }.
              const part = obj.message?.content || obj.response;
              if (part) {
                onToken(part);
                content += part;
              }
            } catch {
              // ignore parse errors
            }
          }
        });
        res.on('end', () => {
          // Attempt to parse any remaining buffered line without trailing newline.
          const remaining = buffer.trim();
          if (remaining) {
            try {
              const obj = JSON.parse(remaining);
              const part = obj.message?.content || obj.response;
              if (part) {
                onToken(part);
                content += part;
              }
            } catch {
              // ignore
            }
          }
          // compute cost using accumulated content
          try {
            const { cost } = countTokensFromResponse('ollama', content || '', requestText);
            _sessionCost += cost;
          } catch {
            // ignore cost errors
          }
          resolve(content || '');
        });
      });
      req.on('timeout', () => {
        req.destroy(new Error('Request timed out.'));
      });
      req.on('error', (err) => {
        resolve(`Ollama call failed. ${err.message || ''}`);
      });
      req.write(body);
      req.end();
    });
  }
  // Non-streaming fallback.
  const result = await postJson(`${baseUrl}/api/chat`, {
    model,
    messages,
    stream: false
  });

  if (!result.ok) {
    return [
      'Ollama call failed.',
      formatHttpFailure(result),
      '',
      'Fix:',
      '1. Open Ollama or run: ollama serve',
      `2. Pull the model: ollama pull ${model}`,
      `3. Check Kairos: npm.cmd run kairos -- brain check ollama`
    ].join('\n');
  }

  try {
    const json = JSON.parse(result.text);
    const content = json.message?.content || json.response || 'Ollama returned no response.';
    const { cost } = countTokensFromResponse('ollama', content, requestText);
    _sessionCost += cost;
    return content;
  } catch {
    return 'Ollama returned invalid JSON.';
  }
}

async function askOpenAiCompatible({ prompt, apiKey, model, url, label, providerId, extraHeaders = {}, history = [] }) {
  const messages = normalizeChatMessages(prompt, history);
  const requestText = JSON.stringify(messages);
  const onToken = typeof extraHeaders.onToken === 'function' ? extraHeaders.onToken : null;
  // Remove onToken from headers so it is not sent over the network.
  const headers = { ...extraHeaders };
  if (onToken) delete headers.onToken;
  const result = await postJson(url, {
    model,
    messages
  }, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...headers
    }
  });
  if (!result.ok) {
    return `${label} call failed. This API key/model is not working yet. ${formatHttpFailure(result)}`;
  }
  try {
    const data = JSON.parse(result.text);
    const content = data.choices?.[0]?.message?.content || `${label} returned no response.`;
    // If a streaming callback is provided, emit tokens for the returned content.
    if (onToken) {
      // Split by whitespace and emit tokens sequentially.
      const parts = content.split(/(\s+)/);
      for (const part of parts) {
        if (part) onToken(part);
      }
    }
    const { cost } = countTokensFromResponse(providerId, content, requestText);
    _sessionCost += cost;
    return content;
  } catch {
    return `${label} returned invalid JSON.`;
  }
}

async function askAnthropic(prompt, history = []) {
  const apiKey = getEnv('ANTHROPIC_API_KEY');
  const model = getEnv('KAIROS_ANTHROPIC_MODEL', 'claude-3-5-sonnet-latest');
  const messages = normalizeChatMessages(prompt, history).filter((message) => message.role !== 'system');
  const requestText = JSON.stringify({ model, max_tokens: 1200, system: kairosSystemPrompt(), messages });
  const result = await postJson('https://api.anthropic.com/v1/messages', {
    model,
    max_tokens: 1200,
    system: kairosSystemPrompt(),
    messages
  }, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  });

  if (!result.ok) {
    return `Anthropic call failed. This API key/model is not working yet. ${formatHttpFailure(result)}`;
  }

  try {
    const content = JSON.parse(result.text).content?.map((item) => item.text).filter(Boolean).join('\n') || 'Anthropic returned no response.';
    const { cost } = countTokensFromResponse('anthropic', content, requestText);
    _sessionCost += cost;
    return content;
  } catch {
    return 'Anthropic returned invalid JSON.';
  }
}

async function askGemini(prompt, history = []) {
  const apiKey = getEnv('GEMINI_API_KEY');
  const model = getEnv('KAIROS_GEMINI_MODEL', 'gemini-1.5-flash');
  const contentText = normalizeChatMessages(prompt, history).map((message) => `${message.role}: ${message.content}`).join('\n\n');
  const requestText = JSON.stringify({ model, contents: [{ parts: [{ text: contentText }] }] });
  const result = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    contents: [
      {
        parts: [{ text: contentText }]
      }
    ]
  });

  if (!result.ok) {
    return `Gemini call failed. This API key/model is not working yet. ${formatHttpFailure(result)}`;
  }

  try {
    const content = JSON.parse(result.text).candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n') || 'Gemini returned no response.';
    const { cost } = countTokensFromResponse('gemini', content, requestText);
    _sessionCost += cost;
    return content;
  } catch {
    return 'Gemini returned invalid JSON.';
  }
}

/**
 * Ask the configured brain for a response.  An optional onToken callback
 * can be provided to receive streamed tokens as they arrive.  Only
 * streaming-aware providers (currently Ollama) will use the callback.
 * @param {string} prompt
 * @param {Array} history
 * @param {function} [onToken] callback for streaming tokens
 */
async function askBrain(prompt, history = [], onToken) {
  const provider = providerStatus();
  if (provider.id === 'offline') {
    return 'No AI brain configured. Run: npm.cmd run kairos -- brain setup';
  }

  if (provider.id === 'codex') {
    return askCodex(prompt);
  }

  if (provider.id === 'ollama') {
    return askOllama(prompt, history, { onToken });
  }

  if (provider.id === 'openai') {
    return askOpenAiCompatible({
      prompt,
      apiKey: getEnv('OPENAI_API_KEY'),
      model: getEnv('KAIROS_OPENAI_MODEL', 'gpt-4.1-mini'),
      url: 'https://api.openai.com/v1/chat/completions',
      label: 'OpenAI',
      providerId: 'openai',
      history,
      extraHeaders: onToken ? { onToken } : {}
    });
  }

  if (provider.id === 'openrouter') {
    return askOpenAiCompatible({
      prompt,
      apiKey: getEnv('OPENROUTER_API_KEY'),
      model: getEnv('KAIROS_OPENROUTER_MODEL', 'openai/gpt-4.1-mini'),
      url: 'https://openrouter.ai/api/v1/chat/completions',
      label: 'OpenRouter',
      providerId: 'openrouter',
      history,
      extraHeaders: {
        'HTTP-Referer': 'http://localhost/kairos',
        'X-Title': 'Kairos Agent',
        ...(onToken ? { onToken } : {})
      }
    });
  }

  if (provider.id === 'kimi') {
    return askOpenAiCompatible({
      prompt,
      apiKey: getEnv('KIMI_API_KEY'),
      model: getEnv('KAIROS_KIMI_MODEL', 'kimi-latest'),
      url: 'https://api.moonshot.ai/v1/chat/completions',
      label: 'Kimi',
      providerId: 'kimi',
      history
    });
  }

  if (provider.id === 'anthropic') {
    return askAnthropic(prompt, history);
  }

  if (provider.id === 'gemini') {
    return askGemini(prompt, history);
  }

  return `Unknown brain provider: ${provider.id}`;
}

module.exports = {
  askBrain,
  askCodex,
  resetSessionCost,
  getSessionCost
};
