const fs = require('node:fs');
const path = require('node:path');
const { kairosDataDir } = require('./storage');

function logDir() {
  return path.join(kairosDataDir(), 'logs');
}

function logPath() {
  const stamp = new Date().toISOString().slice(0, 10);
  return path.join(logDir(), `${stamp}.jsonl`);
}

function logToolEvent(event) {
  fs.mkdirSync(logDir(), { recursive: true });
  const record = {
    at: new Date().toISOString(),
    ...event
  };
  fs.appendFileSync(logPath(), `${JSON.stringify(record)}\n`);
  return record;
}

function readRecentToolEvents(limit = 25) {
  if (!fs.existsSync(logDir())) return [];
  const files = fs.readdirSync(logDir())
    .filter((file) => file.endsWith('.jsonl'))
    .sort()
    .reverse();

  const records = [];
  for (const file of files) {
    const lines = fs.readFileSync(path.join(logDir(), file), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .reverse();

    for (const line of lines) {
      try {
        records.push(JSON.parse(line));
      } catch {
        records.push({ at: '', tool: 'unknown', error: 'Unreadable log line' });
      }
      if (records.length >= limit) return records;
    }
  }

  return records;
}

module.exports = {
  logToolEvent,
  readRecentToolEvents
};
