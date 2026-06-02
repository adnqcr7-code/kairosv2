const fs = require('node:fs');
const path = require('node:path');
const { ROOT_DIR } = require('./paths');

const ENV_PATH = path.join(ROOT_DIR, '.env');

function parseEnv(text) {
  const values = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, '');
    values[key] = value;
  }

  return values;
}

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return parseEnv(fs.readFileSync(ENV_PATH, 'utf8'));
}

function getEnv(name, fallback = '') {
  return process.env[name] || readEnvFile()[name] || fallback;
}

function updateEnvFile(updates) {
  const existingText = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const existing = parseEnv(existingText);
  const merged = { ...existing, ...updates };

  const keys = Object.keys(merged).sort();
  const lines = [
    '# Kairos local config. Keep this file private.',
    ...keys.map((key) => `${key}=${merged[key]}`)
  ];

  fs.writeFileSync(ENV_PATH, `${lines.join('\n')}\n`);
  return ENV_PATH;
}

function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

module.exports = {
  ENV_PATH,
  getEnv,
  maskSecret,
  readEnvFile,
  updateEnvFile
};
