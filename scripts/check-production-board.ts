import assert from "node:assert/strict";
import {
  buildStepColumns, canDragProductionItem, fixedColumnForStatus, productionBoardLeaves,
  productionDropTarget, productionTargetBasisLabel,
} from "../src/features/production/utils/productionBoard.ts";
import { formatProductionQuantity } from "../src/features/production/utils/productionQuantity.ts";
import type { ProductionBoardItem, ProductionOrder } from "../src/features/production/types/production.types";
import type { ProductionBatchIdentity } from "../src/features/production/types/productionFlow.types";

const batch: ProductionBatchIdentity = {
  rootOrderId: "00000000-0000-0000-0000-000000000001",
  parentOrderId: null, childSequence: null, batchLabel: "Original", nodeType: "LEAF",
  isExecutable: true, isTerminal: false, closureOutcome: "NONE", familyVersion: 1,
};
const item: ProductionBoardItem = {
  orderId: batch.rootOrderId, orderNumber: "PO-1", productId: "product", priority: "NORMAL",
  status: "IN_PROGRESS", plannedQuantity: 10, completedQuantity: 6, rejectedQuantity: 0,
  remainingQuantity: 4, currentStepName: "Cutting",
};
const flow: ProductionBoardItem = {
  ...item, quantityModel: "FLOW_V1", batch,
  quantities: { originalPlannedQuantity: 10, allocatedQuantity: 10, targetBasis: "CREATED",
    finalGoodQuantity: 0, scrapQuantity: 0, cancelledQuantity: 0, pendingQuantity: 10,
    legacyUnclassifiedQuantity: 0, reconciliationComplete: true },
  capabilities: { allowedActions: ["SPLIT_ADVANCE"], blockedActions: [] },
};
const terminal: ProductionBoardItem = {
  ...flow, orderId: "closed", batch: { ...batch, isTerminal: true, closureOutcome: "SHORT" },
};
const summary: ProductionBoardItem = {
  ...flow, orderId: "summary", batch: { ...batch, nodeType: "SUMMARY", isExecutable: false },
};

assert.equal(fixedColumnForStatus({ ...item, status: "PLANNED" }), "TODO");
assert.equal(fixedColumnForStatus({ ...item, status: "RELEASED", hasActiveAssignment: true }), "IN_PROGRESS");
for (const status of ["COMPLETED", "PARTIALLY_COMPLETED", "CANCELLED"] as const) {
  assert.equal(fixedColumnForStatus({ ...item, status }), "DONE");
  assert.equal(canDragProductionItem({ ...item, status }), false);
}
assert.equal(fixedColumnForStatus(terminal), "DONE");
assert.equal(fixedColumnForStatus({ ...flow, status: "ON_HOLD" }), "IN_PROGRESS");
assert.equal(fixedColumnForStatus({ ...flow, status: "PARTIALLY_COMPLETED" }), "IN_PROGRESS");
assert.equal(canDragProductionItem(item), true);
assert.equal(canDragProductionItem(flow), true);
assert.equal(canDragProductionItem({ ...flow, capabilities: { allowedActions: ["ADVANCE"], blockedActions: [] } }), true);
assert.equal(canDragProductionItem({ ...flow, capabilities: undefined }), false);
assert.equal(canDragProductionItem({ ...flow, quantities: undefined }), false);
assert.equal(canDragProductionItem({ ...flow, capabilities: { allowedActions: [], blockedActions: [] } }), false);
assert.equal(canDragProductionItem({ ...flow, batch: { ...batch, isExecutable: false } }), false);
assert.equal(canDragProductionItem(summary), false);
assert.equal(canDragProductionItem(terminal), false);
assert.deepEqual(productionBoardLeaves([summary, flow, terminal]), [flow, terminal]);
const columns = buildStepColumns([summary, flow, terminal]);
assert.deepEqual(columns.map((column) => [column.key, column.items.length]), [["STEP:Cutting", 1], ["DONE", 1]]);
assert.equal(buildStepColumns([{ ...flow, currentStepName: "Done" }])[0].key, "STEP:Done");
assert.equal(productionDropTarget(undefined, "Cutting"), undefined);
const order = { steps: [{ id: "own-step", name: "Cutting" }] } as ProductionOrder;
assert.equal(productionDropTarget(order, "Cutting"), "own-step");
assert.equal(productionDropTarget(order, "Packing"), undefined);
assert.equal(productionDropTarget({ ...order, steps: [...order.steps, ...order.steps] }, "Cutting"), undefined);
assert.equal(productionTargetBasisLabel("CAPTURED_AT_ADOPTION"), "Target captured at legacy adoption");
assert.equal(productionTargetBasisLabel(undefined), "Target provenance unavailable");
assert.equal(formatProductionQuantity(null), "Unavailable");
assert.equal(formatProductionQuantity(undefined), "Unavailable");
assert.equal(formatProductionQuantity(0), "0.000");
assert.equal(formatProductionQuantity(0.001), "0.001");
console.log("Production board checks passed: leaf lanes, terminal/held state, capability gating, safe drop targets and quantity uncertainty.");
