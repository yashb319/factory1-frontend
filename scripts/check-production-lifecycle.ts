import assert from "node:assert/strict";
import {
  bomRevision, buildPinnedMaterialRequirements, isSelectableBom,
  validBomRequest, workflowRevision,
} from "../src/features/production/utils/lifecycle.ts";
import type { Bom, ProductionOrder, WorkflowTemplate, WorkflowVersion } from "../src/features/production/types/production.types.ts";

const bom: Bom = {
  id: "bom-1", productId: "product-1", name: "Original BOM", versionNumber: 1,
  active: true, status: "PUBLISHED",
  items: [{ id: "line-1", inventoryItemId: "material-1", itemName: "Cotton", quantityPerUnit: 2, unit: "KG", wastePercentage: 10 }],
};
const template: WorkflowTemplate = { id: "workflow-1", code: "CUT", name: "Original template", active: true };
const version: WorkflowVersion = {
  id: "version-4", templateId: template.id, versionNumber: 4, name: "Revised workflow", description: "Revision metadata",
  status: "PUBLISHED",
  steps: [
    { id: "step-2", name: "Pack", code: "PACK", sequenceNumber: 2, active: true, workstation: "Packaging", roleMetadata: "Checker" },
    { id: "step-1", name: "Cut", code: "CUT", sequenceNumber: 1, active: true, description: "Carefully" },
  ],
};
const order: ProductionOrder = {
  id: "order-1", orderNumber: "ORDER-1", productId: bom.productId, plannedQuantity: 10,
  completedQuantity: 5, rejectedQuantity: 0, remainingQuantity: 5, priority: "NORMAL",
  workflowVersionId: version.id, workflowVersionNumber: 4, responsibleUserId: "operator-1",
  status: "IN_PROGRESS", steps: [], executionVersion: 0,
  bomId: bom.id, bomVersionNumber: 1, bomBindingStatus: "PINNED",
};

assert.equal(isSelectableBom(bom, bom.productId), true);
assert.equal(isSelectableBom({ ...bom, active: false }, bom.productId), false, "Archived BOM must not be selectable");
assert.equal(isSelectableBom({ ...bom, status: "DRAFT" }, bom.productId), false, "Draft must not be selectable");
assert.equal(isSelectableBom(bom, "another-product"), false, "Wrong product BOM must not be selectable");

const workflowDraft = workflowRevision(template, version);
assert.equal(workflowDraft.name, version.name, "Revision name must not revert to template identity");
assert.equal(workflowDraft.description, version.description);
assert.equal(workflowDraft.code, template.code);
assert.deepEqual(workflowDraft.steps.map((step) => step.code), ["CUT", "PACK"]);
assert.equal("id" in workflowDraft.steps[0], false, "Snapshot IDs must not be reused");
workflowDraft.steps[0].name = "Changed cut";
assert.equal(version.steps[1].name, "Cut", "Original workflow must not mutate");
assert.equal(workflowDraft.steps[1].roleMetadata, "Checker");

const bomDraft = bomRevision(bom);
assert.equal("id" in bomDraft.items[0], false);
bomDraft.items[0].quantityPerUnit = 3;
assert.equal(bom.items[0].quantityPerUnit, 2, "Original BOM must not mutate");
assert.equal(validBomRequest(bomDraft), true);
assert.equal(validBomRequest({ ...bomDraft, items: [] }), false);
assert.equal(validBomRequest({ ...bomDraft, items: [bomDraft.items[0], bomDraft.items[0]] }), false);
for (const quantityPerUnit of [0, -1, NaN, Infinity]) {
  assert.equal(validBomRequest({ ...bomDraft, items: [{ ...bomDraft.items[0], quantityPerUnit }] }), false);
}
for (const wastePercentage of [-1, NaN, Infinity]) {
  assert.equal(validBomRequest({ ...bomDraft, items: [{ ...bomDraft.items[0], wastePercentage }] }), false);
}

const requirements = buildPinnedMaterialRequirements({ ...bom, active: false }, [], order);
assert.equal(requirements.length, 1, "Archived pinned BOM must still provide order requirements");
assert.equal(requirements[0].estimatedRequiredQuantity, 11, "Remaining quantity must include 10% waste");
assert.equal(requirements[0].itemName, "Cotton", "Historical item metadata must survive missing inventory");
assert.equal(requirements[0].availableQuantity, undefined, "Missing stock must not silently become zero");
assert.equal(requirements[0].shortage, undefined);
assert.deepEqual(buildPinnedMaterialRequirements({ ...bom, id: "new-bom" }, [], order), [], "Never substitute latest BOM");
assert.deepEqual(buildPinnedMaterialRequirements(bom, [], { ...order, bomId: null, bomBindingStatus: "LEGACY_UNRESOLVED" }), []);
assert.deepEqual(buildPinnedMaterialRequirements(bom, [], { ...order, bomBindingStatus: "LEGACY_UNRESOLVED" }), []);
assert.equal(buildPinnedMaterialRequirements(bom, [], { ...order, bomBindingStatus: "LEGACY_SELECTED" })[0].estimatedRequiredQuantity, 11);
assert.equal(buildPinnedMaterialRequirements(bom, [], { ...order, remainingQuantity: 0 })[0].estimatedRequiredQuantity, 0);
assert.deepEqual(buildPinnedMaterialRequirements(undefined, [], order), []);
console.log("Production lifecycle checks passed.");
