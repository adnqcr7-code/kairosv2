const fs = require('node:fs');
const path = require('node:path');
const { getEnv } = require('./env');
const { DEFAULT_KAIROS_DATA_DIR, ROOT_DIR } = require('./paths');

const GOAL_ID_PATTERN = /^goal_[0-9]{14}_[a-z0-9]{4}$/;

function kairosDataDir() {
  return getEnv('KAIROS_DATA_DIR', DEFAULT_KAIROS_DATA_DIR);
}

function goalsDir() {
  return path.join(kairosDataDir(), 'goals');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function goalPath(goalId) {
  if (!GOAL_ID_PATTERN.test(goalId)) {
    throw new Error(`Invalid goal id: ${goalId}`);
  }

  const resolvedPath = path.resolve(goalsDir(), `${goalId}.json`);
  const resolvedGoalsDir = path.resolve(goalsDir());
  if (!resolvedPath.startsWith(`${resolvedGoalsDir}${path.sep}`)) {
    throw new Error(`Goal path escaped Kairos data directory: ${goalId}`);
  }

  return resolvedPath;
}

function saveGoal(goal) {
  ensureDir(goalsDir());
  fs.writeFileSync(goalPath(goal.id), `${JSON.stringify(goal, null, 2)}\n`);
  return goal;
}

function loadGoal(goalId) {
  const filePath = goalPath(goalId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Goal not found: ${goalId}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listGoals() {
  const dir = goalsDir();
  ensureDir(dir);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json') && GOAL_ID_PATTERN.test(path.basename(file, '.json')))
    .map((file) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      } catch (error) {
        return {
          id: path.basename(file, '.json'),
          title: `Unreadable goal file: ${error.message}`,
          status: 'corrupt',
          createdAt: '0000-00-00T00:00:00.000Z'
        };
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

module.exports = {
  ROOT_DIR,
  kairosDataDir,
  GOAL_ID_PATTERN,
  saveGoal,
  loadGoal,
  listGoals
};
