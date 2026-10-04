import { describe, expect, it } from "vitest";
import { getErrorMessage } from "../apiError";

describe("getErrorMessage", () => {
  it("surfaces standard and detailed backend errors", () => {
    expect(getErrorMessage({ data: { message: "Policy is stale" } }, "Fallback")).toBe(
      "Policy is stale"
    );
    expect(getErrorMessage({ data: { detail: "BOM version is missing" } }, "Fallback")).toBe(
      "BOM version is missing"
    );
  });

  it("surfaces RTK transport errors before using the fallback", () => {
    expect(getErrorMessage({ error: "Network request failed" }, "Fallback")).toBe(
      "Network request failed"
    );
  });
});
