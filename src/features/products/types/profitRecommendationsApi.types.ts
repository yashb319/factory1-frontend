import type { PageResponseDto } from "./costingApi.types";
import type {
  RecommendationConfidence,
  RecommendationDataQuality,
  RecommendationFreshness,
  RecommendationLifecycle,
  RecommendationSeverity,
  RecommendationType,
} from "./profitRecommendations.types";

export type ProfitCenterMetricDto = number | string | null;

export type ProfitRecommendationDto = {
  id: string;
  productId?: string | null;
  productCode?: string | null;
  productName?: string | null;
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  impactAmount?: ProfitCenterMetricDto;
  impactPercent?: ProfitCenterMetricDto;
  impactCurrency?: string | null;
  impactUnavailableReason?: string | null;
  confidence: RecommendationConfidence;
  dataQuality: RecommendationDataQuality;
  ruleVersion: string;
  engineVersion: string;
  fingerprint: string;
  status: RecommendationLifecycle;
  firstSeenAt: string;
  lastSeenAt: string;
  generatedAt: string;
  expiresAt?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  dismissedAt?: string | null;
  dismissedBy?: string | null;
  dismissalReason?: string | null;
  version: number;
};

export type ProfitRecommendationPageDto =
  PageResponseDto<ProfitRecommendationDto>;

export type ProfitCenterPeriodDto = {
  from: string;
  to: string;
};

export type ProfitCenterSummaryDto = {
  totalAttributedRevenue?: ProfitCenterMetricDto;
  totalAttributedCost?: ProfitCenterMetricDto;
  totalContribution?: ProfitCenterMetricDto;
  contributionMarginPercent?: ProfitCenterMetricDto;
  unallocatedRevenue?: ProfitCenterMetricDto;
  unallocatedLineCount: number;
  attributionCoveragePercent?: ProfitCenterMetricDto;
  costCoveragePercent?: ProfitCenterMetricDto;
  currency: string | null;
  currencyUnavailableReason: string | null;
};

export type ProfitCenterProductDto = {
  productId: string;
  productCode: string;
  productName: string;
  attributedRevenue?: ProfitCenterMetricDto;
  contribution?: ProfitCenterMetricDto;
  contributionMarginPercent?: ProfitCenterMetricDto;
  completeness: RecommendationDataQuality;
  freshness: string;
};

export type ProfitCenterTrendDto = {
  periodStart: string;
  periodEnd?: string | null;
  attributedRevenue?: ProfitCenterMetricDto;
  attributedCost?: ProfitCenterMetricDto;
  contribution?: ProfitCenterMetricDto;
  contributionMarginPercent?: ProfitCenterMetricDto;
  costCoveragePercent?: ProfitCenterMetricDto;
};

export type ProfitCenterDashboardDto = {
  period: ProfitCenterPeriodDto;
  summary: ProfitCenterSummaryDto;
  costComposition: {
    materialAmount?: ProfitCenterMetricDto;
    labourAmount?: ProfitCenterMetricDto;
    overheadAmount?: ProfitCenterMetricDto;
    miscAmount?: ProfitCenterMetricDto;
    totalAttributedCost?: ProfitCenterMetricDto;
    materialPercent?: ProfitCenterMetricDto;
    labourPercent?: ProfitCenterMetricDto;
    overheadPercent?: ProfitCenterMetricDto;
    miscPercent?: ProfitCenterMetricDto;
    currency: string | null;
    currencyUnavailableReason: string | null;
    reconciliationDifference?: ProfitCenterMetricDto;
  };
  dataCoverage: {
    productCount: number;
    completeProductCount: number;
    incompleteProductCount: number;
    currentSnapshotCount: number;
    agingSnapshotCount: number;
    staleSnapshotCount: number;
    missingSnapshotCount: number;
    attributionCoveragePercent?: ProfitCenterMetricDto;
    costCoveragePercent?: ProfitCenterMetricDto;
  };
  recommendationCountsByStatus: Partial<
    Record<RecommendationLifecycle, number>
  >;
  recommendationCountsBySeverity: Partial<
    Record<RecommendationSeverity, number>
  >;
  recommendationCountsByType: Partial<Record<RecommendationType, number>>;
  topProducts: ProfitCenterProductDto[];
  bottomProducts: ProfitCenterProductDto[];
  trends: ProfitCenterTrendDto[];
  opportunityCategories: Array<{
    type: RecommendationType;
    count: number;
    deterministicImpactAmount?: ProfitCenterMetricDto;
    impactCurrency?: string | null;
    impactUnavailableReason?: string | null;
  }>;
  metadata: {
    revenueBasis?: string | null;
    costBasis?: string | null;
    profitabilityRuleVersion: string;
    recommendationRuleVersion: string;
    dateBoundary?: string | null;
    lastGeneratedAt: string | null;
  };
};

export type RecommendationRefreshDto = {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  from: string;
  to: string;
  attempts: number;
  generatedCount: number;
  safeError: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type RecommendationPreferencesDto = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  minimumSeverity: RecommendationSeverity;
};

export type RecommendationQueryDto = {
  status?: RecommendationLifecycle;
  type?: RecommendationType;
  severity?: RecommendationSeverity;
  productId?: string;
  freshness?: RecommendationFreshness;
  page: number;
  size: number;
};
