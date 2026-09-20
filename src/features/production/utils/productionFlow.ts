import type { OrderStep, ProductionOrder } from "../types/production.types";
import type { FlowVersions, ProductionFlowAction, ProductionFlowMetadata, ProductionOrderGuard } from "../types/productionFlow.types";

export function productionOrderGuard(order: ProductionOrder): ProductionOrderGuard {
  if (order.quantityModel !== "FLOW_V1") return {};
  const expectedOrderVersion = order.executionVersion;
  const expectedFamilyVersion = order.batch?.familyVersion;
  if (expectedOrderVersion === undefined || expectedFamilyVersion === undefined ||
      !Number.isSafeInteger(expectedOrderVersion) || expectedOrderVersion < 0 ||
      !Number.isSafeInteger(expectedFamilyVersion) || expectedFamilyVersion < 0) {
    throw new Error("Refresh the batch before acting. Current order and family versions are required.");
  }
  return { expectedOrderVersion, expectedFamilyVersion };
}

export function matchesProductionOrderGuard(guard: ProductionOrderGuard, order: ProductionOrder): boolean {
  if (guard.expectedFamilyVersion === undefined) return order.quantityModel !== "FLOW_V1";
  return guard.expectedOrderVersion === order.executionVersion && guard.expectedFamilyVersion === order.batch?.familyVersion;
}

export function canProductionAction(order: ProductionFlowMetadata, action: ProductionFlowAction): boolean {
  if (order.quantityModel === "FLOW_V1" && (!order.batch || !order.quantities || !order.capabilities)) return false;
  if (order.batch && (!order.batch.isExecutable || order.batch.nodeType === "SUMMARY" || order.batch.isTerminal)) return false;
  if (order.capabilities) return order.capabilities.allowedActions.includes(action);
  return order.quantityModel !== "FLOW_V1" && action !== "SPLIT_ADVANCE" && action !== "SHORT_CLOSE";
}

export function productionActionBlock(order: ProductionFlowMetadata, action: ProductionFlowAction): string | undefined {
  const blocked = order.capabilities?.blockedActions.find((entry) => entry.action === action);
  if (blocked) return [blocked.message, blocked.remediation].filter(Boolean).join(" ");
  if (order.batch?.nodeType === "SUMMARY") return "This is an overview. Open an executable child batch to record work.";
  if (order.batch?.isTerminal) return "This batch is closed.";
  if (order.quantityModel === "FLOW_V1" && (!order.batch || !order.quantities || !order.capabilities)) {
    return "Quantity-flow details are incomplete. Refresh before acting; a compatible production API is required.";
  }
  if (!canProductionAction(order, action)) return "This action is unavailable. Refresh the order and review its eligibility.";
}

export function productionFlowVersions(order: ProductionOrder, step?: OrderStep): FlowVersions {
  const expectedOrderVersion = order.executionVersion;
  const expectedStepVersion = step?.expectedVersion;
  const expectedFamilyVersion = order.batch?.familyVersion;
  const values = [expectedOrderVersion, expectedStepVersion, expectedFamilyVersion];
  if (!step || !order.currentStepId || step.id !== order.currentStepId ||
      expectedOrderVersion === undefined || expectedStepVersion === undefined || expectedFamilyVersion === undefined ||
      values.some((value) => !Number.isSafeInteger(value) || (value ?? -1) < 0)) {
    throw new Error("Refresh this order before acting. Current order, step and family versions are required.");
  }
  return {
    expectedOrderVersion,
    expectedStepVersion,
    expectedFamilyVersion,
  };
}

export function sameFlowVersions(captured: FlowVersions, order: ProductionOrder, step?: OrderStep): boolean {
  return captured.expectedOrderVersion === order.executionVersion &&
    captured.expectedStepVersion === step?.expectedVersion &&
    captured.expectedFamilyVersion === order.batch?.familyVersion;
}

export function productionIsTerminal(order: ProductionFlowMetadata & { status: string }): boolean {
  return order.batch?.isTerminal ?? ["COMPLETED", "PARTIALLY_COMPLETED", "CANCELLED"].includes(order.status);
}

export function productionFailure(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data;
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") return data.message;
  }
  if (error instanceof Error) return error.message;
  return "Outcome not confirmed. Refresh the order and review the latest state before trying again. No automatic retry was made.";
}
