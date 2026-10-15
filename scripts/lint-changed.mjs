import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { readFile } from "node:fs/promises";
import { ESLint } from "eslint";
import { originalLine } from "./lint-line-map.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const base = git("merge-base", process.env.BASE_REF || "origin/main", "HEAD").trim();
const files = git("diff", "--name-only", "--diff-filter=ACMR", "-z", `${base}...HEAD`, "--",
  "*.ts", "*.tsx", "*.mts", "*.mjs").split("\0").filter(Boolean);
const eslint = new ESLint();
const results = files.length ? await eslint.lintFiles(files) : [];
let inherited = 0;
for (const result of results) {
  if (!result.messages.some((message) => message.ruleId === "react-hooks/set-state-in-effect" && message.severity === 2)) continue;
  const file = relative(process.cwd(), result.filePath);
  if (git("ls-tree", "--name-only", base, "--", file).trim() !== file) continue;
  const previous = git("show", `${base}:${file}`);
  const current = await readFile(result.filePath, "utf8");
  const patch = git("diff", "--unified=0", `${base}...HEAD`, "--", file);
  const [baseline] = await eslint.lintText(previous, { filePath: result.filePath });
  const previousLines = previous.split("\n");
  const currentLines = current.split("\n");
  result.messages = result.messages.filter((message) => {
    if (message.ruleId !== "react-hooks/set-state-in-effect" || message.severity !== 2) return true;
    const line = originalLine(patch, message.line);
    const unchanged = line !== null && previousLines[line - 1] === currentLines[message.line - 1];
    const existed = unchanged && baseline.messages.some((old) =>
      old.ruleId === message.ruleId && old.severity === message.severity &&
      old.line === line && old.column === message.column && old.nodeType === message.nodeType);
    if (existed) inherited++;
    return !existed;
  });
  result.errorCount = result.messages.filter((message) => message.severity === 2).length;
}
const formatter = await eslint.loadFormatter("stylish");
console.log(formatter.format(results));
console.log(`Baseline-only unchanged set-state-in-effect findings: ${inherited}. New or edited-line errors always fail.`);
if (results.some((result) => result.errorCount > 0 || result.fatalErrorCount > 0)) process.exitCode = 1;
