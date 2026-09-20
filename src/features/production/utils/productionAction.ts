import { productionQuantityUnits } from "./productionQuantity.ts";

export type ProductionActionContext = {
  orderId: string;
  stepId: string;
  expectedOrderVersion?: number;
  expectedStepVersion?: number;
  remainingQuantity: number;
  quantityModel?: "LEGACY" | "FLOW_V1";
  expectedFamilyVersion?: number;
};

export type ProductionActionSnapshot = ProductionActionContext & {
  expectedOrderVersion: number;
  expectedStepVersion: number;
  completedQuantity: number;
  rejectedQuantity: number;
  notes?: string;
  requestId?: string;
};

export function hasExecutionVersions(context: ProductionActionContext): context is ProductionActionContext & {
  expectedOrderVersion: number;
  expectedStepVersion: number;
} {
  return Number.isSafeInteger(context.expectedOrderVersion) && (context.expectedOrderVersion ?? -1) >= 0 &&
    Number.isSafeInteger(context.expectedStepVersion) && (context.expectedStepVersion ?? -1) >= 0 &&
    (context.quantityModel !== "FLOW_V1" ||
      (Number.isSafeInteger(context.expectedFamilyVersion) && (context.expectedFamilyVersion ?? -1) >= 0));
}

export function reviewProductionAction(
  context: ProductionActionContext,
  action: "record" | "complete",
  completedQuantity: number,
  rejectedQuantity: number,
  notes?: string,
): ProductionActionSnapshot {
  if (!context.orderId || !context.stepId || !hasExecutionVersions(context)) {
    throw new Error("Refresh this order before acting. Order, step and (for quantity-flow batches) family versions are required.");
  }
  if (!Number.isFinite(context.remainingQuantity) || context.remainingQuantity < 0 ||
      !Number.isFinite(completedQuantity) || !Number.isFinite(rejectedQuantity) ||
      completedQuantity < 0 || rejectedQuantity < 0) {
    throw new Error("Completed and rejected quantities must be finite, non-negative numbers.");
  }
  const total = productionQuantityUnits(completedQuantity) + productionQuantityUnits(rejectedQuantity);
  const remaining = productionQuantityUnits(context.remainingQuantity);
  if (context.quantityModel === "FLOW_V1" && rejectedQuantity !== 0) {
    throw new Error("Record good output only. A production lead must review scrap or never-produced cancellation using short closure.");
  }
  if (action === "record" && (total <= 0 || total > remaining)) {
    throw new Error(`Enter positive output totaling no more than ${context.remainingQuantity} remaining units.`);
  }
  if (action === "complete" && (total !== 0 || context.remainingQuantity !== 0)) {
    throw new Error("Record all remaining output before advancing. Advancing does not record quantities.");
  }
  return {
    ...context,
    expectedOrderVersion: context.expectedOrderVersion,
    expectedStepVersion: context.expectedStepVersion,
    completedQuantity, rejectedQuantity, notes: notes?.trim() || undefined,
    ...(context.quantityModel === "FLOW_V1" ? { requestId: crypto.randomUUID() } : {}),
  };
}

export function matchesProductionAction(snapshot: ProductionActionSnapshot, context: ProductionActionContext) {
  return snapshot.orderId === context.orderId && snapshot.stepId === context.stepId &&
    snapshot.expectedOrderVersion === context.expectedOrderVersion &&
    snapshot.expectedStepVersion === context.expectedStepVersion &&
    snapshot.quantityModel === context.quantityModel &&
    snapshot.expectedFamilyVersion === context.expectedFamilyVersion &&
    snapshot.remainingQuantity === context.remainingQuantity;
}

export function productionActionBody(snapshot: ProductionActionSnapshot) {
  return {
    completedQuantity: snapshot.completedQuantity,
    rejectedQuantity: snapshot.rejectedQuantity,
    notes: snapshot.notes,
    expectedOrderVersion: snapshot.expectedOrderVersion,
    expectedStepVersion: snapshot.expectedStepVersion,
    ...(snapshot.quantityModel === "FLOW_V1" ? {
      expectedFamilyVersion: snapshot.expectedFamilyVersion,
      requestId: snapshot.requestId,
    } : {}),
  };
}
