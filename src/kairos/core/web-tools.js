const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { URL, fileURLToPath, pathToFileURL } = require('node:url');
const { kairosDataDir, ROOT_DIR } = require('./storage');
const { requireApproval, reviewAction } = require('./safety');
const { logToolEvent } = require('./tool-log');

const DEFAULT_MAX_BYTES = 120_000;
const HARD_MAX_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

function isInside(parentDir, childPath) {
  const parent = path.resolve(parentDir);
  const child = path.resolve(childPath);
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function normalizeFetchOptions(options = {}) {
  return {
    maxBytes: clampInteger(options.maxBytes, DEFAULT_MAX_BYTES, 1_000, HARD_MAX_BYTES),
    timeoutMs: clampInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1_000, 120_000)
  };
}

function normalizeHttpUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL is required.');
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    throw new Error('URL is too long.');
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('web_fetch only supports http:// and https:// URLs.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded usernames or passwords are not allowed.');
  }

  return parsed;
}

function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '::1'].includes(normalized)) return true;

  const ipVersion = net.isIP(normalized);
  if (ipVersion === 4) {
    return normalized.startsWith('127.')
      || normalized.startsWith('10.')
      || normalized.startsWith('192.168.')
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized);
  }

  return ipVersion === 6 && (normalized === '::1' || normalized.startsWith('fe80:'));
}

function isLikelyTextContent(contentType = '') {
  const type = contentType.toLowerCase();
  return !type
    || type.startsWith('text/')
    || type.includes('json')
    || type.includes('xml')
    || type.includes('javascript')
    || type.includes('xhtml');
}

function decodeBasicHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html) {
  return decodeBasicHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|section|article|header|footer|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function bodyToOutput(body, contentType = '') {
  if (/html|xhtml/i.test(contentType) || /<html[\s>]/i.test(body)) {
    return htmlToText(body);
  }

  return body.trim();
}

function requestText(parsedUrl, options, redirectsRemaining = MAX_REDIRECTS) {
  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const request = client.request(parsedUrl, {
      method: 'GET',
      headers: {
        accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.1',
        'user-agent': 'KairosAgent/0.1 (+local-first CLI)'
      },
      timeout: options.timeoutMs
    }, (response) => {
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && location && redirectsRemaining > 0) {
        response.resume();
        let redirectUrl;
        try {
          redirectUrl = new URL(location, parsedUrl);
        } catch {
          resolve({ ok: false, error: `Invalid redirect URL: ${location}` });
          return;
        }
        resolve(requestText(redirectUrl, options, redirectsRemaining - 1));
        return;
      }

      const contentType = String(response.headers['content-type'] || '');
      if (!isLikelyTextContent(contentType)) {
        response.resume();
        resolve({
          ok: false,
          statusCode: response.statusCode,
          contentType,
          error: `Refused non-text response (${contentType || 'unknown content type'}).`
        });
        return;
      }

      const chunks = [];
      let totalBytes = 0;
      response.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > options.maxBytes) {
          request.destroy(new Error(`Response exceeded ${options.maxBytes} bytes.`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          finalUrl: parsedUrl.href,
          contentType,
          bytes: totalBytes,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error(`Request timed out after ${options.timeoutMs}ms.`));
    });
    request.on('error', (error) => {
      resolve({ ok: false, error: error.message });
    });
    request.end();
  });
}

async function webFetch(rawUrl, flags = {}, options = {}) {
  const parsedUrl = normalizeHttpUrl(rawUrl);
  const normalizedOptions = normalizeFetchOptions(options);
  const review = reviewAction({
    kind: 'web_fetch',
    url: parsedUrl.href,
    local: isLocalHostname(parsedUrl.hostname)
  });

  if (!await requireApproval(review, flags)) {
    const cancelled = { completed: false, message: 'Web fetch cancelled.', review };
    logToolEvent({ tool: 'web.fetch', url: parsedUrl.href, completed: false, cancelled: true, risk: review.level });
    return cancelled;
  }

  const result = await requestText(parsedUrl, normalizedOptions);
  const output = result.body ? bodyToOutput(result.body, result.contentType) : '';
  const completed = !!result.ok;
  const fetchResult = {
    completed,
    url: parsedUrl.href,
    finalUrl: result.finalUrl || parsedUrl.href,
    statusCode: result.statusCode,
    contentType: result.contentType,
    bytes: result.bytes || 0,
    output: completed ? output : (result.error || output || `HTTP ${result.statusCode}`),
    review
  };

  logToolEvent({
    tool: 'web.fetch',
    url: parsedUrl.href,
    completed,
    statusCode: result.statusCode,
    bytes: fetchResult.bytes,
    risk: review.level
  });
  return fetchResult;
}

