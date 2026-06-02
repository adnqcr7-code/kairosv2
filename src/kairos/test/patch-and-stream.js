const fs = require('node:fs');
const path = require('node:path');

// Patch and diff test
async function testPatchTools() {
  // Import patch helpers and tool registry.
  const { previewPatch, applyFilePatch, viewPendingPatch } = require('../core/workspace-tools');
  const { getTool } = require('../core/tools');
  // Create a temporary test file inside the root directory.
  const testFile = path.join(process.cwd(), 'tmp-test-file.txt');
  fs.writeFileSync(testFile, 'hello\n', 'utf8');
  try {
    console.log('Running patch preview/apply tests...');
    // Stage a patch that appends a line.
    const newContent = 'hello\nworld\n';
    const preview = previewPatch(testFile, newContent);
    if (!preview.diff.includes('+ world')) {
      throw new Error('Preview diff missing added line');
    }
    // viewPendingPatch should match preview diff.
    const pending = viewPendingPatch(testFile);
    if (pending.diff !== preview.diff) {
      throw new Error('viewPendingPatch diff does not match preview');
    }
    // Also test diff.view via tool registry.
    const diffViewTool = getTool('diff.view');
    const diffOutput = diffViewTool.handler({ path: testFile });
    if (diffOutput.diff !== preview.diff) {
      throw new Error('diff.view handler output mismatch');
    }
    // Apply the patch using approval flags.
    const result = await applyFilePatch(testFile, { yes: true });
    if (!result.completed) {
      throw new Error('applyFilePatch did not complete');
    }
    const contentAfter = fs.readFileSync(testFile, 'utf8');
    if (contentAfter !== newContent) {
      throw new Error('File content mismatch after patch');
    }
    // Pending patch should be removed now; viewPendingPatch should throw.
    let removed = false;
    try {
      viewPendingPatch(testFile);
    } catch {
      removed = true;
    }
    if (!removed) {
      throw new Error('Pending patch not cleared after apply');
    }
    console.log('Patch tool tests passed.');
  } finally {
    // Clean up the temporary file.
    try { fs.unlinkSync(testFile); } catch {}
  }
}

// Streaming test for Ollama using a mock server that streams JSON lines.
async function testStreamingOllama() {
  console.log('Running streaming Ollama mock test...');
  const http = require('node:http');
  // Create a mock streaming server.
  const createServer = () => new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/api/chat' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        // First chunk: part of the message.
        res.write(JSON.stringify({ message: { content: 'Hello ' } }) + '\n');
        // Second chunk after slight delay.
        setTimeout(() => {
          res.write(JSON.stringify({ message: { content: 'world' } }) + '\n');
          res.end();
        }, 10);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });

  const { server, port } = await createServer();
  // Save previous provider configuration so we can restore it after the test.
  const prevProvider = process.env.KAIROS_PROVIDER;
  const prevBaseUrl = process.env.KAIROS_OLLAMA_BASE_URL;
  const prevModel = process.env.KAIROS_OLLAMA_MODEL;
  // Set up environment variables for Ollama provider.
  process.env.KAIROS_PROVIDER = 'ollama';
  process.env.KAIROS_OLLAMA_BASE_URL = `http://localhost:${port}`;
  process.env.KAIROS_OLLAMA_MODEL = 'test-model';
  // Import askBrain after setting env vars so providerStatus uses the new values.
  const { askBrain } = require('../core/brain');
  const tokens = [];
  const reply = await askBrain('Test streaming', [], (token) => tokens.push(token));
  // Combine tokens and trim whitespace.
  const combined = tokens.join('');
  if (combined.trim() !== 'Hello world') {
    throw new Error(`Streaming tokens mismatch: ${combined}`);
  }
  if (reply.trim() !== 'Hello world') {
    throw new Error(`Streaming reply mismatch: ${reply}`);
  }
  // Ensure the server is fully closed before finishing.  Use a promise
  // so that any pending connections are cleaned up.  Without awaiting
  // server.close(), the event loop can remain open and cause test hangs.
  await new Promise((resolve) => server.close(resolve));
  // Restore previous environment variables.
  if (prevProvider === undefined) delete process.env.KAIROS_PROVIDER; else process.env.KAIROS_PROVIDER = prevProvider;
  if (prevBaseUrl === undefined) delete process.env.KAIROS_OLLAMA_BASE_URL; else process.env.KAIROS_OLLAMA_BASE_URL = prevBaseUrl;
  if (prevModel === undefined) delete process.env.KAIROS_OLLAMA_MODEL; else process.env.KAIROS_OLLAMA_MODEL = prevModel;
  console.log('Streaming Ollama test passed.');
}

// Run tests sequentially.
async function run() {
  await testPatchTools();
  await testStreamingOllama();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});