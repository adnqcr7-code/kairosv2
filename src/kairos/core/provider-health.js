const http = require('node:http');
const https = require('node:https');
const { spawnSync } = require('node:child_process');
const { getEnv } = require('./env');

function requestJson(url, options = {}) {
  const client = url.startsWith('https:') ? https : http;

  return new Promise((resolve) => {
    const request = client.request(url, {
      method: 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          body
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Request timed out.'));
    });
    request.on('error', (error) => {
      resolve({
        ok: false,
        error: error.message
      });
    });
    request.end();
  });
}

function detectCodex() {
  const result = spawnSync('where.exe', ['codex'], {
    encoding: 'utf8',
    timeout: 10000
  });

  const paths = result.status === 0
    ? result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];

  return {
    found: paths.length > 0,
    paths,
    error: result.status === 0 ? '' : (result.stderr || 'codex was not found on PATH').trim()
  };
}

async function checkOllama() {
  const baseUrl = getEnv('KAIROS_OLLAMA_BASE_URL', 'http://localhost:11434').replace(/\/$/, '');
  const model = getEnv('KAIROS_OLLAMA_MODEL', 'llama3.1');
  const result = await requestJson(`${baseUrl}/api/tags`);
  if (!result.ok) {
    return {
      ok: false,
      message: `Ollama is not reachable at ${baseUrl}. Start Ollama or change KAIROS_OLLAMA_BASE_URL.`,
      detail: result.error || (result.statusCode ? `HTTP ${result.statusCode}` : 'No HTTP response from Ollama.'),
      fix: [
        'Start Ollama: ollama serve',
        `Install model: ollama pull ${model}`,
        'Then run: npm.cmd run kairos -- brain check ollama'
      ]
    };
  }

  let models = [];
  try {
    models = JSON.parse(result.body).models || [];
  } catch {
    return { ok: false, message: 'Ollama responded, but not with valid JSON.' };
  }

  const hasModel = models.some((entry) => entry.name === model || entry.model === model || entry.name?.startsWith(`${model}:`));
  return {
    ok: hasModel,
    message: hasModel
      ? `Ollama is reachable and model ${model} is installed.`
      : `Ollama is reachable, but model ${model} is not installed. Run: ollama pull ${model}`,
    fix: hasModel ? [] : [`ollama pull ${model}`],
    models: models.map((entry) => entry.name || entry.model).filter(Boolean)
  };
}

async function listOllamaModels() {
  const baseUrl = getEnv('KAIROS_OLLAMA_BASE_URL', 'http://localhost:11434').replace(/\/$/, '');
  const result = await requestJson(`${baseUrl}/api/tags`);
  if (!result.ok) {
    return {
      ok: false,
      message: `Ollama is not reachable at ${baseUrl}.`,
      detail: result.error || (result.statusCode ? `HTTP ${result.statusCode}` : 'No HTTP response from Ollama.')
    };
  }

  try {
    const models = (JSON.parse(result.body).models || [])
      .map((entry) => entry.name || entry.model)
      .filter(Boolean);
    return { ok: true, models };
  } catch {
    return { ok: false, message: 'Ollama responded, but not with valid JSON.' };
  }
}

async function checkBearerProvider({ providerId, label, keyEnv, modelEnv, url, extraHeaders = {} }) {
  const apiKey = getEnv(keyEnv);
  const model = getEnv(modelEnv);
  if (!apiKey) {
    return {
      ok: false,
      message: `${label} API key is missing. Add a real key to ${keyEnv}.`
    };
  }

  const result = await requestJson(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders
    }
  });

  if (!result.ok) {
    return {
      ok: false,
      message: `${label} API check failed. This does not look like a real working API key yet.`,
      detail: result.error || `HTTP ${result.statusCode}: ${result.body?.slice(0, 240) || ''}`
    };
  }

  return {
    ok: true,
    message: `${label} API key works${model ? ` for configured model target ${model}` : ''}.`,
    providerId
  };
}

async function checkGemini() {
  const apiKey = getEnv('GEMINI_API_KEY');
  const model = getEnv('KAIROS_GEMINI_MODEL', 'gemini-1.5-flash');
  if (!apiKey) {
    return { ok: false, message: 'Gemini API key is missing. Add a real key to GEMINI_API_KEY.' };
  }

  const result = await requestJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  if (!result.ok) {
    return {
      ok: false,
      message: 'Gemini API check failed. This does not look like a real working API key yet.',
      detail: result.error || `HTTP ${result.statusCode}: ${result.body?.slice(0, 240) || ''}`
    };
  }

  return { ok: true, message: `Gemini API key works for configured model target ${model}.` };
}

function checkCodex() {
  const detected = detectCodex();
  if (!detected.found) {
    return {
      ok: false,
      message: 'Codex was not found on PATH. Install/open Codex first, or choose another brain.',
      detected
    };
  }

  const command = getEnv('KAIROS_CODEX_COMMAND', 'codex');
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    timeout: 10000
  });

  if (result.error || result.status !== 0) {
    return {
      ok: false,
      message: 'Codex was found, but Windows blocked Kairos from launching it. The bridge is not usable yet.',
      detail: result.error?.message || result.stderr || result.stdout || `status ${result.status}`,
      detected
    };
  }

  return {
    ok: true,
    message: 'Codex was found and can be launched by Kairos.',
    detected,
    version: result.stdout.trim()
  };
}

async function checkProvider(providerId) {
  switch (providerId) {
    case 'offline':
      return { ok: false, message: 'No AI brain selected.' };
    case 'ollama':
      return checkOllama();
    case 'openai':
      return checkBearerProvider({
        providerId,
        label: 'OpenAI',
        keyEnv: 'OPENAI_API_KEY',
        modelEnv: 'KAIROS_OPENAI_MODEL',
        url: 'https://api.openai.com/v1/models'
      });
    case 'anthropic':
      return checkBearerProvider({
        providerId,
        label: 'Anthropic',
        keyEnv: 'ANTHROPIC_API_KEY',
        modelEnv: 'KAIROS_ANTHROPIC_MODEL',
        url: 'https://api.anthropic.com/v1/models',
        extraHeaders: { 'anthropic-version': '2023-06-01' }
      });
    case 'gemini':
      return checkGemini();
    case 'kimi':
      return checkBearerProvider({
        providerId,
        label: 'Kimi',
        keyEnv: 'KIMI_API_KEY',
        modelEnv: 'KAIROS_KIMI_MODEL',
        url: 'https://api.moonshot.ai/v1/models'
      });
    case 'openrouter':
      return checkBearerProvider({
        providerId,
        label: 'OpenRouter',
        keyEnv: 'OPENROUTER_API_KEY',
        modelEnv: 'KAIROS_OPENROUTER_MODEL',
        url: 'https://openrouter.ai/api/v1/models'
      });
    case 'codex':
      return checkCodex();
    default:
      return { ok: false, message: `Unknown provider: ${providerId}` };
  }
}

module.exports = {
  checkProvider,
  detectCodex,
  listOllamaModels
};
