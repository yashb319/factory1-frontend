import { costingDecimal } from "./costingContract";
import type {
  ProfitCenterDashboardDto,
  ProfitRecommendationDto,
  RecommendationPreferencesDto,
  RecommendationRefreshDto,
} from "../types/profitRecommendationsApi.types";
import type {
  ProfitCenterDashboard,
  ProfitRecommendation,
  RecommendationEvidence,
  RecommendationGenerationJob,
  RecommendationLifecycleAction,
  RecommendationPreferences,
  RecommendationType,
} from "../types/profitRecommendations.types";

const TYPE_LABELS: Record<RecommendationType, string> = {
  NEGATIVE_CONTRIBUTION_MARGIN: "Negative contribution margin",
  LOW_CONTRIBUTION_MARGIN: "Low contribution margin",
  COST_DATA_INCOMPLETE_OR_STALE: "Cost data coverage",
  MATERIAL_COST_CONCENTRATION: "Material cost concentration",
  MATERIAL_COST_INCREASE: "Material cost increase",
  PRICE_WHAT_IF_OPPORTUNITY: "Price what-if opportunity",
  MARKET_PRICE_EVIDENCE: "Market price evidence",
  MARGIN_RISK_FROM_COST_CHANGE: "Margin risk from cost change",
};

export function recommendationTypeLabel(type: RecommendationType) {
  return TYPE_LABELS[type];
}

function metric(
  value: number | string | null | undefined,
  field: string
): number | undefined {
  return costingDecimal(value, field);
}

function money(
  currency: string | null,
  value: number | string | null | undefined,
  field: string,
  unavailableReason?: string | null
) {
  return { currency, value: metric(value, field), unavailableReason };
}

