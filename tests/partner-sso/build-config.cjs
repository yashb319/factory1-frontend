const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const [config, backup] = process.argv.slice(2);
if (!config || !backup) throw new Error("Pass config and temporary backup paths");
fs.copyFileSync(config, backup, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(config, `import original from ${JSON.stringify(pathToFileURL(backup).href)};\nexport default { ...original, output: undefined };\n`);
const route = path.join(path.dirname(config), "src/app/api/partner-e2e-authority");
fs.mkdirSync(route);
fs.copyFileSync(path.join(__dirname, "authority-route.ts"), path.join(route, "route.ts"));
