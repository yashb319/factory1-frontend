import type { SavingsRange } from "./types";

const integerFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function rounded(value: number) {
  if (Math.abs(value) >= 10_000) return Math.round(value / 1_000) * 1_000;
  if (Math.abs(value) >= 1_000) return Math.round(value / 100) * 100;
  if (Math.abs(value) >= 100) return Math.round(value / 10) * 10;
  return Math.round(value);
}

export function formatHoursRange(range: SavingsRange) {
  return `${integerFormatter.format(rounded(range.min))}–${integerFormatter.format(rounded(range.max))} hours`;
}
