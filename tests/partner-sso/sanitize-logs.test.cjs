const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const path = require("node:path");

test("diagnostics retain startup errors but redact credentials and OAuth material", () => {
  const opaque = "abcdefghijklmnopqrstuvwxyz0123456789";
  const result = spawnSync(process.execPath, [path.join(__dirname, "sanitize-logs.cjs")], {
    input: [
      "java.nio.file.AccessDeniedException: /home/runner",
      `Authorization: Basic ${opaque}`,
      `password=${opaque}`,
      `GET /auth/callback?code=${opaque}&state=${opaque}`,
      `opaque handle ${opaque}`,
      "-----BEGIN PRIVATE KEY-----",
    ].join("\n"),
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes("AccessDeniedException: /home/runner"));
  assert.ok(result.stdout.includes("code=[redacted]&state=[redacted]"));
  assert.ok(!result.stdout.includes(opaque));
  assert.ok(!result.stdout.includes("BEGIN PRIVATE KEY"));
  assert.ok(!result.stdout.includes("Authorization: Basic"));
});
