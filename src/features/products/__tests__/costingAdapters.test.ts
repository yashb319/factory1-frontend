import { describe, expect, it } from "vitest";
import {
  toCostingPolicyRequest,
  toProductCostingView,
} from "../api/costingAdapters";

describe("costing DTO adapters", () => {
  it("preserves missing monetary values instead of creating zeroes", () => {
    const view = toProductCostingView({
      productId: "product-1",
      productCode: "FG-001",
      productName: "Cabinet",
      outputQuantity: "10",
      currency: "INR",
      status: "ESTIMATED",
      missingComponents: ["LABOUR allocation"],
      materialTotal: "1200.50",
      materialUnit: null,
      totalCost: "1200.50",
      totalUnitCost: null,
      policyId: "policy-1",
      policyVersion: 1,
      bomId: "bom-1",
      bomVersion: 7,
      snapshotId: "snapshot-1",
      snapshotVersion: 3,
      engineVersion: "costing-v1",
      asOfDate: "2026-10-04",
      sellingPriceBasis: "NONE",
      warnings: [],
      sourceLabels: [],
      evidence: [],
    });

    expect(view.quantity).toBe(10);
    expect(view.totalCost?.perUnit).toBeUndefined();
    expect(view.totalCost?.total).toBe(1200.5);
    expect(view.missingInputs).toEqual(["LABOUR allocation"]);
    expect(view.bomId).toBe("bom-1");
    expect(view.bomVersion).toBe("7");
    expect(view.immutableSnapshotId).toBe("snapshot-1");
    expect(view.snapshotVersion).toBe("3");
  });

  it("serializes policy form values without calculating allocated costs", () => {
    const request = toCostingPolicyRequest({
      name: "Default policy",
      currency: "INR",
      materialValuation: "LATEST_POSTED_PURCHASE",
      sellingPriceBasis: "LATEST_POSTED_SALE",
      pinnedBomId: "",
      outputQuantity: "10",
      labourMode: "PER_OUTPUT",
      labourAmount: "250.50",
      overheadMode: "TOTAL_ALLOCATION",
      overheadAmount: "100000",
      miscMode: "EXCLUDED",
      miscAmount: "",
      materialRates: [
        {
          clientId: "rate-1",
          inventoryItemId: "material-1",
          rate: "42.75",
          unit: "KG",
          currency: "INR",
        },
      ],
    });

    expect(request.labourAmount).toBe(250.5);
    expect(request.overheadAmount).toBe(100000);
    expect(request.materialRates).toEqual([
      {
        inventoryItemId: "material-1",
        rate: 42.75,
        unit: "KG",
        currency: "INR",
      },
    ]);
  });
});
