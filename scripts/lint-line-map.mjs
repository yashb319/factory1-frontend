export function originalLine(patch, line) {
  let delta = 0;
  for (const match of patch.matchAll(/^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
    const removed = Number(match[1] ?? 1);
    const start = Number(match[2]);
    const added = Number(match[3] ?? 1);
    if (line < start || (added === 0 && line === start)) break;
    if (added > 0 && line < start + added) return null;
    delta += added - removed;
  }
  return line - delta;
}
