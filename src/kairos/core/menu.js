const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { buildTemplate } = require('./builder');
const { printDoctor, runDoctor } = require('./doctor');
const { runChat } = require('./chat');
const { createGoal, listGoals } = require('./goal-manager');
const { loadMemory, memoryPath, setMemoryValue } = require('./memory');
const { providerStatus } = require('./providers');
const { BANNER, runSetup } = require('./setup');
const { searchSkills } = require('./skills');
const { readRecentToolEvents } = require('./tool-log');
const { listTools } = require('./tools');
const { readTextFile, runReviewedCommand, scanProject, searchFiles, zipPath } = require('./workspace-tools');

function printHeader() {
  const provider = providerStatus();
  console.log(BANNER);
  console.log('Kairos - local-first coding agent');
  console.log(`Brain: ${provider.id === 'offline' ? 'not configured' : provider.label}`);
  console.log(`Memory: ${memoryPath()}`);
  console.log('');
  console.log('No AI brain means Kairos can manage goals, tools, memory, and skills,');
  console.log('but chat/reasoning needs Ollama, OpenAI, Kimi, OpenRouter, or another provider.');
  console.log('');
}

function printMenu() {
  console.log('Main menu');
  console.log('1. First-run setup');
  console.log('2. AI Brain Chat');
  console.log('3. Doctor health check');
  console.log('4. New /goal');
  console.log('5. Show goals');
  console.log('6. Search skills');
  console.log('7. Show tools');
  console.log('8. Scan project');
  console.log('9. Search files');
  console.log('10. Read file');
  console.log('11. Package zip');
  console.log('12. Run reviewed command');
  console.log('13. Build starter project');
  console.log('14. Show logs');
  console.log('15. Show memory');
  console.log('16. Add memory note');
  console.log('17. Exit');
  console.log('');
}

async function runMenu() {
  const rl = readline.createInterface({ input, output });
  try {
    printHeader();
    printMenu();

    const choice = (await rl.question('Choose [1-17]: ')).trim() || '17';
    console.log('');

    if (choice === '1') {
      rl.close();
      const result = await runSetup({});
      if (result.completed) {
        console.log('Setup complete.');
        console.log(`Brain: ${result.provider.id === 'offline' ? 'not configured' : result.provider.id}`);
        console.log(`Memory: ${result.memoryPath}`);
        if (result.provider.id !== 'offline' && result.health?.ok) {
          await runChat();
        }
      } else {
        console.log(result.message);
      }
      return;
    }

    if (choice === '2') {
      rl.close();
      await runChat();
      return;
    }

    if (choice === '3') {
      printDoctor(await runDoctor());
      return;
    }

    if (choice === '4') {
      const title = await rl.question('Goal: ');
      const budgetMode = (await rl.question('Budget cheap/balanced/best (cheap): ')).trim() || 'cheap';
      const approvalMode = (await rl.question('Approval step/auto-safe/manual (step): ')).trim() || 'step';
      const goal = createGoal({ title, budgetMode, approvalMode });
      console.log(goal.warning);
      console.log('');
      console.log(`Saved: ${goal.id}`);
      console.log(`Run: npm.cmd run kairos -- approve ${goal.id}`);
      return;
    }

    if (choice === '5') {
      const goals = listGoals();
      if (goals.length === 0) console.log('No goals yet.');
      for (const goal of goals) {
        console.log(`${goal.id} | ${goal.status} | ${goal.title}`);
      }
      return;
    }

    if (choice === '6') {
      const query = await rl.question('Skill search: ');
      for (const skill of searchSkills(query)) {
        console.log(`${skill.id} | score=${skill.score} | ${skill.title}`);
      }
      return;
    }

    if (choice === '7') {
      for (const tool of listTools()) {
        console.log(`${tool.id} | ${tool.status} | ${tool.description}`);
      }
      return;
    }

    if (choice === '8') {
      const targetPath = (await rl.question('Project path (.): ')).trim() || '.';
      console.log(JSON.stringify(scanProject(targetPath), null, 2));
      return;
    }

    if (choice === '9') {
      const query = await rl.question('Search query: ');
      const targetPath = (await rl.question('Path (.): ')).trim() || '.';
      console.log(JSON.stringify(searchFiles(query, targetPath), null, 2));
      return;
    }

    if (choice === '10') {
      const targetPath = await rl.question('File path: ');
      console.log(readTextFile(targetPath).content);
      return;
    }

    if (choice === '11') {
      const sourcePath = await rl.question('Source path: ');
      const outPath = await rl.question('Zip output path: ');
      console.log(JSON.stringify(await zipPath(sourcePath, outPath), null, 2));
      return;
    }

    if (choice === '12') {
      const command = await rl.question('PowerShell command: ');
      console.log(JSON.stringify(await runReviewedCommand(command), null, 2));
      return;
    }

    if (choice === '13') {
      const type = (await rl.question('Template node-cli/discord-bot: ')).trim();
      const targetPath = (await rl.question('Target folder: ')).trim();
      console.log(JSON.stringify(await buildTemplate({ type, targetPath, flags: {} }), null, 2));
      return;
    }

    if (choice === '14') {
      console.log(JSON.stringify(readRecentToolEvents(), null, 2));
      return;
    }

    if (choice === '15') {
      console.log(JSON.stringify(loadMemory(), null, 2));
      return;
    }

    if (choice === '16') {
      const note = await rl.question('Memory note: ');
      console.log(JSON.stringify(setMemoryValue('note', note), null, 2));
      return;
    }

    console.log('Bye.');
  } finally {
    rl.close();
  }
}

module.exports = {
  runMenu
};
