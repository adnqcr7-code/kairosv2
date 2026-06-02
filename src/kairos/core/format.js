function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printScan(scan) {
  console.log('Project Scan');
  console.log(`Root: ${scan.root}`);
  console.log(`Files: ${scan.fileCount}`);
  const scripts = Object.keys(scan.scripts || {});
  console.log(`Scripts: ${scripts.length ? scripts.join(', ') : 'none'}`);
  console.log(`Dependencies: ${scan.dependencies.length}`);
  console.log('');
  console.log('Top files:');
  for (const file of scan.topFiles.slice(0, 15)) {
    console.log(`- ${file}`);
  }
}

function printSearch(matches) {
  if (matches.length === 0) {
    console.log('No matches found.');
    return;
  }

  console.log(`Found ${matches.length} match(es):`);
  for (const match of matches) {
    console.log(`- ${match.file}${match.line ? `:${match.line}` : ''} (${match.match})`);
  }
}

function printToolResult(result) {
  if (result.completed === false) {
    console.log(`Cancelled: ${result.message || 'not completed'}`);
    return;
  }

  console.log('Done.');
  if (result.path) console.log(`Path: ${result.path}`);
  if (result.url) console.log(`URL: ${result.url}`);
  if (result.finalUrl && result.finalUrl !== result.url) console.log(`Final URL: ${result.finalUrl}`);
  if (result.target) console.log(`Target: ${result.target}`);
  if (result.statusCode) console.log(`HTTP: ${result.statusCode}`);
  if (result.output) console.log(`Output: ${result.output}`);
  if (result.stdout) console.log(`Stdout: ${result.stdout.trim()}`);
  if (result.stderr) console.log(`Stderr: ${result.stderr.trim()}`);
  if (result.sandbox) console.log(`Sandbox: ${result.sandbox.mode}`);
  if (result.type) console.log(`Type: ${result.type}`);
  if (result.files) {
    console.log('Files:');
    for (const file of result.files) console.log(`- ${file}`);
  }
  if (result.review) console.log(`Risk: ${result.review.level}`);
}

module.exports = {
  printJson,
  printScan,
  printSearch,
  printToolResult
};
