const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

const port = 3201;
const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (chunk) => { output += chunk; });
server.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/config`);
      if (response.ok) return;
    } catch {
      // A API ainda está sendo iniciada.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`O servidor não iniciou. Saída: ${output}`);
}

test.before(async () => await waitForServer());
test.after(() => server.kill());

test("o servidor mostra o endereço local clicável", () => {
  assert.match(output, /http:\/\/localhost:3201/);
});

test("a configuração do Google Calendar expõe somente dados públicos e o escopo correto", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/google/config`);
  assert.equal(response.status, 200);
  const configuration = await response.json();
  assert.equal(configuration.clientId, "test-client-id.apps.googleusercontent.com");
  assert.equal(configuration.scope, "https://www.googleapis.com/auth/calendar.events");
  assert.equal(configuration.calendarApiUrl, "https://www.googleapis.com/calendar/v3/calendars/primary/events");
  assert.equal(configuration.clientSecret, undefined);
});

test("o endpoint existente continua entregando o Client ID público", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/config`);
  assert.equal(response.status, 200);
  const configuration = await response.json();
  assert.equal(configuration.googleClientId, "test-client-id.apps.googleusercontent.com");
});

test("o endpoint de aspiração integra ZenQuotes com quote e author", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/quote`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(typeof data.quote, "string");
  assert.ok(data.quote.length > 0);
  assert.equal(typeof data.author, "string");
  assert.ok(data.author.length > 0);
  assert.equal(data.source, "ZenQuotes");
});
