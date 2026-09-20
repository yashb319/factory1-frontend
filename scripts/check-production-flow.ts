import assert from "node:assert/strict";
import {
  canProductionAction, matchesProductionOrderGuard, productionActionBlock, productionFlowVersions,
  productionIsTerminal, productionOrderGuard, sameFlowVersions,
} from "../src/features/production/utils/productionFlow.ts";
import type { OrderStep, ProductionOrder } from "../src/features/production/types/production.types.ts";

const step: OrderStep = { id: "step", name: "Cut", code: "CUT", sequenceNumber: 1, active: true, expectedVersion: 0 };
const order: ProductionOrder = {
  id: "order", orderNumber: "PO10", productId: "product", plannedQuantity: 10, priority: "NORMAL",
  workflowVersionId: "workflow", workflowVersionNumber: 1, responsibleUserId: "manager",
  bomId: "bom", bomVersionNumber: 1, bomBindingStatus: "PINNED", status: "IN_PROGRESS",
  executionVersion: 0, currentStepId: step.id, steps: [step], completedQuantity: 0, rejectedQuantity: 0,
  remainingQuantity: 10, quantityModel: "FLOW_V1",
  batch: { rootOrderId: "root", parentOrderId: "root", childSequence: 1, batchLabel: "PO10/child1",
    nodeType: "LEAF", isExecutable: true, isTerminal: false, closureOutcome: "NONE", familyVersion: 0 },
  quantities: { originalPlannedQuantity: 10, targetBasis: "CREATED", allocatedQuantity: 10,
    finalGoodQuantity: 0, scrapQuantity: 0, cancelledQuantity: 0, pendingQuantity: 10,
    legacyUnclassifiedQuantity: 0, reconciliationComplete: true },
  capabilities: { allowedActions: ["RECORD_GOOD", "SPLIT_ADVANCE", "SHORT_CLOSE", "ASSIGN"], blockedActions: [] },
};
assert.equal(canProductionAction(order, "SPLIT_ADVANCE"), true);
for (const missing of [
  { ...order, batch: undefined }, { ...order, quantities: undefined }, { ...order, capabilities: undefined },
]) assert.equal(canProductionAction(missing, "RECORD_GOOD"), false);
assert.equal(canProductionAction({ ...order, batch: { ...order.batch!, nodeType: "SUMMARY" } }, "ASSIGN"), false);
assert.equal(canProductionAction({ ...order, batch: { ...order.batch!, isTerminal: true } }, "SHORT_CLOSE"), false);
const held = { ...order, status: "ON_HOLD" as const, capabilities: {
  allowedActions: [], blockedActions: [{ action: "SPLIT_ADVANCE" as const, code: "ORDER_ON_HOLD", message: "On hold", remediation: "Ask lead to review." }],
} };
assert.equal(productionIsTerminal(held), false);
assert.equal(canProductionAction(held, "SPLIT_ADVANCE"), false);
assert.match(productionActionBlock(held, "SPLIT_ADVANCE") ?? "", /On hold.*Ask lead/);
const versions = productionFlowVersions(order, step);
assert.deepEqual(versions, { expectedOrderVersion: 0, expectedStepVersion: 0, expectedFamilyVersion: 0 });
assert.equal(sameFlowVersions(versions, order, step), true);
assert.equal(sameFlowVersions(versions, { ...order, executionVersion: 1 }, step), false);
assert.throws(() => productionFlowVersions(order, { ...step, id: "other" }));
assert.throws(() => productionFlowVersions({ ...order, batch: undefined }, step));
assert.deepEqual(productionOrderGuard(order), { expectedOrderVersion: 0, expectedFamilyVersion: 0 });
assert.equal(matchesProductionOrderGuard(productionOrderGuard(order), order), true);
assert.equal(matchesProductionOrderGuard(productionOrderGuard(order), { ...order, batch: { ...order.batch!, familyVersion: 1 } }), false);
assert.equal(matchesProductionOrderGuard({}, order), false, "Legacy review cannot follow automatic FLOW adoption");
assert.throws(() => productionOrderGuard({ ...order, executionVersion: undefined }));
const legacy = { ...order, quantityModel: "LEGACY" as const, batch: undefined, quantities: undefined, capabilities: undefined };
assert.equal(canProductionAction(legacy, "RECORD_GOOD"), true);
assert.equal(canProductionAction(legacy, "SPLIT_ADVANCE"), false);
assert.deepEqual(productionOrderGuard(legacy), {});
assert.equal(productionIsTerminal({ ...legacy, status: "PARTIALLY_COMPLETED" }), true);
console.log("Production flow checks passed: capability guards, summaries, terminal/held leaves, legacy compatibility and captured auxiliary versions.");
