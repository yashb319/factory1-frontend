import type { MarketMoney } from "../types/marketIntelligence.types";

export function formatMarketMoney(money: MarketMoney | null | undefined) {
  if (!money) return "Not available";
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: money.currency || "INR",
    maximumFractionDigits: 2,
  });
  if (money.value != null) return formatter.format(money.value);
  if (money.min != null && money.max != null) {
    return `${formatter.format(money.min)} - ${formatter.format(money.max)}`;
  }
  return "Not available";
}

export function formatMarketPercent(value: number | null | undefined) {
  return value == null
    ? "Not available"
    : new Intl.NumberFormat("en-IN", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
}

export function formatMarketDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: value.includes("T") ? "short" : undefined,
      }).format(date);
}
