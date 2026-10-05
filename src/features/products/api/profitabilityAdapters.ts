import { costingDecimal } from "./costingContract";
import { toProductCostingView } from "./costingAdapters";
import type {
  ProductProfitabilityDetailDto,
  ProductProfitabilityItemDto,
  ProductProfitabilityPortfolioDto,
  ProductProfitabilityTrendsDto,
  ProfitabilityCompletenessDto,
  ProfitabilityMetadataDto,
} from "../types/profitabilityApi.types";
import type {
  ProductProfitabilityDetail,
  ProductProfitabilitySummary,
  ProfitabilityCompleteness,
  ProfitabilityHealth,
  ProfitabilityMoney,
  ProfitabilityPortfolioView,
} from "../types/profitability.types";

const COMPONENT_LABELS = {
  MATERIAL: "Materials",
  LABOUR: "Labour",
  OVERHEAD: "Overhead",
  MISC: "Miscellaneous",
} as const;

function metric(value: number | string | null | undefined, field: string) {
  return costingDecimal(value, field);
}

function money(
  currency: string | null,
  value: number | string | null | undefined,
  field: string
): ProfitabilityMoney {
  return { currency, value: metric(value, field) };
}

function completeness(
  value: ProfitabilityCompletenessDto
): ProfitabilityCompleteness {
  return value === "COMPLETE"
    ? "COMPLETE"
    : value === "ESTIMATED"
      ? "ESTIMATED"
    : value === "INCOMPLETE"
      ? "INCOMPLETE"
      : "UNKNOWN";
}

function health(dto: ProductProfitabilityItemDto): ProfitabilityHealth {
  if (dto.completeness !== "COMPLETE") {
    return dto.completeness === "INCOMPLETE" ? "INCOMPLETE" : "UNKNOWN";
  }

  switch (dto.health) {
    case "HEALTHY":
      return "HEALTHY";
    case "WATCH":
      return "OPPORTUNITY";
    case "AT_RISK":
      return "ATTENTION";
    default:
      return "UNKNOWN";
  }
}

function healthReasons(dto: ProductProfitabilityItemDto) {
  const reasons: string[] = [];
  if (!dto.snapshotId) reasons.push("No effective immutable cost snapshot.");
  if (dto.missingCostLineCount > 0) {
    reasons.push(
      `${dto.missingCostLineCount} attributed sales line${
        dto.missingCostLineCount === 1 ? "" : "s"
      } lack effective frozen cost.`
    );
  }
  if (dto.completeness === "ESTIMATED") {
    reasons.push("The effective costing snapshot contains estimates.");
  }
  if (dto.snapshotFreshness === "STALE") {
    reasons.push("The effective costing snapshot is stale.");
  }
  if (dto.snapshotFreshness === "MISSING") {
    reasons.push("Snapshot freshness is unavailable.");
  }
  if (health(dto) === "UNKNOWN" && !reasons.length) {
    reasons.push("The server did not return a defensible health classification.");
  }
  return reasons;
}

function metadata(dto: ProfitabilityMetadataDto) {
  return {
    costBasis: dto.costBasis,
    revenueBasis: dto.revenueBasis,
    dateBoundary: dto.dateBoundary,
  };
}

