const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");

for (const [name, command, status] of [
  ["failed build", "exit 23", 23],
  ["terminated build", "kill -TERM \"$PPID\"; exit 143", 143],
]) {
  test(`temporary Next config restored byte-for-byte after ${name}`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "partner-sso-config-test."));
    try {
      const scripts = path.join(root, "tests/partner-sso");
      fs.mkdirSync(scripts, { recursive: true });
      fs.mkdirSync(path.join(root, "src/app/api"), { recursive: true });
      fs.mkdirSync(path.join(root, "temp"));
      fs.mkdirSync(path.join(root, "bin"));
      for (const file of ["frontend-smoke.sh", "build-config.cjs", "authority-route.ts"]) {
        fs.copyFileSync(path.join(__dirname, file), path.join(scripts, file));
      }
      const original = Buffer.from("export default { output: 'standalone', poweredByHeader: false };\n");
      const config = path.join(root, "next.config.mjs");
      fs.writeFileSync(config, original);
      fs.writeFileSync(path.join(root, "bin/npm"), `#!/bin/bash\n${command}\n`, { mode: 0o755 });
      const result = spawnSync("bash", [path.join(scripts, "frontend-smoke.sh")], {
        env: { ...process.env, GITHUB_ACTIONS: "true", RUNNER_TEMP: path.join(root, "temp"), PATH: `${path.join(root, "bin")}:${process.env.PATH}` },
        encoding: "utf8",
      });
      assert.equal(result.status, status, result.stderr);
      assert.deepEqual(fs.readFileSync(config), original);
      assert.equal(fs.existsSync(path.join(root, "src/app/api/partner-e2e-authority")), false);
      assert.deepEqual(fs.readdirSync(path.join(root, "temp")), []);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
