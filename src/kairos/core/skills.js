const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ROOT_DIR } = require('./paths');

const DEFAULT_SKILLS_DIR = path.join(os.homedir(), 'Downloads', 'AI Skills Folder', 'ai-skills');
const BUNDLED_SKILLS_DIR = path.join(ROOT_DIR, 'ai-skills');
const SKILL_ID_PATTERN = /^[a-z0-9-]+:[a-z0-9-]+$/;

function skillsRoot() {
  if (process.env.KAIROS_SKILLS_DIR) return process.env.KAIROS_SKILLS_DIR;
  if (fs.existsSync(BUNDLED_SKILLS_DIR)) return BUNDLED_SKILLS_DIR;
  if (fs.existsSync(path.join(ROOT_DIR, '23-agent-engineering'))) return ROOT_DIR;
  return DEFAULT_SKILLS_DIR;
}

function isInside(parentDir, childPath) {
  const parent = path.resolve(parentDir);
  const child = path.resolve(childPath);
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

function walkMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  const files = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function readSection(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return '';

  const chunk = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) break;
    const line = lines[index].trim();
    if (line) chunk.push(line);
  }

  return chunk.join(' ');
}

function parseSkill(filePath, rootDir) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const titleLine = lines.find((line) => line.startsWith('# ')) || '# Untitled Skill';
  const category = path.basename(path.dirname(filePath));
  const slug = path.basename(filePath, '.md');

  return {
    id: `${category}:${slug}`,
    title: titleLine.replace(/^#\s+/, '').trim(),
    category,
    slug,
    path: filePath,
    relativePath: path.relative(rootDir, filePath),
    role: readSection(lines, 'Role Definition'),
    expertise: readSection(lines, 'Expertise Level'),
    whenToActivate: readSection(lines, 'When to Activate') || readSection(lines, 'Best Used For')
  };
}

function isSkillFile(filePath) {
  const category = path.basename(path.dirname(filePath));
  return /^\d{2}-[a-z0-9-]+$/.test(category);
}

function listSkills() {
  const rootDir = skillsRoot();
  if (!fs.existsSync(rootDir)) {
    return {
      rootDir,
      skills: [],
      warning: `Skills folder not found: ${rootDir}`
    };
  }

  const skills = walkMarkdownFiles(rootDir)
    .filter(isSkillFile)
    .filter((filePath) => isInside(rootDir, filePath))
    .map((filePath) => parseSkill(filePath, rootDir))
    .sort((a, b) => a.id.localeCompare(b.id));

  return { rootDir, skills };
}

function getSkill(skillId) {
  if (!SKILL_ID_PATTERN.test(skillId)) {
    throw new Error(`Invalid skill id: ${skillId}. Use format category:skill-name`);
  }

  const { rootDir, skills } = listSkills();
  const skill = skills.find((candidate) => candidate.id === skillId);
  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  if (!isInside(rootDir, skill.path)) {
    throw new Error(`Skill path escaped skills directory: ${skillId}`);
  }

  return {
    ...skill,
    content: fs.readFileSync(skill.path, 'utf8')
  };
}

function getSkillContent(skillId) {
  const skill = getSkill(skillId);
  return skill.content;
}

function queryWords(query) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
}

function scoreSkill(skill, query) {
  const words = queryWords(query);
  if (words.length === 0) return 0;

  const normalizedQuery = words.join(' ');
  const title = skill.title.toLowerCase();
  const slug = skill.slug.replace(/-/g, ' ').toLowerCase();
  const id = skill.id.replace(/[:-]/g, ' ').toLowerCase();
  const role = skill.role.toLowerCase();
  const whenToActivate = skill.whenToActivate.toLowerCase();

  let score = 0;
  if (title.includes(normalizedQuery)) score += 8;
  if (slug.includes(normalizedQuery)) score += 7;
  if (id.includes(normalizedQuery)) score += 5;

  for (const word of words) {
    if (title.includes(word)) score += 4;
    if (slug.includes(word)) score += 4;
    if (id.includes(word)) score += 3;
    if (role.includes(word)) score += 2;
    if (whenToActivate.includes(word)) score += 1;
  }

  return score;
}

function searchSkills(query, limit = 10) {
  return listSkills()
    .skills.map((skill) => ({
      ...skill,
      score: scoreSkill(skill, query)
    }))
    .filter((skill) => skill.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function suggestSkillsForGoal(title, limit = 5) {
  const words = new Set(
    queryWords(title)
  );

  if (words.size === 0) return [];

  return searchSkills(title, limit)
    .map(({ score, ...skill }) => skill);
}

module.exports = {
  DEFAULT_SKILLS_DIR,
  getSkill,
  getSkillContent,
  listSkills,
  searchSkills,
  suggestSkillsForGoal
};
