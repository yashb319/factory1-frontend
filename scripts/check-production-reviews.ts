import assert from "node:assert/strict";
import { captureProductionReview, productionReviewIsCurrent } from "../src/features/production/utils/productionReview.ts";
import type { FlowPreview, ShortClosePreviewRequest } from "../src/features/production/types/productionFlow.types.ts";
import type { OrderStep, ProductionOrder } from "../src/features/production/types/production.types.ts";

const step: OrderStep = { id: "source-step", name: "Cut", code: "CUT", sequenceNumber: 1, active: true, expectedVersion: 0 };
const order: ProductionOrder = {
  id: "source-order", orderNumber: "REQ-10", productId: "product", plannedQuantity: 10, priority: "NORMAL",
  workflowVersionId: "workflow", workflowVersionNumber: 1, responsibleUserId: "manager",
  bomId: "bom", bomVersionNumber: 1, bomBindingStatus: "PINNED", status: "IN_PROGRESS",
  executionVersion: 0, currentStepId: step.id, steps: [step],
  completedQuantity: 0, rejectedQuantity: 0, remainingQuantity: 10,
  batch: { rootOrderId: "root", parentOrderId: "root", childSequence: 1, batchLabel: "REQ-10/child1",
    nodeType: "LEAF", isExecutable: true, isTerminal: false, closureOutcome: "NONE", familyVersion: 0 },
};
const body: ShortClosePreviewRequest = {
  reason: "Short", expectedOrderVersion: 0, expectedStepVersion: 0, expectedFamilyVersion: 0,
  dispositions: [{ type: "SCRAP", quantity: 2, reason: "Damaged", source: { kind: "NEW_UNRECORDED" }, materialWaste: [], noMaterialWasteReason: "No material lost" }],
};
const preview: FlowPreview = {
  previewToken: "opaque", action: "SHORT_CLOSE", sourceOrderId: order.id, sourceStepId: step.id,
  expectedOrderVersion: 0, expectedStepVersion: 0, expectedFamilyVersion: 0, blockingReasons: [],
};
const review = captureProductionReview(order.id, step.id, "SHORT_CLOSE", "draft", body, preview);
assert.match(review.body.requestId, /^[0-9a-f-]{36}$/);
assert.equal(productionReviewIsCurrent(review, order, step, "draft"), true);
const captured = JSON.stringify(review.body);
body.dispositions[0].quantity = 9;
preview.previewToken = "changed";
assert.equal(review.body.dispositions[0].quantity, 2);
assert.equal(review.body.previewToken, "opaque");
assert.equal(review.preview.previewToken, "opaque");
assert.equal(JSON.stringify(review.body), captured, "Exact confirmed body remains stable for an explicit identical-request retry");
for (const changed of [
  { ...order, id: "other" }, { ...order, executionVersion: 1 },
  { ...order, batch: { ...order.batch!, familyVersion: 1 } },
]) assert.equal(productionReviewIsCurrent(review, changed, step, "draft"), false);
assert.equal(productionReviewIsCurrent(review, order, { ...step, id: "next" }, "draft"), false);
assert.equal(productionReviewIsCurrent(review, order, { ...step, expectedVersion: 1 }, "draft"), false);
assert.equal(productionReviewIsCurrent(review, order, step, "edited draft"), false);
for (const change of [
  { action: "SPLIT_ADVANCE" }, { sourceOrderId: "wrong" }, { sourceStepId: "wrong" },
  { expectedOrderVersion: 1 }, { expectedStepVersion: 1 }, { expectedFamilyVersion: 1 }, { previewToken: "" },
]) assert.throws(() => captureProductionReview(order.id, step.id, "SHORT_CLOSE", "draft", body, { ...review.preview, ...change }));
const blocked = captureProductionReview(order.id, step.id, "SHORT_CLOSE", "draft", body, {
  ...review.preview, blockingReasons: [{ code: "INSUFFICIENT_STOCK", message: "Not enough stock", remediation: "Review issues" }],
});
assert.equal(blocked.preview.blockingReasons[0].code, "INSUFFICIENT_STOCK");
assert.equal("readyChild" in review.preview, false, "Review never invents child UUIDs");
console.log("Production preview checks passed: captured source/action/versions, immutable payloads, stale drafts and explicit retry identity.");
