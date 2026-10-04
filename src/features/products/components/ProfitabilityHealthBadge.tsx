import type { ProfitabilityHealth } from "../types/profitability.types";
import { PROFITABILITY_HEALTH_LABELS } from "../utils/profitabilityPresentation";

const classes: Record<ProfitabilityHealth, string> = {
  HEALTHY: "border-emerald-200 bg-emerald-50 text-emerald-800",
  OPPORTUNITY: "border-blue-200 bg-blue-50 text-blue-800",
  ATTENTION: "border-amber-200 bg-amber-50 text-amber-900",
  INCOMPLETE: "border-orange-200 bg-orange-50 text-orange-900",
  UNKNOWN: "border-slate-200 bg-slate-50 text-slate-700",
};

export function ProfitabilityHealthBadge({
  health,
}: {
  health: ProfitabilityHealth;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${classes[health]}`}
    >
      {PROFITABILITY_HEALTH_LABELS[health]}
    </span>
  );
}
