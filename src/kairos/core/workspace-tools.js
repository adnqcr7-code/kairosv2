const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { kairosDataDir, ROOT_DIR } = require('./storage');
const { runCommandInConfiguredSandbox } = require('./sandbox');
const { requireApproval, reviewAction, reviewCommand } = require('./safety');
const { logToolEvent } = require('./tool-log');

function safeResolve(targetPath) {
  const resolved = path.resolve(ROOT_DIR, targetPath);
  const roots = [path.resolve(ROOT_DIR), path.resolve(kairosDataDir())];
  if (!roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error(`Path outside approved roots: ${targetPath}`);
  }
  return resolved;
}

function relativeToRoot(filePath) {
  return path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
}

function shouldSkipDir(name) {
  return ['.git', 'node_modules', 'data', 'kk', 'Downloads'].includes(name);
}

function shouldSkipFile(name) {
  return name === '.env'
    || name.endsWith('.log')
    || name.endsWith('.pid')
    || name.endsWith('.zip');
}

function walkFiles(dirPath, options = {}) {
  const maxFiles = options.maxFiles || 500;
  const results = [];
  const stack = [dirPath];

  while (stack.length > 0 && results.length < maxFiles) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!shouldSkipDir(entry.name)) stack.push(fullPath);
      } else if (entry.isFile() && !shouldSkipFile(entry.name)) {
        results.push(fullPath);
        if (results.length >= maxFiles) break;
      }
    }
  }

  return results;
}

function scanProject(targetPath = '.') {
  const root = safeResolve(targetPath);
  if (!fs.existsSync(root)) {
    throw new Error(`Project path not found: ${targetPath}`);
  }
  const files = walkFiles(root, { maxFiles: 1000 });
  const packagePath = path.join(root, 'package.json');
  const packageJson = fs.existsSync(packagePath)
    ? JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    : null;

  const result = {
    root,
    fileCount: files.length,
    scripts: packageJson?.scripts || {},
    dependencies: Object.keys(packageJson?.dependencies || {}),
    devDependencies: Object.keys(packageJson?.devDependencies || {}),
    topFiles: files.slice(0, 50).map(relativeToRoot)
  };
  logToolEvent({ tool: 'project.scan', targetPath, completed: true, fileCount: result.fileCount });
  return result;
}

function searchFiles(query, targetPath = '.') {
  if (!query || query.length < 2) {
    throw new Error('Search query must be at least 2 characters.');
  }

  const root = safeResolve(targetPath);
  if (!fs.existsSync(root)) {
    throw new Error(`Search path not found: ${targetPath}`);
  }
  const files = walkFiles(root, { maxFiles: 1500 });
  const lowerQuery = query.toLowerCase();
  const matches = [];

  for (const filePath of files) {
    const relative = relativeToRoot(filePath);
    if (relative.toLowerCase().includes(lowerQuery)) {
      matches.push({ file: relative, match: 'path' });
      continue;
    }

    const stat = fs.statSync(filePath);
    if (stat.size > 250_000) continue;

    let text = '';
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lineIndex = text.toLowerCase().split(/\r?\n/).findIndex((line) => line.includes(lowerQuery));
    if (lineIndex !== -1) {
      matches.push({ file: relative, line: lineIndex + 1, match: 'content' });
    }

    if (matches.length >= 50) break;
  }

  logToolEvent({ tool: 'files.search', query, targetPath, completed: true, matches: matches.length });
  return matches;
}