export function toProductProfitabilitySummary(
  dto: ProductProfitabilityItemDto
): ProductProfitabilitySummary {
  return {
    productId: dto.productId,
    productCode: dto.productCode,
    productName: dto.productName,
    realizedUnitSellingPrice: money(
      dto.currency,
      dto.unitRevenue,
      "unitRevenue"
    ),
    attributedRevenue: money(
      dto.currency,
      dto.realizedRevenue,
      "realizedRevenue"
    ),
    frozenUnitCost: money(
      dto.currency,
      dto.frozenUnitCost,
      "frozenUnitCost"
    ),
    unitProfit: money(dto.currency, dto.unitProfit, "unitProfit"),
    marginPercent: metric(dto.marginPercent, "marginPercent"),
    health: health(dto),
    completeness: completeness(dto.completeness),
    reasons: healthReasons(dto),
    snapshot: dto.snapshotId
      ? {
          id: dto.snapshotId,
          version:
            dto.snapshotVersion === null || dto.snapshotVersion === undefined
              ? null
              : String(dto.snapshotVersion),
          asOf: dto.snapshotAsOfDate,
          frozenAt: dto.snapshotFrozenAt,
          costingSnapshotId: dto.snapshotId,
          costingSnapshotAsOf: dto.snapshotAsOfDate,
          costingSnapshotFrozenAt: dto.snapshotFrozenAt,
          freshness: dto.snapshotFreshness,
          current: true,
        }
      : null,
    freshnessAt: dto.snapshotAsOfDate,
    coverage: {
      allocatedSalesPercent: metric(
        dto.costCoveragePercent,
        "costCoveragePercent"
      ),
      allocatedRevenue: money(
        dto.currency,
        dto.realizedRevenue,
        "realizedRevenue"
      ),
      unallocatedRevenue: money(dto.currency, null, "unallocatedRevenue"),
      reason:
        dto.missingCostLineCount > 0
          ? `${dto.missingCostLineCount} attributed sales line${
              dto.missingCostLineCount === 1 ? "" : "s"
            } missing cost.`
          : null,
    },
  };
}

export function toProfitabilityPortfolio(
  dto: ProductProfitabilityPortfolioDto
): ProfitabilityPortfolioView {
  const currency = dto.products.content[0]?.currency ?? null;
  return {
    products: {
      ...dto.products,
      content: dto.products.content.map(toProductProfitabilitySummary),
    },
    summary: {
      currency,
      totalAttributedRevenue: money(
        currency,
        dto.summary.totalAttributedRevenue,
        "totalAttributedRevenue"
      ),
      totalAttributedCost: money(
        currency,
        dto.summary.totalAttributedCost,
        "totalAttributedCost"
      ),
      totalProfit: money(
        currency,
        dto.summary.totalProfit,
        "totalProfit"
      ),
      marginPercent: metric(dto.summary.marginPercent, "portfolio.marginPercent"),
      unallocatedSalesAmount: money(
        currency,
        dto.summary.unallocatedSalesAmount,
        "unallocatedSalesAmount"
      ),
      unallocatedSalesLineCount: dto.summary.unallocatedSalesLineCount,
      attributionCoveragePercent: metric(
        dto.summary.attributionCoveragePercent,
        "attributionCoveragePercent"
      ),
      costCoveragePercent: metric(
        dto.summary.costCoveragePercent,
        "portfolio.costCoveragePercent"
      ),
    },
    metadata: metadata(dto.metadata),
  };
}

