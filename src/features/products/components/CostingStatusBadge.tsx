import type { CostingCompleteness } from "../types/costing.types";
import { costingStatusLabel } from "../utils/costingPresentation";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<CostingCompleteness, string> = {
  COMPLETE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  ESTIMATED: "border-amber-200 bg-amber-50 text-amber-800",
  BLOCKED: "border-red-200 bg-red-50 text-red-800",
};

export function CostingStatusBadge({
  status,
}: {
  status: CostingCompleteness;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-1 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {costingStatusLabel(status)}
    </span>
  );
}
