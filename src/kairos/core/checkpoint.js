const fs = require('node:fs');
const path = require('node:path');
const { kairosDataDir } = require('./storage');

function checkpointsDir() {
  return path.join(kairosDataDir(), 'checkpoints');
}

function checkpointPath(goalId) {
  return path.join(checkpointsDir(), `${goalId}.json`);
}

function saveCheckpoint(goalId, stepIndex, actions, steps, context = {}) {
  fs.mkdirSync(checkpointsDir(), { recursive: true });
  const checkpoint = {
    goalId,
    stepIndex,
    actions,
    steps,
    context,
    savedAt: new Date().toISOString()
  };
  fs.writeFileSync(checkpointPath(goalId), JSON.stringify(checkpoint, null, 2));
  return checkpoint;
}

function loadCheckpoint(goalId) {
  const filePath = checkpointPath(goalId);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function deleteCheckpoint(goalId) {
  const filePath = checkpointPath(goalId);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = {
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpoint
};
