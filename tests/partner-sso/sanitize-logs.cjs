const fs = require("node:fs");

const lines = fs.readFileSync(0, "utf8").split("\n").slice(-81);
for (const line of lines) {
  if (/-----|authorization|password|secret|sessionhandle|csrf|cookie|token|nonce/i.test(line)) {
    console.log("[sensitive diagnostic line omitted]");
    continue;
  }
  console.log(line
    .replace(/([?&](?:code|state)=)[^&\s"']+/gi, "$1[redacted]")
    .replace(/[A-Za-z0-9_+/=-]{32,}/g, "[redacted]"));
}
