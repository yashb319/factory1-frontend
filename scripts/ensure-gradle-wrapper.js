#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const wrapperPropertiesPath = path.join(
  __dirname,
  "..",
  "android",
  "gradle",
  "wrapper",
  "gradle-wrapper.properties"
);

const properties = fs.readFileSync(wrapperPropertiesPath, "utf8");
const distributionUrl = readProperty(properties, "distributionUrl").replace(
  /\\:/g,
  ":"
);
const fileName = path.basename(distributionUrl);
const distributionName = fileName.replace(/\.zip$/, "");
const gradleUserHome = process.env.GRADLE_USER_HOME || path.join(os.homedir(), ".gradle");
const wrapperDir = path.join(gradleUserHome, "wrapper", "dists", distributionName);
const cacheKey = gradleCacheKey(distributionUrl);
const cacheDir = path.join(wrapperDir, cacheKey);
const zipPath = path.join(cacheDir, fileName);
const partPath = `${zipPath}.part`;
const lockPath = `${zipPath}.lck`;

fs.mkdirSync(cacheDir, { recursive: true });

if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 0) {
  console.log(`Gradle wrapper distribution already cached: ${zipPath}`);
  process.exit(0);
}

for (const stalePath of [partPath, lockPath]) {
  if (fs.existsSync(stalePath)) {
    fs.rmSync(stalePath, { force: true });
  }
}

console.log(`Downloading Gradle wrapper distribution: ${distributionUrl}`);

execFileSync(
  "curl",
  [
    "--fail",
    "--location",
    "--retry",
    "8",
    "--retry-delay",
    "5",
    "--connect-timeout",
    "60",
    "--max-time",
    "600",
    "--output",
    zipPath,
    distributionUrl,
  ],
  { stdio: "inherit" }
);

console.log(`Gradle wrapper distribution cached: ${zipPath}`);

function readProperty(content, key) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  if (!line) {
    throw new Error(`Missing ${key} in gradle-wrapper.properties`);
  }

  return line.slice(key.length + 1);
}

// Gradle stores wrapper distributions under the base36 MD5 of the URL.
function gradleCacheKey(value) {
  const digest = crypto.createHash("md5").update(value).digest();
  const integer = BigInt(`0x${digest.toString("hex")}`);

  return integer.toString(36);
}
