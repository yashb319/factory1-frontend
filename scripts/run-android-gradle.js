#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const projectRoot = path.join(__dirname, "..");
const androidDir = path.join(projectRoot, "android");
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/run-android-gradle.js <gradle-task...>");
  process.exit(1);
}

const javaHome = findJava21();

if (!javaHome) {
  console.error(`
Java 21 not found.

Install JDK 21 and rerun the command. On macOS this project expects one of:
- /Users/${os.userInfo().username}/Library/Java/JavaVirtualMachines/oracle-21.jdk/Contents/Home
- Any JDK returned by: /usr/libexec/java_home -v 21
`);
  process.exit(1);
}

const androidHome = process.env.ANDROID_HOME
  || process.env.ANDROID_SDK_ROOT
  || path.join(os.homedir(), "Library", "Android", "sdk");

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  PATH: [
    path.join(javaHome, "bin"),
    path.join(androidHome, "cmdline-tools", "latest", "bin"),
    path.join(androidHome, "platform-tools"),
    process.env.PATH,
  ].join(path.delimiter),
};

console.log(`Using Java 21: ${javaHome}`);

const result = spawnSync("./gradlew", args, {
  cwd: androidDir,
  env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);

function findJava21() {
  if (process.env.JAVA_HOME && isJava21(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }

  if (process.platform === "darwin") {
    try {
      const value = execFileSync("/usr/libexec/java_home", ["-v", "21"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      if (value && isJava21(value)) {
        return value;
      }
    } catch {
      // Fall through to known paths.
    }
  }

  const candidates = [
    path.join(os.homedir(), "Library", "Java", "JavaVirtualMachines", "oracle-21.jdk", "Contents", "Home"),
    path.join(os.homedir(), "Library", "Java", "JavaVirtualMachines", "temurin-21.jdk", "Contents", "Home"),
    "/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home",
  ];

  return candidates.find(isJava21);
}

function isJava21(javaHome) {
  const releaseFile = path.join(javaHome, "release");

  if (!fs.existsSync(releaseFile)) {
    return false;
  }

  return fs.readFileSync(releaseFile, "utf8").includes('JAVA_VERSION="21.');
}
