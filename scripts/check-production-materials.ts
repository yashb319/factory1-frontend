/**
 * Run: node --experimental-strip-types scripts/check-production-materials.ts
 * Bounded offline payload and validation assertions; not browser or API tests.
 */
import assert from "node:assert/strict";
import {
  materialAllocationLines, materialCoverageLines, productionDispositions,
  type DispositionDraft, type MaterialAllocationDraft, type MaterialSourceOption,
} from "../src/features/production/utils/materialAllocation.ts";

const sourceId = "12345678-1234-1234-1234-123456789abc";
const options: MaterialSourceOption[] = [{
  consumptionId: "issue-1", inventoryItemId: "material-1", sourceOrderId: "ancestor",
  itemLabel: "Steel", unit: "kg", remainingAllocatableQuantity: 0.3,
}];
const material = (overrides: Partial<MaterialAllocationDraft> = {}): MaterialAllocationDraft => ({
  key: "line", source: "EXISTING_CONSUMPTION", inventoryItemId: "material-1",
  consumptionId: "issue-1", itemLabel: "Steel", unit: "kg", quantity: "0.100",
  lotNumber: "", ...overrides,
});
const disposition = (overrides: Partial<DispositionDraft> = {}): DispositionDraft => ({
  key: "disposition", type: "SCRAP", quantity: "1.005", reason: " Damaged during processing ",
  sourceKind: "NEW_UNRECORDED", sourceType: "STEP_EXECUTION", sourceId: "",
  neverProducedAttestation: false, noMaterialWasteReason: "", materials: [material()], ...overrides,
});
const issueLine = {
  source: "EXISTING_CONSUMPTION", consumptionId: "issue-1",
  inventoryItemId: "material-1", quantity: 0.1, unit: "kg",
};

assert.deepEqual(productionDispositions([disposition()], options), [{
  type: "SCRAP", quantity: 1.005, reason: "Damaged during processing",
  source: { kind: "NEW_UNRECORDED" }, materialWaste: [issueLine],
}]);
for (const sourceType of ["STEP_EXECUTION", "EXECUTION_BATCH"] as const) {
  assert.deepEqual(productionDispositions([disposition({
    sourceKind: "EXISTING_REJECTION", sourceType, sourceId: ` ${sourceId} `,
  })], options)[0].source, { kind: "EXISTING_REJECTION", sourceType, sourceId });
}
assert.deepEqual(productionDispositions([disposition({
  materials: [], noMaterialWasteReason: " No physical material wasted ",
})], options)[0], {
  type: "SCRAP", quantity: 1.005, reason: "Damaged during processing",
  source: { kind: "NEW_UNRECORDED" }, materialWaste: [],
  noMaterialWasteReason: "No physical material wasted",
});
assert.deepEqual(productionDispositions([disposition({
  type: "CANCEL_UNPRODUCED", materials: [], neverProducedAttestation: true,
  noMaterialWasteReason: "not submitted", quantity: "2.001",
})], options)[0], {
  type: "CANCEL_UNPRODUCED", quantity: 2.001, reason: "Damaged during processing",
  source: { kind: "NEW_UNRECORDED" }, neverProducedAttestation: true,
});
assert.deepEqual(materialAllocationLines([material({
  source: "NEW_STOCK", consumptionId: "", quantity: "0.002", lotNumber: " lot-A ",
})], []), [{
  source: "NEW_STOCK", inventoryItemId: "material-1", quantity: 0.002, unit: "kg", lotNumber: "lot-A",
}]);
assert.deepEqual(materialCoverageLines([material()], options), [{
  consumptionId: "issue-1", inventoryItemId: "material-1", quantity: 0.1, unit: "kg",
}]);
assert.deepEqual(Object.keys(materialCoverageLines([material()], options)[0]).sort(),
  ["consumptionId", "inventoryItemId", "quantity", "unit"]);
assert.equal("noMaterialWasteReason" in productionDispositions([disposition({
  noMaterialWasteReason: "ignored when actual waste exists",
})], options)[0], false);

// Decimal-unit accumulation spans both separate material lines and dispositions.
const fullBalance = [material(), material({ key: "second", quantity: "0.200" })];
assert.equal(materialAllocationLines(fullBalance, options).length, 2);
assert.equal(productionDispositions(fullBalance.map((line, index) =>
  disposition({ key: String(index), materials: [line] })), options).length, 2);
assert.throws(() => materialAllocationLines([...fullBalance, material({ quantity: "0.001" })], options), /exceed/);
assert.throws(() => productionDispositions([
  disposition({ materials: [material({ quantity: "0.200" })] }),
  disposition({ key: "second", materials: [material({ quantity: "0.101" })] }),
], options), /exceed/);
assert.throws(() => materialAllocationLines([material()], []), /eligible/);
assert.throws(() => materialAllocationLines([material({ inventoryItemId: "other" })], options), /eligible/);
assert.throws(() => materialAllocationLines([material({ unit: "litre" })], options), /eligible/);
assert.throws(() => materialAllocationLines([material({ inventoryItemId: "" })], options), /Select a material/);
assert.throws(() => materialAllocationLines([material({ unit: "" })], options), /Select a material/);
assert.throws(() => materialAllocationLines([material({ source: "NEW_STOCK", lotNumber: " " })], options), /lot number/);
assert.throws(() => materialAllocationLines([material({ source: "NEW_STOCK", lotNumber: "x".repeat(151) })], options), /150 characters/);
assert.equal(materialAllocationLines([material({ source: "NEW_STOCK", lotNumber: "x".repeat(150) })], options).length, 1);
assert.throws(() => materialCoverageLines([material({ source: "NEW_STOCK", lotNumber: "A" })], options), /already-consumed/);
assert.throws(() => productionDispositions([], options), /at least one/);
assert.throws(() => productionDispositions([disposition({ reason: " " })], options), /reason/);
assert.throws(() => productionDispositions([disposition({ materials: [], noMaterialWasteReason: " " })], options), /no material waste/);
assert.throws(() => productionDispositions([disposition({
  type: "CANCEL_UNPRODUCED", materials: [],
})], options), /never physically produced/);
assert.throws(() => productionDispositions([disposition({
  type: "CANCEL_UNPRODUCED", neverProducedAttestation: true,
})], options), /cannot contain material/);
for (const invalidId of ["", "step-1", "12345678-1234-1234-1234-123456789abg", `${sourceId}extra`]) {
  assert.throws(() => productionDispositions([disposition({
    sourceKind: "EXISTING_REJECTION", sourceId: invalidId,
  })], options), /source UUID/);
}
for (const invalidQuantity of ["", "0", "-1", ".5", "1.", "1.0001", "1e3", "NaN", "Infinity", "1,000", "1000000000000"]) {
  assert.throws(() => productionDispositions([disposition({ quantity: invalidQuantity })], options), Error, invalidQuantity);
  assert.throws(() => materialAllocationLines([material({ quantity: invalidQuantity })], options), Error, invalidQuantity);
  assert.throws(() => materialCoverageLines([material({ quantity: invalidQuantity })], options), Error, invalidQuantity);
}
console.log("Production material checks passed: exact payloads, shared issue capacity, stock lots, waste reasons, cancellation attestation, source UUIDs, decimals and coverage shape.");
