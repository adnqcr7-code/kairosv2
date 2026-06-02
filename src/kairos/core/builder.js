const fs = require('node:fs');
const path = require('node:path');
const { reviewAction, requireApproval } = require('./safety');
const { logToolEvent } = require('./tool-log');
const { safeResolve } = require('./workspace-tools');
const { addBuild, addProject } = require('./memory');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function hasFiles(dirPath) {
  return fs.existsSync(dirPath) && fs.readdirSync(dirPath).length > 0;
}

function nodeCliFiles(name) {
  return {
    'package.json': JSON.stringify({
      name,
      version: '0.1.0',
      description: 'Kairos-generated Node.js CLI app.',
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        check: 'node --check src/index.js'
      },
      engines: {
        node: '>=20'
      }
    }, null, 2),
    'README.md': `# ${name}\n\nKairos-generated Node.js CLI starter.\n\n## Run\n\n\`\`\`powershell\nnpm.cmd run check\nnpm.cmd start\n\`\`\`\n`,
    'src/index.js': [
      "console.log('Hello from Kairos-generated CLI.');",
      ''
    ].join('\n')
  };
}

function discordBotFiles(name) {
  return {
    'package.json': JSON.stringify({
      name,
      version: '0.1.0',
      description: 'Kairos-generated Discord.js bot starter.',
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        check: 'node --check src/index.js'
      },
      dependencies: {
        'discord.js': '^14.16.3',
        dotenv: '^16.4.5'
      },
      engines: {
        node: '>=20'
      }
    }, null, 2),
    '.env.example': [
      'DISCORD_TOKEN=',
      'CLIENT_ID=',
      'GUILD_ID=',
      ''
    ].join('\n'),
    'README.md': `# ${name}\n\nKairos-generated Discord bot starter.\n\n## Setup\n\n\`\`\`powershell\nnpm.cmd install\nCopy-Item .env.example .env\nnpm.cmd run check\nnpm.cmd start\n\`\`\`\n\nNever commit your real bot token.\n`,
    'src/index.js': [
      "require('dotenv').config();",
      "const { Client, GatewayIntentBits } = require('discord.js');",
      '',
      "const token = process.env.DISCORD_TOKEN;",
      "if (!token) {",
      "  throw new Error('Missing DISCORD_TOKEN in .env');",
      '}',
      '',
      'const client = new Client({ intents: [GatewayIntentBits.Guilds] });',
      '',
      "client.once('clientReady', () => {",
      "  console.log(`Bot online as ${client.user.tag}`);",
      '});',
      '',
      'client.login(token);',
      ''
    ].join('\n')
  };
}

function templateFiles(type, name) {
  if (type === 'node-cli') return nodeCliFiles(name);
  if (type === 'discord-bot') return discordBotFiles(name);
  throw new Error(`Unknown template: ${type}. Use node-cli or discord-bot.`);
}

async function buildTemplate({ type, targetPath, flags = {} }) {
  const resolved = safeResolve(targetPath);
  const name = path.basename(resolved).toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'kairos-app';
  const overwrite = hasFiles(resolved);
  if (overwrite && !flags.force) {
    return {
      completed: false,
      message: `Target folder already has files: ${resolved}. Re-run with --force if you really want to write template files there.`
    };
  }

  const review = reviewAction({ kind: 'template', targetPath: resolved, overwrite });
  if (!await requireApproval(review, flags)) {
    return { completed: false, message: 'Template creation cancelled.', review };
  }

  const files = templateFiles(type, name);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(resolved, relativePath);
    if (fs.existsSync(filePath) && !flags.force) continue;
    writeFile(filePath, `${content.replace(/\s+$/g, '')}\n`);
  }

  const result = {
    completed: true,
    type,
    path: resolved,
    files: Object.keys(files),
    review
  };
  addProject({ name, path: targetPath, type, status: 'generated' });
  addBuild({ type, path: targetPath, files: Object.keys(files) });
  logToolEvent({ tool: 'project.build', type, targetPath, completed: true, risk: review.level });
  return result;
}

module.exports = {
  buildTemplate
};
