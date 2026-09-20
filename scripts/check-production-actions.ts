import assert from "node:assert/strict";
import {
  hasExecutionVersions, matchesProductionAction, productionActionBody, reviewProductionAction,
} from "../src/features/production/utils/productionAction.ts";

const context = {
  orderId: "order-1", stepId: "step-1", expectedOrderVersion: 0, expectedStepVersion: 0,
  remainingQuantity: 10,
};
assert.equal(hasExecutionVersions(context), true, "Zero versions are valid");
assert.equal(hasExecutionVersions({ ...context, expectedOrderVersion: undefined }), false);
assert.equal(hasExecutionVersions({ ...context, expectedStepVersion: undefined }), false);
assert.equal(hasExecutionVersions({ ...context, expectedStepVersion: -1 }), false);
assert.throws(() => reviewProductionAction({ ...context, expectedStepVersion: undefined }, "record", 1, 0));
assert.throws(() => reviewProductionAction(context, "record", 0, 0), "Empty output cannot assume remaining quantity");
for (const bad of [NaN, Infinity, -1]) {
  assert.throws(() => reviewProductionAction(context, "record", bad, 1));
  assert.throws(() => reviewProductionAction(context, "record", 1, bad));
}
assert.throws(() => reviewProductionAction(context, "record", 9, 2));
assert.throws(() => reviewProductionAction(context, "complete", 0, 0), "Cannot advance before recording remaining output");
const partial = reviewProductionAction(context, "record", 3, 2, " Inspect seams ");
assert.deepEqual(productionActionBody(partial), {
  completedQuantity: 3, rejectedQuantity: 2, notes: "Inspect seams",
  expectedOrderVersion: 0, expectedStepVersion: 0,
});
assert.equal(matchesProductionAction(partial, context), true);
for (const patch of [
  { orderId: "other-order" }, { stepId: "other-step" }, { expectedOrderVersion: 1 },
  { expectedStepVersion: 1 }, { remainingQuantity: 9 },
]) {
  assert.equal(matchesProductionAction(partial, { ...context, ...patch }), false, "A confirmation must never silently follow changed state");
}
const completeContext = { ...context, remainingQuantity: 0 };
const advance = reviewProductionAction(completeContext, "complete", 0, 0);
assert.deepEqual(productionActionBody(advance), {
  completedQuantity: 0, rejectedQuantity: 0, notes: undefined,
  expectedOrderVersion: 0, expectedStepVersion: 0,
}, "Advancement must explicitly record zero quantities");
assert.throws(() => reviewProductionAction(completeContext, "complete", 1, 0));
const rejectedOnly = reviewProductionAction(context, "record", 0, 10);
assert.equal(rejectedOnly.completedQuantity, 0);
assert.equal(rejectedOnly.rejectedQuantity, 10);
context.expectedOrderVersion = 9;
context.stepId = "changed-after-review";
assert.equal(partial.expectedOrderVersion, 0);
assert.equal(partial.stepId, "step-1");
console.log("Production action confirmation checks passed.");

const flowContext = { ...completeContext, quantityModel: "FLOW_V1" as const, expectedFamilyVersion: 0, remainingQuantity: 0.3 };
assert.equal(hasExecutionVersions(flowContext), true);
assert.equal(hasExecutionVersions({ ...flowContext, expectedFamilyVersion: undefined }), false);
assert.equal(hasExecutionVersions({ ...flowContext, expectedFamilyVersion: -1 }), false);
assert.throws(() => reviewProductionAction(flowContext, "record", 0.1, 0.1));
const flowReview = reviewProductionAction(flowContext, "record", 0.3, 0, "good only");
assert.match(flowReview.requestId ?? "", /^[0-9a-f-]{36}$/);
assert.equal(productionActionBody(flowReview).expectedFamilyVersion, 0);
assert.equal(productionActionBody(flowReview).requestId, flowReview.requestId);
assert.deepEqual(productionActionBody(flowReview), productionActionBody(flowReview));
assert.equal(matchesProductionAction(flowReview, { ...flowContext, expectedFamilyVersion: 1 }), false);
assert.throws(() => reviewProductionAction(flowContext, "record", 0.301, 0));
assert.throws(() => reviewProductionAction(flowContext, "record", 0.0001, 0));
assert.doesNotThrow(() => reviewProductionAction({ ...context, remainingQuantity: 0.3 }, "record", 0.1, 0.2));
console.log("FLOW good-only, exact decimal and family-version confirmation checks passed.");
