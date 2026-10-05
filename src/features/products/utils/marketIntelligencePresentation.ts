import type { MarketMoney } from "../types/marketIntelligence.types";
import {
  formatCurrencyValue,
  normalizeCurrencyCode,
} from "./currencyPresentation";

export function formatMarketMoney(money: MarketMoney | null | undefined) {
  if (!money) return "Not available";
  if (!normalizeCurrencyCode(money.currency)) return "Not available";
  if (money.value != null) {
    return formatCurrencyValue(money.value, money.currency);
  }
  if (money.min != null && money.max != null) {
    return `${formatCurrencyValue(money.min, money.currency)} - ${formatCurrencyValue(
      money.max,
      money.currency
    )}`;
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