function fileUrlFromWorkspacePath(target) {
  const candidate = path.resolve(ROOT_DIR, target);
  const dataDir = kairosDataDir();
  if (!isInside(ROOT_DIR, candidate) && !isInside(dataDir, candidate)) {
    throw new Error(`File target outside approved roots: ${target}`);
  }
  if (!fs.existsSync(candidate)) {
    throw new Error(`Browser target file not found: ${target}`);
  }
  return pathToFileURL(candidate);
}

function normalizeBrowserTarget(rawTarget, options = {}) {
  if (!rawTarget || typeof rawTarget !== 'string') {
    throw new Error('Browser target is required.');
  }

  const trimmed = rawTarget.trim();
  let parsed;

  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) {
    parsed = new URL(trimmed);
  } else if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/i.test(trimmed)) {
    parsed = new URL(`http://${trimmed}`);
  } else {
    parsed = fileUrlFromWorkspacePath(trimmed);
  }

  if (parsed.protocol === 'file:') {
    const filePath = fileURLToPath(parsed);
    if (!isInside(ROOT_DIR, filePath) && !isInside(kairosDataDir(), filePath)) {
      throw new Error('browser_open file URLs must stay inside approved local roots.');
    }
    return {
      target: parsed.href,
      local: true,
      protocol: parsed.protocol
    };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('browser_open supports local file paths, file://, http://, and https:// targets.');
  }

  const local = isLocalHostname(parsed.hostname);
  if (!local && !options.allowRemote) {
    throw new Error('Remote browser_open targets require allowRemote: true. Use web_fetch for research.');
  }

  return {
    target: parsed.href,
    local,
    protocol: parsed.protocol
  };
}

function browserCommand(target) {
  if (process.platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-Command', 'Start-Process -FilePath $args[0]', target]
    };
  }

  if (process.platform === 'darwin') {
    return { command: 'open', args: [target] };
  }

  return { command: 'xdg-open', args: [target] };
}

async function browserOpen(rawTarget, flags = {}, options = {}) {
  const normalized = normalizeBrowserTarget(rawTarget, options);
  const review = reviewAction({
    kind: 'browser_open',
    target: normalized.target,
    local: normalized.local
  });

  if (!await requireApproval(review, flags)) {
    const cancelled = { completed: false, message: 'Browser open cancelled.', review };
    logToolEvent({ tool: 'browser.open', target: normalized.target, completed: false, cancelled: true, risk: review.level });
    return cancelled;
  }

  if (options.dryRun) {
    const dry = { completed: true, target: normalized.target, dryRun: true, review };
    logToolEvent({ tool: 'browser.open', target: normalized.target, completed: true, dryRun: true, risk: review.level });
    return dry;
  }

  const launch = browserCommand(normalized.target);
  const result = spawnSync(launch.command, launch.args, {
    encoding: 'utf8',
    detached: false,
    timeout: 15_000,
    windowsHide: true
  });

  const openResult = {
    completed: result.status === 0 && !result.error,
    target: normalized.target,
    platform: os.platform(),
    status: result.status,
    output: result.stdout || result.stderr || result.error?.message || `Opened ${normalized.target}`,
    review
  };
  logToolEvent({
    tool: 'browser.open',
    target: normalized.target,
    completed: openResult.completed,
    status: result.status,
    risk: review.level
  });
  return openResult;
}

module.exports = {
  bodyToOutput,
  browserOpen,
  isLocalHostname,
  normalizeBrowserTarget,
  normalizeFetchOptions,
  normalizeHttpUrl,
  webFetch
};