export function toProductProfitabilityDetail(
  dto: ProductProfitabilityDetailDto,
  trendsDto: ProductProfitabilityTrendsDto
): ProductProfitabilityDetail {
  const summary = toProductProfitabilitySummary(dto.profitability);
  const costing = dto.frozenCost
    ? toProductCostingView(dto.frozenCost)
    : null;

  return {
    ...summary,
    grossProfit: money(
      dto.profitability.currency,
      dto.profitability.profit,
      "profit"
    ),
    components: dto.componentMix.map((component) => {
      const evidence = costing?.components.find(
        (entry) => entry.key === component.component
      )?.evidence[0];
      return {
        key: component.component,
        label: COMPONENT_LABELS[component.component],
        amount: money(
          dto.profitability.currency,
          component.totalAmount,
          `${component.component}.totalAmount`
        ),
        perUnit: money(
          dto.profitability.currency,
          component.unitAmount,
          `${component.component}.unitAmount`
        ),
        sourceLabel: evidence?.label,
        sourceReference: evidence?.sourceReference,
        asOf: evidence?.asOf ?? dto.frozenCost?.asOfDate,
        notes:
          component.percentOfTotal === null ||
          component.percentOfTotal === undefined
            ? null
            : `${component.percentOfTotal}% of frozen unit cost`,
      };
    }),
    evidence:
      costing?.components.flatMap((component) =>
        component.evidence.map((evidence) => {
          const rawLine = dto.frozenCost?.evidence.find(
            (line) =>
              (line.id ?? null) === evidence.id ||
              line.sourceId === evidence.sourceReference
          );
          return {
            id: evidence.id,
            label: evidence.label,
            sourceType: evidence.sourceType,
            sourceReference: evidence.sourceReference,
            component: component.key,
            inventoryItemId: rawLine?.inventoryItemId ?? null,
            quantity: metric(rawLine?.quantity, `${evidence.id}.quantity`),
            unit: rawLine?.unit ?? null,
            rate: metric(rawLine?.rate, `${evidence.id}.rate`),
            currency: rawLine?.currency ?? evidence.amount?.currency,
            simulatorOverrideSupported: Boolean(rawLine?.id),
            asOf: evidence.asOf,
            quality: evidence.quality,
            notes: evidence.notes,
          };
        })
      ) ?? [],
    warnings: dto.reconciliation.warnings,
    coverage: {
      allocatedSalesPercent: metric(
        dto.reconciliation.attributionCoveragePercent,
        "attributionCoveragePercent"
      ),
      allocatedRevenue: money(
        dto.profitability.currency,
        dto.reconciliation.attributedSalesAmount,
        "attributedSalesAmount"
      ),
      unallocatedRevenue: money(
        dto.profitability.currency,
        dto.reconciliation.unallocatedSalesAmount,
        "unallocatedSalesAmount"
      ),
      reason: `${dto.reconciliation.unallocatedSalesLineCount} sales line${
        dto.reconciliation.unallocatedSalesLineCount === 1 ? "" : "s"
      } explicitly unallocated; cost coverage ${formatRawPercent(
        dto.reconciliation.costCoveragePercent
      )}.`,
    },
    snapshotHistory: trendsDto.periods
      .filter((period) => Boolean(period.snapshotId))
      .map((period) => ({
        id: period.snapshotId!,
        asOf: period.periodStart,
        frozenAt: null,
        costingSnapshotId: period.snapshotId,
        costingSnapshotAsOf: period.snapshotAsOfDate,
        costingSnapshotFrozenAt: null,
        freshness: period.snapshotFreshness,
        current: period.snapshotId === dto.profitability.snapshotId,
      })),
    trends: trendsDto.periods.map((period) => ({
      period: period.periodStart,
      periodLabel: `${period.periodStart} to ${period.periodEnd}`,
      attributedRevenue: money(
        dto.profitability.currency,
        period.realizedRevenue,
        `${period.periodStart}.realizedRevenue`
      ),
      grossProfit: money(
        dto.profitability.currency,
        period.profit,
        `${period.periodStart}.profit`
      ),
      marginPercent: metric(
        period.marginPercent,
        `${period.periodStart}.marginPercent`
      ),
      costingSnapshotId: period.snapshotId,
      costingSnapshotFrozenAt: period.snapshotAsOfDate,
      completeness: completeness(period.completeness),
    })),
    metadata: {
      ...metadata(dto.metadata),
      policyId: dto.frozenCost?.policyId,
      policyVersion:
        dto.frozenCost?.policyVersion === undefined
          ? null
          : String(dto.frozenCost.policyVersion),
      outputQuantity: costing?.quantity ?? undefined,
      outputUnit: dto.profitability.unit,
      frozenSellingPrice: metric(
        dto.frozenCost?.sellingUnitPrice,
        "frozenSellingUnitPrice"
      ),
    },
  };
}

function formatRawPercent(value: number | string | null | undefined) {
  const parsed = metric(value, "costCoveragePercent");
  return parsed === undefined ? "not available" : `${parsed}%`;
}
