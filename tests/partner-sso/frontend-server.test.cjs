const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const { start } = require("./frontend-server.cjs");

function get(port, headers) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: "/api/partner-e2e-authority", headers }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body }));
    }).on("error", reject);
  });
}

test("real Next route canonical authority matches each fixed external HTTPS host", async () => {
  // Each invocation runs in its own process, as the hosted harness does.
  const host = process.env.TEST_FRONTEND_HOST;
  assert.ok(["product-a.example.com", "product-b.example.com"].includes(host));
  const port = host === "product-a.example.com" ? 3000 : 3001;
  const { server, app } = await start(host, require("next"));
  try {
    const valid = await get(port, { host, "x-forwarded-proto": "https" });
    assert.equal(valid.status, 200);
    const authority = JSON.parse(valid.body);
    console.log(`Next canonical authority: ${JSON.stringify(authority)}`);
    assert.deepEqual(authority, { urlHost: host, headerHost: host, protocol: "https:" });
    assert.equal((await get(port, { host: "untrusted.example.com", "x-forwarded-proto": "https" })).status, 421);
    assert.equal((await get(port, { host, "x-forwarded-proto": "http" })).status, 421);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await app.close();
  }
});
