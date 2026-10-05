import type {
  ProfitabilityHealth,
  ProfitabilityMoney,
} from "../types/profitability.types";
import { formatCurrencyValue } from "./currencyPresentation";

export const PROFITABILITY_HEALTH_LABELS: Record<ProfitabilityHealth, string> = {
  HEALTHY: "Healthy",
  OPPORTUNITY: "Opportunity",
  ATTENTION: "Attention",
  INCOMPLETE: "Incomplete",
  UNKNOWN: "Unknown",
};

export function formatProfitabilityMoney(money: ProfitabilityMoney) {
  const formatted = formatCurrencyValue(money.value, money.currency);
  if (formatted !== "Not available" || !money.unavailableReason) {
    return formatted;
  }

  return `Not available (${money.unavailableReason
    .replaceAll("_", " ")
    .toLowerCase()})`;
}

export function formatProfitabilityPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function formatProfitabilityDate(value: string | null | undefined) {
  if (!value) return "Not available";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
