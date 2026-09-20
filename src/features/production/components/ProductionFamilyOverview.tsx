"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetProductionFamilyQuery } from "../api/productionFlowApi";
import type { ProductionOrder } from "../types/production.types";
import { productionFailure } from "../utils/productionFlow";
import { formatProductionQuantity } from "../utils/productionQuantity";
import { CatalogPagination } from "./CatalogPagination";
import { ProductionQuantitySummary } from "./ProductionQuantitySummary";
import { OrderQrLabel } from "./OrderQrLabel";

export function ProductionFamilyOverview({ order, onSelect, onRefresh }: { order: ProductionOrder; onSelect: (id: string) => void; onRefresh: () => void }) {
  const [paging, setPaging] = useState<{ page: number; version?: number }>({ page: 0 });
  const family = useGetProductionFamilyQuery({
    orderId: order.id, page: paging.page, expectedFamilyVersion: paging.version,
  }, { skip: !order.batch });
  if (!order.batch) return null;
  const data = family.currentData;
  const changed = Boolean(data && (data.familyVersion !== order.batch.familyVersion ||
    (paging.version !== undefined && data.familyVersion !== paging.version)));
  const fresh = !family.isFetching && !family.isError && !changed;
  function reload() {
    onRefresh();
    setPaging({ page: 0 });
    if (paging.page === 0 && paging.version === undefined) void family.refetch();
  }
  return <section className="space-y-3 rounded-lg border p-4" aria-label="Linked production batches">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Original request and linked child batches</h3>
      <Button type="button" size="sm" variant="outline" disabled={family.isFetching} onClick={reload}>Refresh family</Button>
    </div>
    <p className="text-xs text-muted-foreground">Totals cover the whole original request, not just this page. Split parents retain history and are not executable work.</p>
    {family.isFetching ? <p role="status" className="text-sm">Loading linked batches...</p> : null}
    {family.isError ? <p role="alert" className="text-sm text-destructive">{productionFailure(family.error)} Refresh the family from its first page.</p> : null}
    {changed ? <p role="alert" className="text-sm text-amber-700">The family changed. Refresh the order and family before browsing another page; pages from different versions are not combined.</p> : null}
    {fresh && data ? <>
      <ProductionQuantitySummary quantities={data.totals} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-2">Batch / parent</th><th className="p-2">Allocation</th><th className="p-2">Step / state</th><th className="p-2">Good at step</th><th className="p-2">Remaining at step</th><th className="p-2">Label</th></tr></thead>
          <tbody>{data.nodes.map((node) => {
            const step = node.steps.find((candidate) => candidate.id === node.currentStepId);
            const parentId = node.batch?.parentOrderId;
            return <tr className="border-b" key={node.id}>
              <td className="p-2">
                <Button type="button" variant="link" className="h-auto p-0" onClick={() => onSelect(node.id)}>{node.batch?.batchLabel ?? node.orderNumber}</Button>
                <div><Badge variant="outline">{node.batch?.nodeType === "SUMMARY" ? "Overview" : node.batch?.parentOrderId ? "Child batch" : "Original"}</Badge></div>
                {parentId ? <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onSelect(parentId)}>Open parent</Button> : null}
              </td>
              <td className="p-2">{formatProductionQuantity(node.quantities?.allocatedQuantity)}</td>
              <td className="p-2">{node.batch?.nodeType === "SUMMARY" ? "See descendants" : step?.name ?? "No active step"}<div className="text-xs text-muted-foreground">{node.status.replaceAll("_", " ")}{node.batch?.closureOutcome !== "NONE" ? ` / ${node.batch?.closureOutcome ?? ""}` : ""}</div></td>
              <td className="p-2">{node.batch?.nodeType === "SUMMARY" ? "-" : formatProductionQuantity(step?.goodQuantity ?? step?.completedQuantity)}</td>
              <td className="p-2">{node.batch?.nodeType === "SUMMARY" ? "-" : formatProductionQuantity(step?.remainingQuantity)}</td>
              <td className="p-2"><OrderQrLabel orderId={node.id} orderNumber={node.orderNumber} rootOrderId={node.batch?.rootOrderId} batchLabel={node.batch?.batchLabel} nodeType={node.batch?.nodeType} allocatedQuantity={node.quantities?.allocatedQuantity} /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <CatalogPagination page={paging.page} totalPages={data.totalPages} loading={!fresh} onChange={(page) => setPaging({ page, version: data.familyVersion })} />
    </> : null}
  </section>;
}
