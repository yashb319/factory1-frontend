const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "*.spec.cjs",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "line",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results",
  use: {
    browserName: "chromium",
    ignoreHTTPSErrors: false,
    trace: "off",
    screenshot: "off",
    video: "off",
    launchOptions: { args: ["--no-proxy-server"] },
  },
});
