import type { InventoryItem } from "@/features/inventory/types/inventory.types";
import type {
  Bom, BomRequest, MaterialRequirement, ProductionOrder,
  WorkflowRequest, WorkflowTemplate, WorkflowVersion,
} from "../types/production.types";

export function isSelectableBom(bom: Bom, productId: string) {
  return bom.productId === productId && bom.active && bom.status === "PUBLISHED";
}

export function workflowRevision(template: WorkflowTemplate, version: WorkflowVersion): WorkflowRequest {
  return {
    code: template.code,
    name: version.name,
    description: version.description ?? undefined,
    steps: [...version.steps].sort((a, b) => a.sequenceNumber - b.sequenceNumber).map((step, index) => ({
      name: step.name, code: step.code, sequenceNumber: index + 1,
      description: step.description, workstation: step.workstation,
      roleMetadata: step.roleMetadata, active: step.active,
    })),
  };
}

export function bomRevision(bom: Bom): BomRequest {
  return {
    productId: bom.productId,
    name: bom.name,
    items: bom.items.map((item) => ({
      inventoryItemId: item.inventoryItemId, quantityPerUnit: item.quantityPerUnit,
      unit: item.unit, wastePercentage: item.wastePercentage,
    })),
  };
}

export function validBomRequest(body: BomRequest) {
  return Boolean(body.productId && body.name.trim() && body.items.length) &&
    new Set(body.items.map((item) => item.inventoryItemId)).size === body.items.length &&
    body.items.every((item) =>
      item.inventoryItemId && item.unit.trim() &&
      Number.isFinite(item.quantityPerUnit) && item.quantityPerUnit > 0 &&
      Number.isFinite(item.wastePercentage ?? 0) && (item.wastePercentage ?? 0) >= 0
    );
}

export function buildPinnedMaterialRequirements(
  bom: Bom | undefined,
  inventoryItems: InventoryItem[],
  order?: ProductionOrder,
): MaterialRequirement[] {
  if (!bom || !order || !order.bomId || bom.id !== order.bomId ||
      order.bomBindingStatus === "LEGACY_UNRESOLVED" || order.batch?.nodeType === "SUMMARY") return [];
  const pending = order.quantityModel === "FLOW_V1" ? order.quantities?.pendingQuantity : order.remainingQuantity;
  if (pending == null || !Number.isFinite(pending) || pending < 0) return [];

  return bom.items.map((item) => {
    const inventory = inventoryItems.find((candidate) => candidate.id === item.inventoryItemId);
    const estimatedRequiredQuantity = pending *
      item.quantityPerUnit * (1 + (item.wastePercentage ?? 0) / 100);
    const availableQuantity = inventory?.currentStock;
    return {
      inventoryItemId: item.inventoryItemId,
      itemCode: item.itemCode ?? inventory?.itemCode,
      itemName: item.itemName ?? inventory?.name,
      unit: item.unit, quantityPerUnit: item.quantityPerUnit,
      estimatedRequiredQuantity, availableQuantity,
      shortage: availableQuantity === undefined ? undefined : availableQuantity < estimatedRequiredQuantity,
    };
  });
}