function readTextFile(targetPath, options = {}) {
  const resolved = safeResolve(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${targetPath}`);
  }
  const stat = fs.statSync(resolved);
  const maxBytes = options.maxBytes || 80_000;
  if (stat.size > maxBytes) {
    throw new Error(`File is too large to read safely (${stat.size} bytes). Max: ${maxBytes}`);
  }

  const result = {
    path: resolved,
    relativePath: relativeToRoot(resolved),
    content: fs.readFileSync(resolved, 'utf8')
  };
  logToolEvent({ tool: 'files.read', targetPath, completed: true, bytes: result.content.length });
  return result;
}

async function makeDir(targetPath, flags = {}) {
  const resolved = safeResolve(targetPath);
  const review = reviewAction({ kind: 'mkdir', targetPath: resolved });
  if (!await requireApproval(review, flags)) {
    return { completed: false, message: 'Folder creation cancelled.' };
  }

  fs.mkdirSync(resolved, { recursive: true });
  const result = { completed: true, path: resolved, review };
  logToolEvent({ tool: 'files.mkdir', targetPath, completed: true, risk: review.level });
  return result;
}

async function zipPath(sourcePath, outPath, flags = {}) {
  const source = safeResolve(sourcePath);
  const output = safeResolve(outPath);
  const overwrite = fs.existsSync(output);
  const review = reviewAction({ kind: 'zip', source, output, overwrite });
  if (!await requireApproval(review, flags)) {
    return { completed: false, message: 'Zip cancelled.' };
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (overwrite) fs.rmSync(output, { force: true });

  const command = [
    '$ErrorActionPreference = "Stop"',
    `Compress-Archive -LiteralPath ${JSON.stringify(source)} -DestinationPath ${JSON.stringify(output)} -Force`
  ].join('; ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
    encoding: 'utf8',
    cwd: ROOT_DIR
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Compress-Archive failed.');
  }

  const zipResult = { completed: true, source, output, review };
  logToolEvent({ tool: 'package.zip', sourcePath, outPath, completed: true, risk: review.level });
  return zipResult;
}

async function runReviewedCommand(command, flags = {}) {
  const review = reviewCommand(command);
  if (!await requireApproval(review, flags)) {
    const cancelled = { completed: false, message: 'Command cancelled.', review };
    logToolEvent({ tool: 'shell.run', command, completed: false, risk: review.level, cancelled: true });
    return cancelled;
  }

  const result = runCommandInConfiguredSandbox(command, flags);

  const commandResult = {
    completed: result.status === 0,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    sandbox: result.sandbox,
    review
  };
  logToolEvent({
    tool: 'shell.run',
    command,
    completed: commandResult.completed,
    status: commandResult.status,
    risk: review.level,
    sandbox: result.sandbox?.mode || 'host'
  });
  return commandResult;
}

module.exports = {
  makeDir,
  readTextFile,
  runReviewedCommand,
  safeResolve,
  scanProject,
  searchFiles,
  zipPath,
  // Patch/diff helpers exported for tool registry.
  previewPatch,
  applyFilePatch,
  viewPendingPatch
  , stageReplacementPatch
  , discardPendingPatch
};

/*
 * Patch and diff support
 *
 * Kairos exposes a simple patch-based editing mechanism to avoid
 * overwriting entire files when a small change can be applied.
 * Each patch is represented by the full new file contents. A pending
 * patch is staged in memory until the user approves it. The diff
 * generated is a simple line-by-line comparison that marks removed
 * lines with a '-' prefix and added lines with a '+' prefix. Shared
 * lines are shown with a leading space. This is not a unified diff
 * spec but gives enough context for review before applying.
 */

// Holds staged patches keyed by the absolute resolved path.
const _pendingPatches = {};

/**
 * Discard a pending patch without applying it.  Used for dry-run
 * scenarios to avoid leaving stale entries.  If no pending patch
 * exists for the resolved path, this is a no-op.
 * @param {string} targetPath Relative or absolute file path.
 */
function discardPendingPatch(targetPath) {
  try {
    const resolved = safeResolve(targetPath);
    delete _pendingPatches[resolved];
  } catch {
    // ignore invalid paths
  }
}

/**
 * Generate a simple diff for the old and new content.  Each differing
 * line will be prefixed with '-' for deletions or '+' for additions.
 * @param {string} oldContent
 * @param {string} newContent
 */
function _generateSimpleDiff(oldContent = '', newContent = '') {
  const oldLines = String(oldContent).split(/\r?\n/);
  const newLines = String(newContent).split(/\r?\n/);
  const maxLen = Math.max(oldLines.length, newLines.length);
  const diffLines = [];
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === newLine) {
      // Unchanged line: prefix with a space.  Trim trailing whitespace for cleaner output.
      diffLines.push(` ${newLine !== undefined ? newLine : ''}`.trimEnd());
    } else {
      // Removed line(s).
      if (oldLine !== undefined) diffLines.push(`- ${oldLine}`.trimEnd());
      // Added line(s).
      if (newLine !== undefined) diffLines.push(`+ ${newLine}`.trimEnd());
    }
  }
  return diffLines.join('\n');
}

/**
 * Stage a patch for preview.  This function reads the current file
 * content (or an empty string if it does not exist), stores the
 * proposed new content in a pending patches map, and returns a diff
 * preview to the caller.  It does not modify any files on disk.
 * @param {string} targetPath Relative or absolute file path.
 * @param {string} newContent New file content to stage.
 */
function previewPatch(targetPath, newContent) {
  const resolved = safeResolve(targetPath);
  const oldContent = fs.existsSync(resolved) ? fs.readFileSync(resolved, 'utf8') : '';
  // Save pending patch.
  _pendingPatches[resolved] = { oldContent, newContent };
  // Return diff preview.
  const result = {
    path: relativeToRoot(resolved),
    diff: _generateSimpleDiff(oldContent, newContent)
  };
  // Log patch preview separately from the apply step.
  try {
    logToolEvent({ tool: 'files.patch.preview', path: result.path, diffSize: result.diff.length });
  } catch {
    // Ignore logging failures.
  }
  return result;
}

/**
 * Stage a patch by replacing an exact oldText with newText in the file.  Throws
 * if oldText is not found in the current file content.  Uses previewPatch
 * internally to stage and preview the patch.
 * @param {string} targetPath Relative or absolute file path.
 * @param {string} oldText Text to replace exactly.
 * @param {string} newText Replacement text.
 */
function stageReplacementPatch(targetPath, oldText, newText) {
  const resolved = safeResolve(targetPath);
  const oldContent = fs.existsSync(resolved) ? fs.readFileSync(resolved, 'utf8') : '';
  const index = String(oldContent).indexOf(String(oldText));
  if (index === -1) {
    throw new Error(`Old text not found in file: ${targetPath}`);
  }
  // Replace the first occurrence of oldText with newText.
  const newContent = String(oldContent).replace(String(oldText), String(newText));
  return previewPatch(targetPath, newContent);
}

/**
 * Apply a previously staged patch.  Approval will be requested
 * interactively unless flags.yes/proof is supplied.  If approved,
 * writes the new content to disk and removes the pending entry.
 * Logs the event via logToolEvent.
 * @param {string} targetPath
 * @param {object} flags Optional approval flags passed through to requireApproval.
 */
async function applyFilePatch(targetPath, flags = {}) {
  const resolved = safeResolve(targetPath);
  const pending = _pendingPatches[resolved];
  if (!pending) {
    throw new Error(`No pending patch for path: ${targetPath}. Use diff.view first to stage a patch.`);
  }
  const overwrite = fs.existsSync(resolved);
  // Build review object for write/overwrite action.
  const review = reviewAction({ kind: 'write', overwrite });
  // Request approval if necessary.
  const approved = await requireApproval(review, flags);
  if (!approved) {
    // Do not apply, leave patch staged so user can decide later.
    return { completed: false, message: 'Patch cancelled by user.', review };
  }
  // Write new content to file, ensure directory exists.
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, pending.newContent, 'utf8');
  // Remove pending entry.
  delete _pendingPatches[resolved];
  // Log the event.
  logToolEvent({ tool: 'files.patch', path: relativeToRoot(resolved), completed: true, risk: review.level });
  return { completed: true, path: relativeToRoot(resolved), review };
}

/**
 * View the staged patch diff for a file.  If no path is provided,
 * returns all pending diffs.  Does not modify files.
 * @param {string} [targetPath]
 */
function viewPendingPatch(targetPath) {
  // If specific path provided, resolve it and return diff.
  if (targetPath) {
    const resolved = safeResolve(targetPath);
    const pending = _pendingPatches[resolved];
    if (!pending) {
      throw new Error(`No pending patch for path: ${targetPath}. Stage a patch first.`);
    }
    return {
      path: relativeToRoot(resolved),
      diff: _generateSimpleDiff(pending.oldContent, pending.newContent)
    };
  }
  // Otherwise list all pending patches.
  const diffs = [];
  for (const [resolved, { oldContent, newContent }] of Object.entries(_pendingPatches)) {
    diffs.push({
      path: relativeToRoot(resolved),
      diff: _generateSimpleDiff(oldContent, newContent)
    });
  }
  return diffs;
}
