import { describe, expect, it } from "vitest";
import {
  costingStatusDescription,
  formatCostingAmount,
  formatCostingMoney,
} from "../utils/costingPresentation";

describe("costing presentation", () => {
  it("never renders a missing amount as zero", () => {
    expect(formatCostingMoney(undefined, "INR")).toBe("Not available");
    expect(formatCostingAmount({ currency: "INR", perUnit: null }, "perUnit")).toBe(
      "Not available"
    );
  });

  it("still renders an explicit zero returned by the server", () => {
    expect(formatCostingMoney(0, "INR")).toContain("0");
  });

  it("does not describe estimated or blocked values as true cost", () => {
    expect(costingStatusDescription("ESTIMATED")).toContain("not a true cost");
    expect(costingStatusDescription("BLOCKED")).toContain("cannot be produced");
  });
});
