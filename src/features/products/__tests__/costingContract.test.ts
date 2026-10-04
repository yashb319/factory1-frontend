import { describe, expect, it } from "vitest";
import {
  costingDecimal,
  unwrapCostingEnvelope,
} from "../api/costingContract";

describe("costing contract helpers", () => {
  it("unwraps a successful standard API envelope", () => {
    expect(
      unwrapCostingEnvelope({
        success: true,
        message: "Loaded",
        data: { status: "COMPLETE" },
      })
    ).toEqual({ status: "COMPLETE" });
  });

  it("does not accept a success-shaped response when success is false", () => {
    expect(() =>
      unwrapCostingEnvelope({
        success: false,
        message: "Policy must be published",
        data: { status: "BLOCKED" },
      })
    ).toThrow("Policy must be published");
  });

  it("preserves missing decimal values and rejects malformed values", () => {
    expect(costingDecimal(null, "totalCost")).toBeUndefined();
    expect(costingDecimal("12.50", "totalCost")).toBe(12.5);
    expect(() => costingDecimal("unknown", "totalCost")).toThrow(
      "Invalid numeric value returned for totalCost."
    );
  });
});
