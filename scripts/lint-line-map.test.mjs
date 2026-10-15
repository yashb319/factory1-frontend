import { test } from "node:test";
import assert from "node:assert/strict";
import { originalLine } from "./lint-line-map.mjs";

test("new/modified lines never inherit baseline violations", () => {
  const patch = "@@ -3,2 +3,4 @@\n";
  assert.equal(originalLine(patch, 2), 2);
  assert.equal(originalLine(patch, 3), null);
  assert.equal(originalLine(patch, 6), null);
  assert.equal(originalLine(patch, 7), 5);
});
test("zero-length deletion anchors map subsequent unchanged lines correctly", () => {
  assert.equal(originalLine("@@ -3 +2,0 @@\n", 2), 2);
  assert.equal(originalLine("@@ -3 +2,0 @@\n", 3), 4);
});
test("insertions and multiple hunks preserve exact original positions", () => {
  const patch = "@@ -2,0 +3,2 @@\n@@ -8 +9,0 @@\n";
  assert.equal(originalLine(patch, 2), 2);
  assert.equal(originalLine(patch, 3), null);
  assert.equal(originalLine(patch, 5), 3);
  assert.equal(originalLine(patch, 9), 7);
  assert.equal(originalLine(patch, 10), 9);
  assert.equal(originalLine(patch, 11), 10);
});
