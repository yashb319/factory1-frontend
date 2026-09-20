import type { ProductionMaterialPreview as MaterialPreview, InventoryEffect } from "../types/productionFlow.types";
import { formatProductionQuantity } from "../utils/productionQuantity";

export function ProductionMaterialPreview({ preview }: { preview: MaterialPreview }) {
  return <section className="space-y-3 text-sm" aria-label="Reviewed inventory effects">
    <p className="font-medium">Finished-good stock credit: {formatProductionQuantity(preview.finishedGoodCredit)}</p>
    <p>These quantities come from the server&apos;s reviewed pinned-BOM calculation, not a client estimate. Only uncovered materials are deducted from stock.</p>
    {preview.items.map((item) => <div key={item.inventoryItemId} className="rounded-md border p-3">
      <p className="break-all font-medium">Material {item.inventoryItemId}</p>
      <p>Required: {formatProductionQuantity(item.requiredQuantity)} {item.unit}</p>
      <p>Already consumed coverage: {formatProductionQuantity(item.coveredQuantity)} {item.unit}</p>
      <p className="font-medium">New stock deduction: {formatProductionQuantity(item.newStockDebitQuantity)} {item.unit}</p>
      {item.coverageSources.map((source) => <p className="break-all text-xs text-muted-foreground" key={source.consumptionId}>Issue {source.consumptionId}: {formatProductionQuantity(source.quantity)} {source.unit}</p>)}
    </div>)}
    {preview.stockWarnings.map((warning, index) => <p role="alert" className="text-amber-700" key={`${index}:${warning}`}>{warning}</p>)}
    <p className="text-xs text-muted-foreground">Stock is not reserved by this preview. Availability is rechecked atomically at confirmation.</p>
  </section>;
}

export function ProductionWasteEffects({ effects }: { effects: InventoryEffect[] }) {
  return <section className="space-y-2 text-sm" aria-label="Actual wasted material effects">
    <p className="font-medium">Actual wasted materials</p>
    {effects.length ? effects.map((effect, index) => <div className="rounded-md border p-3" key={`${effect.inventoryItemId}:${effect.consumptionId}:${index}`}>
      <p className="break-all">Material {effect.inventoryItemId}{effect.lotNumber ? ` / lot ${effect.lotNumber}` : ""}</p>
      <p>Waste allocation: {formatProductionQuantity(effect.quantity)} {effect.unit}</p>
      <p className="font-medium">{effect.source === "EXISTING_CONSUMPTION" ? "Already consumed - no second deduction" : `New stock deduction: ${formatProductionQuantity(effect.newStockDebitQuantity)} ${effect.unit}`}</p>
      {effect.consumptionId ? <p className="break-all text-xs">Source issue: {effect.consumptionId}</p> : null}
    </div>) : <p>No material stock deduction or allocation. This does not automatically return previously issued materials.</p>}
    <p className="text-xs text-muted-foreground">Scrap piece counts never imply a full-BOM deduction. Closure does not create finished-good stock.</p>
  </section>;
}
