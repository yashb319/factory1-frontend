import { describe, expect, it } from "vitest";
import {
  toProfitSimulationRequest,
  toProfitSimulationResult,
} from "../api/profitSimulatorAdapters";
import { PROFIT_SIMULATOR_API_ROUTE } from "../api/profitSimulatorApi";
import type { ProfitSimulationResponseDto } from "../types/profitSimulatorApi.types";
import type {
  ProfitSimulatorBaseline,
  ProfitSimulatorDraft,
} from "../types/profitSimulator.types";

const baseline: ProfitSimulatorBaseline = {
  snapshot: {
    id: "0d62f7df-767f-4ab8-86a8-fc341df7ffdf",
    asOf: "2026-09-30",
    frozenAt: "2026-10-01T08:00:00Z",
    current: true,
  },
  completeness: "COMPLETE",
  warnings: [],
  currency: "INR",
  outputUnit: "PCS",
  sellingPrice: 150,
  outputQuantity: 10,
  materials: [
    {
      evidenceId: "14a5b95f-1d52-4c19-bbac-48f328f02b3f",
      inventoryItemId: "9e79e621-204d-4b44-9799-e18af68377f8",
      label: "Plywood",
      unit: "SQM",
      currency: "INR",
      quantityPerOutput: 2,
      rate: 40,
      quantitySupported: true,
      rateSupported: true,
      wasteSupported: true,
    },
  ],
  labour: { supported: true, mode: "PER_OUTPUT", amount: 10 },
  overhead: {
    supported: true,
    mode: "TOTAL_ALLOCATION",
    amount: 100,
  },
  misc: {
    supported: false,
    mode: "EXCLUDED",
    reason: "Excluded by policy.",
  },
};

const draft: ProfitSimulatorDraft = {
  selectorMode: "SNAPSHOT",
  snapshotId: baseline.snapshot.id,
  effectiveOnDate: "2026-09-30",
  sellingPrice: "160",
  outputQuantity: "12",
  materials: [
    {
      evidenceId: baseline.materials[0].evidenceId,
      quantityPerOutput: "2.5",
      rate: "40",
      wastePercentChange: "5",
    },
  ],
  labour: "12",
  overhead: "100",
  misc: "",
};

const response: ProfitSimulationResponseDto = {
  productId: "product-1",
  productCode: "FG-001",
  productName: "Cabinet",
  currency: "INR",
  outputUnit: "PCS",
  scale: 6,
  roundingMode: "HALF_UP",
  completeness: "COMPLETE",
  baseline: {
    outputQuantity: 10,
    sellingUnitPrice: 150,
    revenue: 1500,
    material: { total: 800, perOutput: 80 },
    labour: { total: 100, perOutput: 10 },
    overhead: { total: 100, perOutput: 10 },
    misc: { total: 0, perOutput: 0 },
    unitCost: 100,
    totalCost: 1000,
    totalContribution: 700,
    totalProfit: 500,
    marginPercent: 33,
    markupPercent: 50,
    breakEvenSellingPrice: 100,
    breakEvenVolume: 2,
  },
  scenario: {
    outputQuantity: 12,
    sellingUnitPrice: 160,
    revenue: 1921,
    material: { total: 950, perOutput: 79 },
    labour: { total: 144, perOutput: 12 },
    overhead: { total: 100, perOutput: 8 },
    misc: { total: 0, perOutput: 0 },
    unitCost: 99,
    totalCost: 1199,
    totalContribution: 971,
    totalProfit: 722,
    marginPercent: 37,
    markupPercent: 60,
    breakEvenSellingPrice: 99,
    breakEvenVolume: null,
    breakEvenVolumeUndefinedReason: "NO_FIXED_COSTS",
  },
  deltas: {
    outputQuantity: 2,
    sellingUnitPrice: 10,
    revenue: 421,
    materialTotal: 150,
    labourTotal: 44,
    overheadTotal: 0,
    miscTotal: 0,
    unitCost: -1,
    totalCost: 199,
    unitContribution: 9,
    totalContribution: 271,
    unitProfit: 11,
    totalProfit: 222,
    marginPercentagePoints: 4,
    markupPercentagePoints: 10,
  },
  appliedOverrides: [
    {
      category: "SELLING_PRICE",
      key: "selling",
      field: "unitPrice",
      baselineValue: 150,
      scenarioValue: 160,
    },
  ],
  ignoredOverrides: [
    {
      category: "OVERHEAD",
      key: "overhead",
      field: "amount",
      reason: "NO_CHANGE_FROM_BASELINE",
    },
  ],
  assumptions: ["Tax-exclusive selling price"],
  warnings: ["Estimate retained"],
  blockingReasons: [],
  provenance: {
    snapshotId: baseline.snapshot.id,
    snapshotVersion: 3,
    snapshotAsOfDate: "2026-09-30",
    frozenAt: "2026-10-01T08:00:00Z",
    policyId: "7f533bd7-04b5-41bd-a520-f8193b06cfa9",
    policyVersion: 2,
    bomId: "c2d857b3-340c-4bc0-a27b-f4e82c4fa49b",
    bomVersion: 4,
    sourceCostEngineVersion: "costing-1.0",
    simulationEngineVersion: "profit-simulation-1.0",
    baselineSelection: "SNAPSHOT_ID",
    requestedEffectiveOnDate: null,
    materials: [],
  },
};

