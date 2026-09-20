"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import { CatalogPagination } from "./CatalogPagination";
import type { MaterialAllocationDraft, MaterialSourceOption } from "../utils/materialAllocation";

export function MaterialAllocationEditor({ drafts, onChange, sources, allowNewStock, disabled = false }: {
  drafts: MaterialAllocationDraft[];
  onChange: (drafts: MaterialAllocationDraft[]) => void;
  sources: MaterialSourceOption[];
  allowNewStock: boolean;
  disabled?: boolean;
}) {
  const [page, setPage] = useState(0);
  const inventory = useGetInventoryItemsQuery({ page, size: 50 }, { skip: !allowNewStock });
  const patch = (key: string, change: Partial<MaterialAllocationDraft>) =>
    onChange(drafts.map((draft) => draft.key === key ? { ...draft, ...change } : draft));
  return (
    <fieldset disabled={disabled} className="space-y-3">
      {drafts.map((draft, index) => <div key={draft.key} className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Material line {index + 1}</p>
        <label className="block text-sm">Material source
          <select className="mt-1 w-full rounded-md border p-2" value={draft.source} onChange={(event) => patch(draft.key, {
            source: event.target.value === "NEW_STOCK" ? "NEW_STOCK" : "EXISTING_CONSUMPTION",
            consumptionId: "", inventoryItemId: "", itemLabel: "", unit: "",
          })}>
            <option value="EXISTING_CONSUMPTION">Already consumed - allocate only, no new stock deduction</option>
            {allowNewStock ? <option value="NEW_STOCK">Deduct new stock for actual waste</option> : null}
          </select>
        </label>
        {draft.source === "EXISTING_CONSUMPTION" ? <label className="block text-sm">Existing family material issue
          <select className="mt-1 w-full rounded-md border p-2" value={draft.consumptionId} onChange={(event) => {
            const source = sources.find((item) => item.consumptionId === event.target.value);
            patch(draft.key, { consumptionId: source?.consumptionId ?? "", inventoryItemId: source?.inventoryItemId ?? "", itemLabel: source?.itemLabel ?? "", unit: source?.unit ?? "" });
          }}>
            <option value="">Select eligible issue</option>
            {sources.filter((item) => item.remainingAllocatableQuantity > 0).map((source) => <option key={source.consumptionId} value={source.consumptionId}>{source.itemLabel} - {source.remainingAllocatableQuantity} {source.unit} available - issue {source.consumptionId}</option>)}
          </select>
        </label> : <label className="block text-sm">Material
          <select className="mt-1 w-full rounded-md border p-2" value={draft.inventoryItemId} disabled={inventory.isFetching || inventory.isError} onChange={(event) => {
            const item = inventory.currentData?.content.find((candidate) => candidate.id === event.target.value);
            patch(draft.key, { inventoryItemId: item?.id ?? "", itemLabel: item?.name ?? "", unit: item?.unit ?? "" });
          }}>
            <option value="">Select material</option>
            {draft.inventoryItemId && !inventory.currentData?.content.some((item) => item.id === draft.inventoryItemId) ? <option value={draft.inventoryItemId}>{draft.itemLabel}</option> : null}
            {inventory.currentData?.content.map((item) => <option key={item.id} value={item.id}>{item.itemCode} - {item.name} ({item.unit})</option>)}
          </select>
        </label>}
        <label className="block text-sm">Actual material quantity {draft.unit ? `(${draft.unit})` : ""}
          <Input type="text" inputMode="decimal" value={draft.quantity} onChange={(event) => patch(draft.key, { quantity: event.target.value })} />
        </label>
        {draft.source === "NEW_STOCK" ? <label className="block text-sm">Lot number<Input maxLength={150} value={draft.lotNumber} onChange={(event) => patch(draft.key, { lotNumber: event.target.value })} /></label> : null}
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange(drafts.filter((item) => item.key !== draft.key))}>Remove material line {index + 1}</Button>
      </div>)}
      {allowNewStock ? <>
        {inventory.isError ? <p role="alert" className="text-sm text-destructive">Material catalogue unavailable. <Button type="button" variant="link" onClick={() => void inventory.refetch()}>Retry materials</Button></p> : null}
        <CatalogPagination page={page} totalPages={inventory.currentData?.totalPages ?? 0} loading={inventory.isFetching} onChange={setPage} />
      </> : null}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...drafts, {
        key: crypto.randomUUID(), source: "EXISTING_CONSUMPTION", inventoryItemId: "", consumptionId: "",
        itemLabel: "", unit: "", quantity: "", lotNumber: "",
      }])}>Add material {allowNewStock ? "waste" : "coverage"}</Button>
      <p className="text-xs text-muted-foreground">Material quantities are independent of piece counts. Shared ancestral issues have one available balance across all child batches. The server rechecks availability at confirmation.</p>
    </fieldset>
  );
}
