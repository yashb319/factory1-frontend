import assert from "node:assert/strict";
import type { MaterialAvailability, MaterialAvailabilityItem } from "../src/features/production/types/productionFlow.types.ts";
import { materialAvailabilityPageError } from "../src/features/production/utils/materialAvailability.ts";

const item = (consumptionId: string): MaterialAvailabilityItem => ({
  consumptionId, rootOrderId: "root", productionOrderId: "root", sourceOrderId: "root",
  source: "MANUAL", inventoryItemId: "steel", lotNumber: null, unit: "KG",
  originalQuantity: 1, goodCoveredQuantity: 0, scrapAllocatedQuantity: 0,
  remainingAllocatableQuantity: 1,
});
const first: MaterialAvailability = {
  rootOrderId: "root", familyVersion: 7, page: 0, size: 2,
  totalElements: 3, totalPages: 2, items: [item("a"), item("b")],
};
const second: MaterialAvailability = { ...first, page: 1, items: [item("c")] };
assert.equal(materialAvailabilityPageError(first, 0, undefined, []), undefined);
assert.equal(materialAvailabilityPageError(second, 1, first, first.items), undefined);
assert.equal(materialAvailabilityPageError({ ...first, items: [], totalElements: 0, totalPages: 0 }, 0, undefined, []), undefined);
for (const change of [
  { rootOrderId: "other" }, { familyVersion: 8 }, { totalElements: 4, items: [item("c"), item("d")] },
  { size: 1, totalPages: 3 },
]) assert.match(materialAvailabilityPageError({ ...second, ...change }, 1, first, first.items) ?? "", /changed/);
for (const change of [
  { page: 2 }, { size: 0 }, { size: 201 }, { totalPages: 3 }, { totalElements: -1 },
  { familyVersion: Number.NaN }, { rootOrderId: "" },
]) assert.match(materialAvailabilityPageError({ ...second, ...change }, 1, first, first.items) ?? "", /invalid/);
for (const items of [[], [item("b")], [item("c"), item("d")], [item("")]]) {
  assert.match(materialAvailabilityPageError({ ...second, items }, 1, first, first.items) ?? "", /missing or repeated/);
}
assert.match(materialAvailabilityPageError({ ...first, items: [item("a"), item("a")] }, 0, undefined, []) ?? "", /repeated/);
console.log("Material pagination checks passed: complete pages, stable identity/version/counts, empty families, missing/duplicate rows and bounds.");
