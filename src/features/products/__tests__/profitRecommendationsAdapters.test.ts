import { describe, expect, it } from "vitest";
import {
  toProfitCenterDashboard,
  toProfitRecommendation,
} from "../api/profitRecommendationsAdapters";
import type {
  ProfitCenterDashboardDto,
  ProfitRecommendationDto,
} from "../types/profitRecommendationsApi.types";

const recommendation: ProfitRecommendationDto = {
  id: "rec-1",
  productId: "product/1",
  productCode: "FG-001",
  productName: "Cabinet",
  type: "MARKET_PRICE_EVIDENCE",
  severity: "WARNING",
  title: "Review accepted market evidence",
  summary: "Fresh accepted comparables are available for review.",
  evidence: {
    schemaVersion: "1.0",
    profitability: { costCoveragePercent: "82.5", completeness: "COMPLETE" },
    snapshot: { id: "snapshot-1" },
    market: {
      runIds: ["run-1"],
      comparableIds: ["comparable-1"],
      sampleCount: 3,
      channel: "WHOLESALE",
      currency: "INR",
      expiresAt: "2026-10-10T00:00:00Z",
      confidence: "HIGH",
    },
  },
  impactAmount: null,
  impactPercent: null,
  impactCurrency: null,
  impactUnavailableReason: "Market evidence is observational only.",
  confidence: "HIGH",
  dataQuality: "COMPLETE",
  ruleVersion: "rules-6",
  engineVersion: "engine-3",
  fingerprint: "fingerprint",
  status: "OPEN",
  firstSeenAt: "2026-10-05T00:00:00Z",
  lastSeenAt: "2026-10-05T00:00:00Z",
  generatedAt: "2026-10-05T00:00:00Z",
  expiresAt: "2026-10-10T00:00:00Z",
  version: 4,
};

const dashboard: ProfitCenterDashboardDto = {
  period: { from: "2026-07-01", to: "2026-09-30" },
  summary: {
    totalAttributedRevenue: "1000",
    totalAttributedCost: "700",
    totalContribution: "123.45",
    contributionMarginPercent: "9.87",
    unallocatedRevenue: "250",
    unallocatedLineCount: 2,
    attributionCoveragePercent: "80",
    costCoveragePercent: "70",
    currency: "INR",
    currencyUnavailableReason: null,
  },
  costComposition: {
    materialAmount: "401",
    labourAmount: "199",
    overheadAmount: "80",
    miscAmount: "20",
    totalAttributedCost: "700",
    materialPercent: "57.29",
    labourPercent: "28.43",
    overheadPercent: "11.43",
    miscPercent: "2.85",
    currency: "INR",
    currencyUnavailableReason: null,
    reconciliationDifference: "0.000000",
  },
  dataCoverage: {
    productCount: 5,
    completeProductCount: 3,
    incompleteProductCount: 2,
    currentSnapshotCount: 2,
    agingSnapshotCount: 1,
    staleSnapshotCount: 1,
    missingSnapshotCount: 1,
    attributionCoveragePercent: "80",
    costCoveragePercent: "70",
  },
  recommendationCountsByStatus: { OPEN: 3, RESOLVED: 1 },
  recommendationCountsBySeverity: { HIGH: 1, WARNING: 2 },
  recommendationCountsByType: {
    LOW_CONTRIBUTION_MARGIN: 2,
    COST_DATA_INCOMPLETE_OR_STALE: 1,
  },
  topProducts: [
    {
      productId: "product-1",
      productCode: "FG-001",
      productName: "Cabinet",
      attributedRevenue: "500",
      contribution: "100",
      contributionMarginPercent: "20",
      completeness: "COMPLETE",
      freshness: "CURRENT",
    },
  ],
  bottomProducts: [],
  trends: [
    {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      attributedRevenue: "400",
      attributedCost: "350",
      contribution: "-17.25",
      contributionMarginPercent: "-4.31",
      costCoveragePercent: "90",
    },
  ],
  opportunityCategories: [
    {
      type: "LOW_CONTRIBUTION_MARGIN",
      count: 2,
      deterministicImpactAmount: null,
      impactCurrency: null,
      impactUnavailableReason: "Incomplete facts",
    },
  ],
  metadata: {
    revenueBasis: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE",
    costBasis: "EFFECTIVE_FROZEN_SNAPSHOT",
    profitabilityRuleVersion: "profit-2",
    recommendationRuleVersion: "rules-6",
    dateBoundary: "INCLUSIVE",
    lastGeneratedAt: "2026-10-05T00:00:00Z",
  },
};

describe("profit recommendation adapters", () => {
  it("preserves server dashboard facts without deriving financial arithmetic", () => {
    const result = toProfitCenterDashboard(dashboard);

    expect(result.attributedRevenue.value).toBe(1000);
    expect(result.frozenProductCost.value).toBe(700);
    expect(result.contributionProfit.value).toBe(123.45);
    expect(result.contributionMarginPercent).toBe(9.87);
    expect(result.trends[0].contributionProfit.value).toBe(-17.25);
    expect(result.costComposition.map((entry) => entry.value?.value)).toEqual([
      401, 199, 80, 20,
    ]);
    expect(result.costComposition[3].note).toContain("0.000000");
    expect(result.dataGapReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("2 products"),
        expect.stringContaining("1 product"),
      ])
    );
  });

  it("maps nullable impact reasons and strict structured market evidence", () => {
    const result = toProfitRecommendation(recommendation);

    expect(result.impact.amount).toBeNull();
    expect(result.impact.unavailableReason).toBe(
      "Market evidence is observational only."
    );
    expect(result.allowedActions).toEqual([
      "ACKNOWLEDGE",
      "DISMISS",
      "RESOLVE",
    ]);
    expect(result.profitabilityCoverage).toBe(82.5);
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: "MARKET_EVIDENCE",
          label: "Review market evidence",
          sourceCount: 3,
          channel: "WHOLESALE",
          currency: "INR",
        }),
      ])
    );
  });

  it("makes expired and resolved recommendations read-only", () => {
    expect(
      toProfitRecommendation({ ...recommendation, status: "EXPIRED" })
        .allowedActions
    ).toEqual([]);
    expect(
      toProfitRecommendation({ ...recommendation, status: "RESOLVED" })
        .allowedActions
    ).toEqual([]);
  });
});
