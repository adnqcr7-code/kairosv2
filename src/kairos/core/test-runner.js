const { runReviewedCommand } = require('./workspace-tools');

function parseTestOutput(output) {
  const text = output || '';
  let passedCount = 0;
  let failedCount = 0;
  const failures = [];

  // Count occurrences like 'x passed' and 'x failed'
  const passedMatches = [...text.matchAll(/(\d+)\s+passed/gi)];
  const failedMatches = [...text.matchAll(/(\d+)\s+failed/gi)];
  for (const m of passedMatches) passedCount += Number(m[1] || 0);
  for (const m of failedMatches) failedCount += Number(m[1] || 0);

  // Try to capture failing test titles (Jest/Vitest output often uses '● <title>')
  for (const m of text.matchAll(/^\s*●\s+(.+)$/gim)) {
    failures.push(m[1].trim());
  }

  // Also capture lines that start with 'FAIL ' (file paths) and next non-empty line as test title
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const failFile = line.match(/^FAIL\s+(.*)$/);
    if (failFile) {
      // look ahead for a test title line
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        const titleLine = lines[j].trim();
        if (titleLine && !titleLine.startsWith('at ') && titleLine.length < 200) {
          failures.push(titleLine);
          break;
        }
      }
    }
  }

  // Fallback: if no matched counts, try to infer from keywords
  if (passedCount === 0 && failedCount === 0) {
    if (/failed/i.test(text)) failedCount = 1;
    if (/passed/i.test(text)) passedCount = 1;
  }

  const ok = failedCount === 0;
  return { ok, passedCount, failedCount, failures, output: text };
}

async function runTests(command = 'npm test') {
  const res = await runReviewedCommand(command);
  const out = `${res.stdout || ''}\n${res.stderr || ''}`.trim();
  const parsed = parseTestOutput(out);
  return parsed;
}

module.exports = { runTests, parseTestOutput };
