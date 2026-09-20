export type ProductionActionContext = {
  orderId: string;
  stepId: string;
  expectedOrderVersion?: number;
  expectedStepVersion?: number;
  remainingQuantity: number;
};

export type ProductionActionSnapshot = ProductionActionContext & {
  expectedOrderVersion: number;
  expectedStepVersion: number;
  completedQuantity: number;
  rejectedQuantity: number;
  notes?: string;
};

export function hasExecutionVersions(context: ProductionActionContext): context is ProductionActionContext & {
  expectedOrderVersion: number;
  expectedStepVersion: number;
} {
  return Number.isSafeInteger(context.expectedOrderVersion) && (context.expectedOrderVersion ?? -1) >= 0 &&
    Number.isSafeInteger(context.expectedStepVersion) && (context.expectedStepVersion ?? -1) >= 0;
}

export function reviewProductionAction(
  context: ProductionActionContext,
  action: "record" | "complete",
  completedQuantity: number,
  rejectedQuantity: number,
  notes?: string,
): ProductionActionSnapshot {
  if (!context.orderId || !context.stepId || !hasExecutionVersions(context)) {
    throw new Error("Refresh this order before acting. Both order and step versions are required.");
  }
  if (!Number.isFinite(context.remainingQuantity) || context.remainingQuantity < 0 ||
      !Number.isFinite(completedQuantity) || !Number.isFinite(rejectedQuantity) ||
      completedQuantity < 0 || rejectedQuantity < 0) {
    throw new Error("Completed and rejected quantities must be finite, non-negative numbers.");
  }
  const total = completedQuantity + rejectedQuantity;
  if (action === "record" && (total <= 0 || total > context.remainingQuantity)) {
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
  };
}

export function matchesProductionAction(snapshot: ProductionActionSnapshot, context: ProductionActionContext) {
  return snapshot.orderId === context.orderId && snapshot.stepId === context.stepId &&
    snapshot.expectedOrderVersion === context.expectedOrderVersion &&
    snapshot.expectedStepVersion === context.expectedStepVersion &&
    snapshot.remainingQuantity === context.remainingQuantity;
}

export function productionActionBody(snapshot: ProductionActionSnapshot) {
  return {
    completedQuantity: snapshot.completedQuantity,
    rejectedQuantity: snapshot.rejectedQuantity,
    notes: snapshot.notes,
    expectedOrderVersion: snapshot.expectedOrderVersion,
    expectedStepVersion: snapshot.expectedStepVersion,
  };
}
