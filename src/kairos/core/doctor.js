const { loadMemory, memoryPath } = require('./memory');
const { checkProvider } = require('./provider-health');
const { providerStatus } = require('./providers');
const { readRecentToolEvents } = require('./tool-log');
const { scanProject } = require('./workspace-tools');

async function runDoctor() {
  const provider = providerStatus();
  const health = await checkProvider(provider.id);
  const memory = loadMemory();
  const scan = scanProject('.');
  const logs = readRecentToolEvents(5);

  return {
    brain: {
      provider: provider.id,
      label: provider.label,
      ready: health.ok,
      message: health.message
    },
    memory: {
      path: memoryPath(),
      notes: memory.notes.length,
      projects: memory.projects.length,
      builds: memory.builds.length
    },
    project: {
      root: scan.root,
      files: scan.fileCount,
      scripts: Object.keys(scan.scripts)
    },
    recentTools: logs.map((event) => ({
      at: event.at,
      tool: event.tool,
      completed: event.completed
    }))
  };
}

function printDoctor(report) {
  console.log('Kairos Doctor');
  console.log('');
  console.log(`Brain: ${report.brain.provider} - ${report.brain.ready ? 'ready' : 'not ready'}`);
  console.log(`Brain check: ${report.brain.message}`);
  console.log(`Memory: ${report.memory.path}`);
  console.log(`Memory items: ${report.memory.notes} notes, ${report.memory.projects} projects, ${report.memory.builds} builds`);
  console.log(`Project files: ${report.project.files}`);
  console.log(`Scripts: ${report.project.scripts.length ? report.project.scripts.join(', ') : 'none'}`);
  console.log('');
  console.log('Recent tools:');
  if (report.recentTools.length === 0) {
    console.log('- none yet');
  } else {
    for (const event of report.recentTools) {
      console.log(`- ${event.tool} | ${event.completed ? 'done' : 'not completed'} | ${event.at}`);
    }
  }
}

module.exports = {
  printDoctor,
  runDoctor
};
