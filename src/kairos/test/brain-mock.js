const http = require('node:http');
const assert = require('node:assert/strict');

// Import askBrain and helpers from brain.js.  We rely only on the public
// askBrain API because individual provider helpers such as askOllama
// are intentionally not exported.  The provider selection logic in
// askBrain looks at KAIROS_PROVIDER and related environment variables
// to determine which internal helper to call.
const { askBrain, resetSessionCost } = require('../core/brain');

/**
 * Helper to start a simple mock HTTP server for testing provider
 * interactions.  The handler callback receives the parsed request body
 * (parsed from JSON) and may return an object to be sent back as the
 * JSON response.  If the callback throws, the server will respond
 * with a 500 status and the thrown error message.  If the callback
 * returns undefined, the server will send an empty 204 response.
 *
 * The returned object includes the server instance and the port in
 * use.  Call `close()` on the server when finished.
 *
 * @param {(body: any) => any} handler
 */
function createMockProviderServer(handler) {
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      let body;
      try {
        body = data ? JSON.parse(data) : null;
      } catch (err) {
        // Malformed JSON in request should not crash the mock server
        body = null;
      }
      try {
        const result = handler(body);
        if (result === undefined) {
          res.writeHead(204);
          return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(String(err.message || err));
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function testSuccessResponse() {
  // Create a mock server that returns a successful chat response
  const { server, port } = await createMockProviderServer(() => {
    return { message: { content: 'mock reply' } };
  });

  try {
    // Configure environment to use the mock Ollama provider
    process.env.KAIROS_PROVIDER = 'ollama';
    process.env.KAIROS_OLLAMA_BASE_URL = `http://localhost:${port}`;
    process.env.KAIROS_OLLAMA_MODEL = 'test-model';

    // Reset any previous session cost
    resetSessionCost();

    const reply = await askBrain('Hello world', []);
    assert.equal(reply, 'mock reply', 'askBrain should return the content from the mock provider');
  } finally {
    server.close();
  }
}

async function testFailureResponse() {
  // Create a mock server that always fails with HTTP 500
  const { server, port } = await createMockProviderServer(() => {
    throw new Error('mock failure');
  });
  try {
    process.env.KAIROS_PROVIDER = 'ollama';
    process.env.KAIROS_OLLAMA_BASE_URL = `http://localhost:${port}`;
    process.env.KAIROS_OLLAMA_MODEL = 'test-model';
    resetSessionCost();
    const reply = await askBrain('Test failure', []);
    // When the provider returns an error, askBrain should return a
    // human-readable error message rather than crashing.  It should
    // include the word "failed" to indicate that the call failed.
    assert.ok(
      /call failed/i.test(reply),
      `Expected askBrain to include 'call failed' in the error message, got: ${reply}`
    );
  } finally {
    server.close();
  }
}

async function testMalformedResponse() {
  // Create a mock server that returns invalid JSON.  We deliberately
  // send a malformed JSON string so that JSON.parse will throw when
  // askBrain attempts to parse the response.
  const { server, port } = await createMockProviderServer(() => {
    return undefined; // We will override the default to send an invalid payload below
  });
  try {
    process.env.KAIROS_PROVIDER = 'ollama';
    process.env.KAIROS_OLLAMA_BASE_URL = `http://localhost:${port}`;
    process.env.KAIROS_OLLAMA_MODEL = 'test-model';
    resetSessionCost();
    // Override the server's response handler to send a literal string
    // containing invalid JSON.  We cannot pass this directly through
    // createMockProviderServer because it wraps the return value with
    // JSON.stringify; instead we write directly to the response here.
    const originalListener = server.listeners('request')[0];
    server.removeAllListeners('request');
    server.on('request', (req, res) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{ invalid json');
      });
    });
    const reply = await askBrain('Test malformed', []);
    // askBrain should detect that the response body is not valid JSON
    // and return a generic invalid JSON message.
    assert.ok(
      /invalid json/i.test(reply),
      `Expected askBrain to indicate invalid JSON, got: ${reply}`
    );
  } finally {
    server.close();
  }
}

async function run() {
  await testSuccessResponse();
  await testFailureResponse();
  await testMalformedResponse();
  console.log('Mock provider tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});