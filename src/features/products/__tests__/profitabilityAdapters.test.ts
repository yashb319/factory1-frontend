import { describe, expect, it } from "vitest";
import {
  toProductProfitabilityDetail,
  toProductProfitabilitySummary,
  toProfitabilityPortfolio,
} from "../api/profitabilityAdapters";
import type {
  ProductProfitabilityDetailDto,
  ProductProfitabilityItemDto,
  ProductProfitabilityTrendsDto,
} from "../types/profitabilityApi.types";

const completeItem: ProductProfitabilityItemDto = {
  productId: "product-1",
  productCode: "FG-001",
  productName: "Cabinet",
  unit: "PCS",
  active: true,
  snapshotId: "snapshot-1",
  snapshotVersion: 3,
  snapshotAsOfDate: "2026-09-30",
  snapshotFrozenAt: "2026-10-01T08:00:00Z",
  snapshotAgeDays: 4,
  snapshotFreshness: "CURRENT",
  snapshotStatus: "COMPLETE",
  currency: "INR",
  sellingPriceBasis: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE",
  frozenSellingUnitPrice: "150.000000",
  frozenUnitCost: "100.000000",
  realizedRevenue: "1500.000000",
  realizedQuantity: "10.000000",
  realizedCost: "1000.000000",
  unitRevenue: "150.000000",
  unitCost: "100.000000",
  unitProfit: "50.000000",
  profit: "500.000000",
  marginPercent: "33.333333",
  costCoveragePercent: "100.000000",
  attributedLineCount: 2,
  missingCostLineCount: 0,
  completeness: "COMPLETE",
  health: "WATCH",
};

describe("profitability adapters", () => {
  it("maps exact server health wording without recalculating metrics", () => {
    const result = toProductProfitabilitySummary(completeItem);

    expect(result.health).toBe("OPPORTUNITY");
    expect(result.unitProfit.value).toBe(50);
    expect(result.marginPercent).toBe(33.333333);
    expect(result.snapshot?.costingSnapshotId).toBe("snapshot-1");
  });

  it("never promotes incomplete or estimated evidence to a defensible health", () => {
    const result = toProductProfitabilitySummary({
      ...completeItem,
      snapshotStatus: "ESTIMATED",
      completeness: "ESTIMATED",
      health: "HEALTHY",
      unitProfit: null,
      profit: null,
      marginPercent: null,
      missingCostLineCount: 1,
    });

    expect(result.health).toBe("UNKNOWN");
    expect(result.completeness).toBe("ESTIMATED");
    expect(result.unitProfit.value).toBeUndefined();
    expect(result.marginPercent).toBeUndefined();
    expect(result.reasons.join(" ")).toMatch(/estimates/i);
  });

  it("preserves missing profit and margin instead of deriving them client-side", () => {
    const result = toProductProfitabilitySummary({
      ...completeItem,
      realizedRevenue: 1000,
      realizedQuantity: 10,
      realizedCost: 800,
      frozenUnitCost: 80,
      unitProfit: null,
      profit: null,
      marginPercent: null,
      completeness: "INCOMPLETE",
      health: "UNKNOWN",
      missingCostLineCount: 1,
    });

    expect(result.unitProfit.value).toBeUndefined();
    expect(result.marginPercent).toBeUndefined();
  });

  it("maps portfolio summary and explicit unallocated sales", () => {
    const result = toProfitabilityPortfolio({
      products: {
        content: [completeItem],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
      summary: {
        totalAttributedRevenue: 1500,
        totalAttributedCost: 1000,
        totalProfit: 500,
        marginPercent: 33.333333,
        unallocatedSalesAmount: 250,
        unallocatedSalesLineCount: 1,
        attributionCoveragePercent: 85,
        costCoveragePercent: 100,
      },
      metadata: {
        costBasis: "IMMUTABLE_EFFECTIVE_SNAPSHOT",
        revenueBasis: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE",
        dateBoundary: "INCLUSIVE",
      },
    });

    expect(result.summary.unallocatedSalesAmount.value).toBe(250);
    expect(result.summary.unallocatedSalesLineCount).toBe(1);
    expect(result.metadata.dateBoundary).toBe("INCLUSIVE");
  });

  it("combines frozen-cost provenance, reconciliation, and historical snapshot periods", () => {
    const detailDto: ProductProfitabilityDetailDto = {
      profitability: completeItem,
      frozenCost: {
        productId: "product-1",
        productCode: "FG-001",
        productName: "Cabinet",
        snapshotId: "snapshot-1",
        frozenAt: "2026-10-01T08:00:00Z",
        policyId: "policy-1",
        policyVersion: 2,
        bomId: "bom-1",
        bomVersion: 4,
        snapshotVersion: 3,
        engineVersion: "1.0",
        asOfDate: "2026-09-30",
        outputQuantity: 10,
        currency: "INR",
        materialTotal: 700,
        materialUnit: 70,
        totalCost: 1000,
        totalUnitCost: 100,
        sellingPriceBasis: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE",
        status: "COMPLETE",
        missingComponents: [],
        warnings: [],
        sourceLabels: ["Inventory ledger"],
        evidence: [
          {
            id: "evidence-1",
            component: "MATERIAL",
            sourceType: "INVENTORY_LEDGER",
            sourceId: "ledger-1",
            sourceDate: "2026-09-30",
            currency: "INR",
            calculatedAmount: 700,
            estimate: false,
            label: "Material issue ledger",
          },
        ],
      },
      componentMix: [
        {
          component: "MATERIAL",
          totalAmount: 700,
          unitAmount: 70,
          percentOfTotal: 70,
        },
      ],
      reconciliation: {
        attributedSalesAmount: 1500,
        attributedSalesLineCount: 2,
        unallocatedSalesAmount: 250,
        unallocatedSalesLineCount: 1,
        attributionCoveragePercent: 85,
        costCoveragePercent: 100,
        warnings: ["One sales line is not linked to a product."],
      },
      metadata: {
        costBasis: "IMMUTABLE_EFFECTIVE_SNAPSHOT",
        dateBoundary: "INCLUSIVE",
      },
    };
    const trendsDto: ProductProfitabilityTrendsDto = {
      productId: "product-1",
      productCode: "FG-001",
      productName: "Cabinet",
      grain: "MONTH",
      periods: [
        {
          periodStart: "2026-09-01",
          periodEnd: "2026-09-30",
          snapshotId: "snapshot-old",
          snapshotAsOfDate: "2026-08-31",
          snapshotFreshness: "CURRENT",
          realizedRevenue: 900,
          realizedQuantity: 6,
          realizedCost: 600,
          profit: 300,
          marginPercent: 33.333333,
          attributedLineCount: 1,
          missingCostLineCount: 0,
          completeness: "COMPLETE",
          health: "HEALTHY",
        },
      ],
      metadata: { dateBoundary: "INCLUSIVE" },
    };

    const result = toProductProfitabilityDetail(detailDto, trendsDto);
    expect(result.evidence[0]?.sourceReference).toBe("ledger-1");
    expect(result.coverage.unallocatedRevenue.value).toBe(250);
    expect(result.snapshotHistory[0]?.costingSnapshotId).toBe("snapshot-old");
    expect(result.trends[0]?.grossProfit.value).toBe(300);
  });
});
