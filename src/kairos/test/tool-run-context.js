const fs = require('node:fs');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');

// Helper to run the CLI in a separate process.  Returns an object with
// stdout, stderr and exitCode.  Arguments should exclude the initial
// 'node' as this function inserts it automatically.
function runCli(args, options = {}) {
  // Add a timeout to avoid hanging tests.  Default timeout is 5000ms.
  const timeout = options.timeout || 5000;
  const result = spawnSync('node', [path.join(__dirname, '../cli.js'), ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env },
    timeout,
    ...options
  });
  // If the process timed out, spawnSync sets error and status undefined.
  if (result.error && result.error.code === 'ETIMEDOUT') {
    throw new Error(`CLI command timed out after ${timeout}ms: ${args.join(' ')}`);
  }
  return result;
}

async function testToolsRunDiffView() {
  console.log('Testing tools run diff.view...');
  // Run diff.view via the CLI without any staged patch.  Expect an error about no pending patch.
  const testFile = path.join(process.cwd(), 'tmp-tool-run-diff.txt');
  fs.writeFileSync(testFile, 'foo\n', 'utf8');
  const paramJson = JSON.stringify({ path: testFile.replace(/\\/g, '/') });
  const res = runCli(['tools', 'run', 'diff.view', '--json', paramJson]);
  fs.unlinkSync(testFile);
  // The command should exit with error code and stderr should mention no pending patch.
  if (res.status === 0) {
    throw new Error('tools run diff.view without staged patch should fail');
  }
  if (!res.stderr.includes('No pending patch')) {
    throw new Error(`diff.view error message unexpected: ${res.stderr}`);
  }
}

async function testFilesPatchReplacement() {
  console.log('Testing files.patch replacement...');
  // Create a temp file with simple content.
  const testFile = path.join(process.cwd(), 'tmp-patch-replace.txt');
  fs.writeFileSync(testFile, 'Hello world', 'utf8');
  // Run CLI to replace 'world' with 'Kairos'.
  const res = runCli(['files', 'patch', testFile.replace(/\\/g, '/'), '--old', 'world', '--new', 'Kairos', '--yes']);
  if (res.status !== 0) {
    throw new Error(`files patch replacement CLI failed: ${res.stderr}`);
  }
  const content = fs.readFileSync(testFile, 'utf8');
  if (content !== 'Hello Kairos') {
    throw new Error(`Replacement patch did not apply correctly: ${content}`);
  }
  fs.unlinkSync(testFile);
}

async function testFilesPatchReplacementFail() {
  console.log('Testing files.patch replacement failure...');
  const testFile = path.join(process.cwd(), 'tmp-patch-fail.txt');
  fs.writeFileSync(testFile, 'Alpha Beta', 'utf8');
  // Attempt to replace text that does not exist; expect non-zero exit.
  const res = runCli(['files', 'patch', testFile.replace(/\\/g, '/'), '--old', 'Gamma', '--new', 'Delta', '--yes']);
  // Clean up
  fs.unlinkSync(testFile);
  if (res.status === 0) {
    throw new Error('files patch replacement should have failed when old text not found');
  }
  // Stderr should mention not found.
  if (!res.stderr.includes('not found')) {
    throw new Error(`files patch failure did not mention not found: ${res.stderr}`);
  }
}

async function testStreamingHttpError() {
  console.log('Testing streaming HTTP error handling...');
  const http = require('node:http');
  // Create a server that returns 500 for /api/chat
  const createServer = () => new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/api/chat' && req.method === 'POST') {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, () => {
      resolve({ server, port: server.address().port });
    });
  });
  const { server, port } = await createServer();
  // Save previous provider configuration so we can restore it after the test.
  const prevProvider = process.env.KAIROS_PROVIDER;
  const prevBaseUrl = process.env.KAIROS_OLLAMA_BASE_URL;
  const prevModel = process.env.KAIROS_OLLAMA_MODEL;
  process.env.KAIROS_PROVIDER = 'ollama';
  process.env.KAIROS_OLLAMA_BASE_URL = `http://localhost:${port}`;
  process.env.KAIROS_OLLAMA_MODEL = 'test-model';
  const { askBrain } = require('../core/brain');
  const result = await askBrain('Test error', [], (t) => {});
  // Ensure the test HTTP server closes completely before finishing.
  await new Promise((resolve) => server.close(resolve));
  // Restore environment variables to their prior state.
  if (prevProvider === undefined) delete process.env.KAIROS_PROVIDER; else process.env.KAIROS_PROVIDER = prevProvider;
  if (prevBaseUrl === undefined) delete process.env.KAIROS_OLLAMA_BASE_URL; else process.env.KAIROS_OLLAMA_BASE_URL = prevBaseUrl;
  if (prevModel === undefined) delete process.env.KAIROS_OLLAMA_MODEL; else process.env.KAIROS_OLLAMA_MODEL = prevModel;
  if (!result.includes('HTTP')) {
    throw new Error(`Streaming HTTP error did not include status code: ${result}`);
  }
}

async function testContextBuildFlags() {
  console.log('Testing context build flags...');
  const { buildContextIndex, contextIndexPath } = require('../core/context-index');
  // Build compact index with limited chunks.
  const summary1 = buildContextIndex({ project: false, compact: true, maxChunksPerSource: 1 });
  if (!summary1 || !summary1.documents) {
    throw new Error('Context build flags summary is invalid');
  }
  // Build incrementally: should return a summary object.
  const summary2 = buildContextIndex({ project: false, compact: true, incremental: true, maxChunksPerSource: 1 });
  if (!summary2 || !summary2.documents) {
    throw new Error('Context build incremental flags summary is invalid');
  }
  // The number of documents should be the same or less when using incremental.
  if (summary2.documents !== summary1.documents) {
    throw new Error('Incremental context build produced different document count');
  }
}

async function run() {
  await testToolsRunDiffView();
  await testFilesPatchReplacement();
  await testFilesPatchReplacementFail();
  await testStreamingHttpError();
  await testContextBuildFlags();
  console.log('New tool/context tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});