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