describe("profit simulator adapters", () => {
  it("uses the authoritative side-effect-free simulation endpoint", () => {
    expect(PROFIT_SIMULATOR_API_ROUTE).toBe(
      "/api/costing/profitability/simulations"
    );
  });

  it("maps only changed direct assumptions to the exact nested request contract", () => {
    expect(toProfitSimulationRequest("product-1", draft, baseline)).toEqual({
      productId: "product-1",
      baseline: { snapshotId: baseline.snapshot.id },
      overrides: {
        selling: { unitPrice: 160 },
        volume: { outputQuantity: 12 },
        materials: [
          {
            evidenceId: baseline.materials[0].evidenceId,
            quantityPerOutput: 2.5,
            rate: undefined,
            wastePercentChange: 5,
            unit: "SQM",
            currency: "INR",
          },
        ],
        labour: { mode: "PER_OUTPUT", amount: 12 },
      },
    });
  });

  it("uses exactly one effective-date selector field", () => {
    const result = toProfitSimulationRequest(
      "product-1",
      {
        ...draft,
        selectorMode: "EFFECTIVE_DATE",
        sellingPrice: "150",
        outputQuantity: "10",
        materials: [
          {
            ...draft.materials[0],
            quantityPerOutput: "2",
            wastePercentChange: "",
          },
        ],
        labour: "10",
      },
      baseline
    );

    expect(result.baseline).toEqual({ effectiveOnDate: "2026-09-30" });
    expect(result.overrides).toEqual({});
  });

  it("enforces backend decimal scale and bounds at the request boundary", () => {
    expect(() =>
      toProfitSimulationRequest(
        "product-1",
        { ...draft, sellingPrice: "1.1234567" },
        baseline
      )
    ).toThrow(/6 decimal places/i);
    expect(() =>
      toProfitSimulationRequest(
        "product-1",
        { ...draft, outputQuantity: "0" },
        baseline
      )
    ).toThrow(/between/i);
  });

  it("preserves server metrics and deltas without calculating authoritative values", () => {
    const result = toProfitSimulationResult(response);
    expect(result.metrics.find((entry) => entry.key === "revenue")).toMatchObject({
      baseline: 1500,
      scenario: 1921,
      delta: 421,
    });
    expect(
      result.metrics.find((entry) => entry.key === "totalProfit")
    ).toMatchObject({ baseline: 500, scenario: 722, delta: 222 });
    expect(result.appliedAssumptions[0]?.reason).toContain("baseline 150");
    expect(result.ignoredAssumptions[0]?.reason).toBe(
      "NO_CHANGE_FROM_BASELINE"
    );
  });

  it("keeps blocked and undefined values missing and surfaces backend reasons", () => {
    const result = toProfitSimulationResult({
      ...response,
      completeness: "BLOCKED",
      baseline: null,
      scenario: null,
      deltas: null,
      blockingReasons: ["BASELINE_MATERIAL_EVIDENCE"],
    });

    expect(result.completeness).toBe("INCOMPLETE");
    expect(result.blockedReasons).toEqual(["BASELINE_MATERIAL_EVIDENCE"]);
    expect(result.metrics.every((entry) => entry.scenario === undefined)).toBe(
      true
    );

    const undefinedBreakEven = toProfitSimulationResult(response).metrics.find(
      (entry) => entry.key === "breakEvenVolume"
    );
    expect(undefinedBreakEven?.scenario).toBeUndefined();
    expect(undefinedBreakEven?.undefinedReason).toMatch(/no fixed costs/i);
  });
});
