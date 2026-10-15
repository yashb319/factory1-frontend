import type { ExecutionBatch } from "../types/production.types";
import { formatProductionQuantity } from "../utils/productionQuantity";

export function ExecutionBatchHistory({ batches, quantityLabel = formatProductionQuantity,
  dateLabel = (value: string) => new Date(value).toLocaleString(),
}: { batches: ExecutionBatch[]; quantityLabel?: (value: number) => string; dateLabel?: (value: string) => string }) {
  if (!batches.length) return <p className="text-sm text-muted-foreground">No execution batches recorded yet.</p>;
  return <div className="space-y-2">{batches.map((batch) => <div key={batch.id} className="rounded-md border p-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-medium">Output record {batch.batchNumber}</span>
      <span className="text-xs text-muted-foreground">{batch.createdAt ? dateLabel(batch.createdAt) : "-"}</span>
    </div>
    <div className="mt-1 text-xs text-muted-foreground">
      Completed {quantityLabel(batch.completedQuantity)} · Rejected {quantityLabel(batch.rejectedQuantity)}
    </div>
    {batch.notes ? <p className="mt-1 text-xs text-muted-foreground">{batch.notes}</p> : null}
    <p className="mt-1 break-all text-xs text-muted-foreground">Rejection evidence source: EXECUTION_BATCH / {batch.id}</p>
  </div>)}</div>;
}
