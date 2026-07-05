#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const androidDir = path.join(projectRoot, "android");
const localPropertiesPath = path.join(androidDir, "local.properties");
const candidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(os.homedir(), "Library", "Android", "sdk"),
  path.join(os.homedir(), "Android", "Sdk"),
];

const sdkPath = candidates.find((candidate) => {
  if (!candidate) return false;

  return fs.existsSync(path.join(candidate, "platforms"))
    || fs.existsSync(path.join(candidate, "cmdline-tools"))
    || fs.existsSync(path.join(candidate, "platform-tools"));
});

if (!sdkPath) {
  console.error(`
Android SDK not found.

Install Android Studio, then open it once and install:
- Android SDK Platform
- Android SDK Platform-Tools
- Android SDK Build-Tools

On macOS Android Studio usually creates:
${path.join(os.homedir(), "Library", "Android", "sdk")}

After install, either rerun this command or set:
export ANDROID_HOME="${path.join(os.homedir(), "Library", "Android", "sdk")}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
`);
  process.exit(1);
}

const escapedSdkPath = sdkPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
const nextContent = `sdk.dir=${escapedSdkPath}\n`;

if (!fs.existsSync(localPropertiesPath) || fs.readFileSync(localPropertiesPath, "utf8") !== nextContent) {
  fs.writeFileSync(localPropertiesPath, nextContent);
}

console.log(`Android SDK found: ${sdkPath}`);
