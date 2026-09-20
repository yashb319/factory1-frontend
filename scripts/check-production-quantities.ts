/**
 * Run: node --experimental-strip-types scripts/check-production-quantities.ts
 * Exact, offline NUMERIC(15,3) quantity checks.
 */
import assert from "node:assert/strict";
import {
  compareProductionQuantities,
  formatProductionQuantity,
  parseProductionQuantity,
  productionQuantityUnits,
  sumProductionQuantities,
} from "../src/features/production/utils/productionQuantity.ts";

const valid: [string, number, string][] = [
  ["0", 0, "0.000"],
  ["0.000", 0, "0.000"],
  ["0.001", 1, "0.001"],
  ["0.1", 100, "0.100"],
  ["0.29", 290, "0.290"],
  ["1.005", 1005, "1.005"],
  ["0012.340", 12340, "12.340"],
  [" \t12.345\n", 12345, "12.345"],
  ["999999999999.998", 999999999999998, "999999999999.998"],
  ["999999999999.999", 999999999999999, "999999999999.999"],
];
for (const [input, units, formatted] of valid) {
  const parsed = parseProductionQuantity(input);
  assert.equal(productionQuantityUnits(input), units, input);
  assert.equal(productionQuantityUnits(parsed), units, input);
  assert.equal(formatProductionQuantity(parsed), formatted, input);
  assert.ok(Number.isFinite(parsed), input);
  if (units > 0) assert.equal(parseProductionQuantity(input, { positive: true }), parsed);
}

for (const input of [
  "", " ", "\t\n", "-1", "-0", "-0.001", "+1", ".001", "1.", "1.0000",
  "0.0001", "999999999999.9991", "1000000000000", "1000000000000.000",
  "999999999999999999999999999999999", "1e3", "1E-3", "0x10",
  "NaN", "Infinity", "-Infinity", "1,000.000", "1_000", "1 2", "1\n2",
  "12kg", "١", "１２", "1.2.3",
]) {
  assert.throws(() => productionQuantityUnits(input), Error, input);
  assert.throws(() => parseProductionQuantity(input), Error, input);
}
for (const input of [NaN, Infinity, -Infinity, -1, -0, 0.0001, 1e21, 1e-7, 1e12, 0.1 + 0.2]) {
  assert.throws(() => productionQuantityUnits(input), Error, String(input));
  assert.equal(formatProductionQuantity(input), "Unavailable");
}
for (const input of ["0", "0.000", " 000.00 "]) {
  assert.equal(parseProductionQuantity(input), 0);
  assert.equal(parseProductionQuantity(input, { positive: false }), 0);
  assert.throws(() => parseProductionQuantity(input, { positive: true }), /greater than zero/);
}
assert.equal(formatProductionQuantity(null), "Unavailable");
assert.equal(formatProductionQuantity(undefined), "Unavailable");
assert.equal(formatProductionQuantity(0), "0.000");
assert.equal(sumProductionQuantities([]), 0);
assert.equal(sumProductionQuantities([0.1, 0.2]), 0.3);
assert.equal(productionQuantityUnits(sumProductionQuantities([0.1, 0.2])), 300);
assert.equal(sumProductionQuantities(["0.001", "0.001"]), 0.002);
assert.equal(sumProductionQuantities(["999999999999.998", "0.001"]), 999999999999.999);
assert.equal(sumProductionQuantities(Array.from({ length: 1000 }, () => "0.001")), 1);
assert.throws(() => sumProductionQuantities(["999999999999.999", "0.001"]), /Total quantity/);
assert.throws(() => sumProductionQuantities([NaN]), Error);
assert.throws(() => sumProductionQuantities([-0.001]), Error);
assert.equal(compareProductionQuantities("0.100", 0.1), 0);
assert.equal(compareProductionQuantities(sumProductionQuantities([0.1, 0.2]), "0.300"), 0);
assert.equal(compareProductionQuantities("0.001", 0), 1);
assert.equal(compareProductionQuantities("999999999999.998", "999999999999.999"), -1);
assert.throws(() => compareProductionQuantities("NaN", 0), Error);
assert.throws(() => compareProductionQuantities(0, Infinity), Error);

// Cover decimal conversion on both sides of the floating-point precision boundary.
for (const base of [0, 1000, 999999999990000]) {
  for (let offset = 0; offset < 1000; offset += 1) {
    const units = base + offset;
    const text = `${Math.floor(units / 1000)}.${String(units % 1000).padStart(3, "0")}`;
    const parsed = parseProductionQuantity(text);
    assert.equal(productionQuantityUnits(parsed), units, text);
    assert.equal(formatProductionQuantity(parsed), text, text);
  }
}

console.log("Production quantity checks passed: strict parsing, exact units/sums/comparisons, bounds, unavailable values, and 3000 roundtrips.");
