"use client";

import { useGetMaterialAvailabilityQuery } from "../api/productionFlowApi";
import type { ProductionOrder } from "../types/production.types";
import type { MaterialSourceOption } from "./materialAllocation";

export function useMaterialSources(order: ProductionOrder) {
  const query = useGetMaterialAvailabilityQuery(order.id, { refetchOnMountOrArgChange: true });
  const data = query.currentData;
  const current = Boolean(data && data.rootOrderId === order.batch?.rootOrderId && data.familyVersion === order.batch?.familyVersion);
  const sources: MaterialSourceOption[] = (data?.items ?? [])
    .filter((item) => item.source === "MANUAL" && item.remainingAllocatableQuantity > 0)
    .map((item) => ({
      consumptionId: item.consumptionId,
      sourceOrderId: item.sourceOrderId,
      inventoryItemId: item.inventoryItemId,
      itemLabel: item.inventoryItemId + (item.lotNumber ? ` / lot ${item.lotNumber}` : ""),
      unit: item.unit,
      remainingAllocatableQuantity: item.remainingAllocatableQuantity,
    }));
  return { query, sources, ready: current && !query.isFetching && !query.isError };
}
