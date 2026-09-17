/**
 * Generic fallback formatter for raw backend enum values (e.g. "SNAKE_CASE"
 * or "NEEDS_CLARIFICATION") into a human-readable label ("Snake Case",
 * "Needs Clarification"). Prefer a bespoke label map when one already exists
 * for a domain (e.g. getPayrollStatusLabel, itemTypeLabel) — use this only
 * to fill gaps where no such map exists yet.
 */
export function humanizeEnum(value?: string | null): string {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase());
}
