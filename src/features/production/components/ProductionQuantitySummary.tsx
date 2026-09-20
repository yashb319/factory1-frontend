import type { ProductionQuantities } from "../types/productionFlow.types";

const quantity = (value: number | null | undefined) => value == null || !Number.isFinite(value)
  ? "Unavailable"
  : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(value);

export function ProductionQuantitySummary({ quantities, compact = false }: {
  quantities: ProductionQuantities;
  compact?: boolean;
}) {
  const targetLabel = quantities.targetBasis === "CAPTURED_AT_ADOPTION"
    ? "Target captured at adoption"
    : quantities.targetBasis === "LEGACY_CURRENT" ? "Legacy current target" : "Original target";
  return (
    <section aria-label="Production quantity reconciliation" className="space-y-2">
      <p className="text-sm font-medium">{targetLabel}: {quantity(quantities.originalPlannedQuantity)}
        {!compact ? <span className="ml-3 text-muted-foreground">This batch allocation: {quantity(quantities.allocatedQuantity)}</span> : null}
      </p>
      <dl className={compact ? "flex flex-wrap gap-x-3 gap-y-1 text-xs" : "grid grid-cols-2 gap-3 rounded-md border p-3 text-sm sm:grid-cols-4"}>
        {([
          ["Final good", quantities.finalGoodQuantity],
          ["Scrap pieces", quantities.scrapQuantity],
          ["Never-produced cancellation", quantities.cancelledQuantity],
          ["Pending / work in progress", quantities.pendingQuantity],
        ] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{quantity(value)}</dd></div>)}
      </dl>
      {!quantities.reconciliationComplete || quantities.legacyUnclassifiedQuantity > 0 ? (
        <p role="alert" className="text-sm text-amber-700">
          Reconciliation is incomplete. Unclassified legacy quantity: {quantity(quantities.legacyUnclassifiedQuantity)}.
          Historical rejection is not automatically scrap, and unknown quantities are not available work.
        </p>
      ) : null}
    </section>
  );
}
