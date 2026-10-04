import type {
  CostingAmount,
  CostingCompleteness,
} from "../types/costing.types";

const STATUS_LABELS: Record<CostingCompleteness, string> = {
  COMPLETE: "Complete",
  ESTIMATED: "Estimated",
  BLOCKED: "Blocked",
};

export function costingStatusLabel(status: CostingCompleteness) {
  return STATUS_LABELS[status];
}

export function costingStatusDescription(status: CostingCompleteness) {
  if (status === "COMPLETE") {
    return "All required inputs are available for this costing result.";
  }

  if (status === "ESTIMATED") {
    return "This is an estimate based on incomplete or mutable source data. It is not a true cost.";
  }

  return "A cost result cannot be produced until the missing inputs are resolved.";
}

export function formatCostingMoney(
  value: number | null | undefined,
  currency: string
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCostingAmount(
  amount: CostingAmount | null | undefined,
  mode: "perUnit" | "total"
) {
  if (!amount) return "Not available";
  return formatCostingMoney(amount[mode], amount.currency);
}

export function formatCostingDate(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