function allowedActions(
  status: ProfitRecommendationDto["status"]
): RecommendationLifecycleAction[] {
  switch (status) {
    case "OPEN":
      return ["ACKNOWLEDGE", "DISMISS", "RESOLVE"];
    case "ACKNOWLEDGED":
      return ["DISMISS", "RESOLVE"];
    case "DISMISSED":
      return ["RESTORE"];
    default:
      return [];
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstText(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  return text(value[0]);
}

function nested(
  source: Record<string, unknown>,
  key: string
): Record<string, unknown> | null {
  return record(source[key]);
}

function evidenceEntries(dto: ProfitRecommendationDto): RecommendationEvidence[] {
  if (!dto.productId) return [];

  const result: RecommendationEvidence[] = [];
  const snapshot = nested(dto.evidence, "snapshot");
  const profitability = nested(dto.evidence, "profitability");
  const simulation = nested(dto.evidence, "simulation");
  const market = nested(dto.evidence, "market");
  const period = nested(dto.evidence, "period");
  const from = text(period?.from);
  const to = text(period?.to);
  const snapshotId =
    text(snapshot?.id) ??
    text(dto.evidence.snapshotId) ??
    text(profitability?.snapshotId);

  if (profitability || snapshotId) {
    result.push({
      id: `${dto.id}:profitability`,
      label: "Product profitability",
      target: "PRODUCT_PROFITABILITY",
      productId: dto.productId,
      from,
      to,
      snapshotId,
    });
  }

  if (snapshotId) {
    result.push({
      id: `${dto.id}:costing`,
      label: "Frozen product costing",
      target: "PRODUCT_COSTING",
      productId: dto.productId,
      from,
      to,
      snapshotId,
    });
  }

  if (simulation) {
    result.push({
      id: `${dto.id}:simulation`,
      label: "Review deterministic simulation",
      target: "PROFIT_SIMULATOR",
      productId: dto.productId,
      from,
      to,
      snapshotId,
    });
  }

  if (market || dto.type === "MARKET_PRICE_EVIDENCE") {
    result.push({
      id: `${dto.id}:market`,
      label: "Review market evidence",
      target: "MARKET_EVIDENCE",
      productId: dto.productId,
      from,
      to,
      marketRunId:
        firstText(market?.runIds) ??
        text(market?.runId) ??
        text(dto.evidence.marketRunId),
      marketComparableId:
        firstText(market?.comparableIds) ??
        text(market?.comparableId) ??
        text(dto.evidence.marketComparableId),
      sourceCount:
        count(market?.sampleCount) ?? count(dto.evidence.sourceCount),
      confidence: dto.confidence,
      freshness:
        text(market?.expiresAt) ?? text(dto.evidence.marketFreshness),
      channel: text(market?.channel) ?? text(dto.evidence.marketChannel),
      currency:
        text(market?.currency) ??
        text(dto.evidence.marketCurrency) ??
        dto.impactCurrency,
    });
  }

  return result;
}

function evidenceReasons(evidence: Record<string, unknown>): string[] {
  const reasons = evidence.reasons;
  return Array.isArray(reasons)
    ? reasons.filter((value): value is string => typeof value === "string")
    : [];
}

function coverage(
  evidence: Record<string, unknown>,
  key: "profitabilityCoveragePercent" | "snapshotCoveragePercent"
) {
  const profitability = nested(evidence, "profitability");
  return metric(
    (profitability?.[
      key === "profitabilityCoveragePercent"
        ? "costCoveragePercent"
        : key
    ] ?? evidence[key]) as
      | string
      | number
      | null
      | undefined,
    key
  );
}

export function toProfitRecommendation(
  dto: ProfitRecommendationDto
): ProfitRecommendation {
  const currency = dto.impactCurrency ?? null;
  return {
    id: dto.id,
    version: String(dto.version),
    title: dto.title,
    summary: dto.summary,
    type: dto.type,
    category: recommendationTypeLabel(dto.type),
    severity: dto.severity,
    lifecycle: dto.status,
    productId: dto.productId,
    productCode: dto.productCode,
    productName: dto.productName,
    confidence: dto.confidence,
    dataQuality: dto.dataQuality,
    ruleVersion: dto.ruleVersion,
    engineVersion: dto.engineVersion,
    generatedAt: dto.generatedAt,
    expiresAt: dto.expiresAt,
    impact: {
      label: "Deterministic impact",
      amount:
        dto.impactAmount === null || dto.impactAmount === undefined
          ? null
          : money(
              currency,
              dto.impactAmount,
              `${dto.id}.impactAmount`,
              dto.impactUnavailableReason ??
                (currency ? null : "Impact currency unavailable")
            ),
      percent: metric(dto.impactPercent, `${dto.id}.impactPercent`),
      unavailableReason: dto.impactUnavailableReason,
    },
    evidence: evidenceEntries(dto),
    rationale: evidenceReasons(dto.evidence),
    profitabilityCoverage: coverage(
      dto.evidence,
      "profitabilityCoveragePercent"
    ),
    snapshotStatus: text(nested(dto.evidence, "snapshot")?.status),
    aiExplanation: text(dto.evidence.aiExplanation),
    allowedActions: allowedActions(dto.status),
  };
}

export function toProfitCenterDashboard(
  dto: ProfitCenterDashboardDto
): ProfitCenterDashboard {
  const currency = dto.summary.currency;
  const currencyReason = dto.summary.currencyUnavailableReason;
  const generatedAt = dto.metadata.lastGeneratedAt ?? "";
  const gapReasons: string[] = [];
  if (dto.dataCoverage.incompleteProductCount > 0) {
    gapReasons.push(
      `${dto.dataCoverage.incompleteProductCount} product${
        dto.dataCoverage.incompleteProductCount === 1 ? "" : "s"
      } have incomplete profitability evidence.`
    );
  }
  if (dto.dataCoverage.missingSnapshotCount > 0) {
    gapReasons.push(
      `${dto.dataCoverage.missingSnapshotCount} product${
        dto.dataCoverage.missingSnapshotCount === 1 ? "" : "s"
      } lack an effective cost snapshot.`
    );
  }

  return {
    from: dto.period.from,
    to: dto.period.to,
    generatedAt,
    freshnessLabel: `${dto.dataCoverage.currentSnapshotCount} current, ${dto.dataCoverage.agingSnapshotCount} aging, ${dto.dataCoverage.staleSnapshotCount} stale, and ${dto.dataCoverage.missingSnapshotCount} missing cost snapshots`,
    attributedRevenue: money(
      currency,
      dto.summary.totalAttributedRevenue,
      "dashboard.totalAttributedRevenue",
      currencyReason
    ),
    frozenProductCost: money(
      currency,
      dto.summary.totalAttributedCost,
      "dashboard.totalAttributedCost",
      currencyReason
    ),
    contributionProfit: money(
      currency,
      dto.summary.totalContribution,
      "dashboard.totalContribution",
      currencyReason
    ),
    contributionMarginPercent: metric(
      dto.summary.contributionMarginPercent,
      "dashboard.contributionMarginPercent"
    ),
    costComposition: [
      {
        label: "Materials",
        value: money(
          dto.costComposition.currency,
          dto.costComposition.materialAmount,
          "dashboard.costComposition.materialAmount",
          dto.costComposition.currencyUnavailableReason
        ),
        percent: metric(
          dto.costComposition.materialPercent,
          "dashboard.costComposition.materialPercent"
        ),
      },
      {
        label: "Labour",
        value: money(
          dto.costComposition.currency,
          dto.costComposition.labourAmount,
          "dashboard.costComposition.labourAmount",
          dto.costComposition.currencyUnavailableReason
        ),
        percent: metric(
          dto.costComposition.labourPercent,
          "dashboard.costComposition.labourPercent"
        ),
      },
      {
        label: "Overhead",
        value: money(
          dto.costComposition.currency,
          dto.costComposition.overheadAmount,
          "dashboard.costComposition.overheadAmount",
          dto.costComposition.currencyUnavailableReason
        ),
        percent: metric(
          dto.costComposition.overheadPercent,
          "dashboard.costComposition.overheadPercent"
        ),
      },
      {
        label: "Miscellaneous",
        value: money(
          dto.costComposition.currency,
          dto.costComposition.miscAmount,
          "dashboard.costComposition.miscAmount",
          dto.costComposition.currencyUnavailableReason
        ),
        percent: metric(
          dto.costComposition.miscPercent,
          "dashboard.costComposition.miscPercent"
        ),
        note:
          dto.costComposition.reconciliationDifference === null ||
          dto.costComposition.reconciliationDifference === undefined
            ? dto.costComposition.currencyUnavailableReason
            : `Server reconciliation difference: ${dto.costComposition.reconciliationDifference}`,
      },
    ],
    trends: dto.trends.map((trend) => ({
      period: trend.periodEnd
        ? `${trend.periodStart} to ${trend.periodEnd}`
        : trend.periodStart,
      attributedRevenue: money(
        currency,
        trend.attributedRevenue,
        `${trend.periodStart}.attributedRevenue`,
        currencyReason
      ),
      frozenCost: money(
        currency,
        trend.attributedCost,
        `${trend.periodStart}.attributedCost`,
        currencyReason
      ),
      contributionProfit: money(
        currency,
        trend.contribution,
        `${trend.periodStart}.contribution`,
        currencyReason
      ),
      contributionMarginPercent: metric(
        trend.contributionMarginPercent,
        `${trend.periodStart}.contributionMarginPercent`
      ),
    })),
    attributionCoveragePercent: metric(
      dto.summary.attributionCoveragePercent,
      "dashboard.attributionCoveragePercent"
    ),
    costCoveragePercent: metric(
      dto.summary.costCoveragePercent,
      "dashboard.costCoveragePercent"
    ),
    unallocatedRevenue: money(
      currency,
      dto.summary.unallocatedRevenue,
      "dashboard.unallocatedRevenue"
    ),
    unallocatedRevenueLineCount: dto.summary.unallocatedLineCount,
    dataGapReasons: gapReasons,
    openRecommendationCount: dto.recommendationCountsByStatus.OPEN ?? 0,
    recommendationSeverityCounts: dto.recommendationCountsBySeverity,
    recommendationCategoryCounts: dto.opportunityCategories.length
      ? dto.opportunityCategories.map((category) => ({
          category: recommendationTypeLabel(category.type),
          count: category.count,
          deterministicImpact:
            category.deterministicImpactAmount === null ||
            category.deterministicImpactAmount === undefined
              ? {
                  currency: category.impactCurrency,
                  unavailableReason: category.impactUnavailableReason,
                }
              : money(
                  category.impactCurrency ?? null,
                  category.deterministicImpactAmount,
                  `${category.type}.deterministicImpactAmount`,
                  category.impactUnavailableReason
                ),
        }))
      : Object.entries(dto.recommendationCountsByType).map(([type, value]) => ({
          category: recommendationTypeLabel(type as RecommendationType),
          count: value ?? 0,
        })),
    topProducts: dto.topProducts.map((product) => ({
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      contributionProfit: money(
        currency,
        product.contribution,
        `${product.productId}.contribution`,
        currencyReason
      ),
      contributionMarginPercent: metric(
        product.contributionMarginPercent,
        `${product.productId}.contributionMarginPercent`
      ),
      completeness: product.completeness,
      freshness: product.freshness,
    })),
    bottomProducts: dto.bottomProducts.map((product) => ({
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      contributionProfit: money(
        currency,
        product.contribution,
        `${product.productId}.contribution`,
        currencyReason
      ),
      contributionMarginPercent: metric(
        product.contributionMarginPercent,
        `${product.productId}.contributionMarginPercent`
      ),
      completeness: product.completeness,
      freshness: product.freshness,
    })),
  };
}

export function toRecommendationJob(
  dto: RecommendationRefreshDto
): RecommendationGenerationJob {
  return {
    id: dto.id,
    status: dto.status,
    from: dto.from,
    to: dto.to,
    attempts: dto.attempts,
    generatedCount: dto.generatedCount,
    requestedAt: dto.createdAt,
    startedAt: dto.startedAt,
    completedAt: dto.completedAt,
    lastGeneratedAt: dto.completedAt,
    progressMessage:
      dto.status === "SUCCEEDED"
        ? `${dto.generatedCount} recommendation${
            dto.generatedCount === 1 ? "" : "s"
          } generated.`
        : null,
    failureReason: dto.safeError,
    retryAllowed: dto.status === "FAILED",
  };
}

export function toRecommendationPreferences(
  dto: RecommendationPreferencesDto
): RecommendationPreferences {
  return {
    inAppEnabled: dto.inAppEnabled,
    emailEnabled: dto.emailEnabled,
    minimumSeverity: dto.minimumSeverity,
  };
}
