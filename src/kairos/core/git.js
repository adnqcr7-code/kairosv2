const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { ROOT_DIR } = require('./storage');
const { runReviewedCommand, safeResolve } = require('./workspace-tools');

function gitStatus() {
  const result = spawnSync('git', ['status', '--short'], {
    encoding: 'utf8',
    cwd: ROOT_DIR
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'git status failed.');
  }

  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  return {
    changedFiles: lines.map((line) => line.trim()),
    raw: result.stdout
  };
}

function gitDiff(targetPath) {
  const resolved = safeResolve(targetPath);
  const relativePath = path.relative(ROOT_DIR, resolved).replace(/\\/g, '/');
  const result = spawnSync('git', ['diff', '--', relativePath], {
    encoding: 'utf8',
    cwd: ROOT_DIR
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git diff failed for ${relativePath}.`);
  }

  return {
    path: relativePath,
    diff: result.stdout
  };
}

async function gitCommit(message, flags = {}) {
  if (!message || typeof message !== 'string') {
    throw new Error('gitCommit requires a commit message.');
  }

  const command = `git commit -m ${JSON.stringify(message)}`;
  return await runReviewedCommand(command, flags);
}

async function gitBranch(name, flags = {}) {
  if (!name || typeof name !== 'string') {
    throw new Error('gitBranch requires a branch name.');
  }

  const command = `git branch ${JSON.stringify(name)}`;
  return await runReviewedCommand(command, flags);
}

module.exports = {
  gitStatus,
  gitDiff,
  gitCommit,
  gitBranch
};
