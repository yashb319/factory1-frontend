export type RecommendationLifecycle =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "DISMISSED"
  | "RESOLVED"
  | "EXPIRED";

export type RecommendationType =
  | "NEGATIVE_CONTRIBUTION_MARGIN"
  | "LOW_CONTRIBUTION_MARGIN"
  | "COST_DATA_INCOMPLETE_OR_STALE"
  | "MATERIAL_COST_CONCENTRATION"
  | "MATERIAL_COST_INCREASE"
  | "PRICE_WHAT_IF_OPPORTUNITY"
  | "MARKET_PRICE_EVIDENCE"
  | "MARGIN_RISK_FROM_COST_CHANGE";

export type RecommendationSeverity = "INFO" | "WARNING" | "HIGH";

export type RecommendationConfidence = "LOW" | "MEDIUM" | "HIGH";

export type RecommendationDataQuality =
  | "COMPLETE"
  | "ESTIMATED"
  | "INCOMPLETE"
  | "STALE";

export type RecommendationFreshness = "FRESH" | "EXPIRING" | "EXPIRED";

export type RecommendationEvidenceTarget =
  | "PRODUCT_PROFITABILITY"
  | "PRODUCT_COSTING"
  | "PROFIT_SIMULATOR"
  | "MARKET_EVIDENCE";

export type RecommendationEvidence = {
  id: string;
  label: string;
  target: RecommendationEvidenceTarget;
  productId: string;
  from?: string | null;
  to?: string | null;
  snapshotId?: string | null;
  marketRunId?: string | null;
  marketComparableId?: string | null;
  sourceCount?: number | null;
  confidence?: RecommendationConfidence | null;
  freshness?: string | null;
  channel?: string | null;
  currency?: string | null;
};

export type RecommendationImpact = {
  label: string;
  amount?: ProfitCenterAmount | null;
  percent?: number | null;
  unavailableReason?: string | null;
};

export type ProfitRecommendation = {
  id: string;
  version: string;
  title: string;
  summary: string;
  type: RecommendationType;
  category: string;
  severity: RecommendationSeverity;
  lifecycle: RecommendationLifecycle;
  productId?: string | null;
  productCode?: string | null;
  productName?: string | null;
  confidence: RecommendationConfidence;
  dataQuality: RecommendationDataQuality;
  ruleVersion: string;
  engineVersion: string;
  generatedAt: string;
  expiresAt?: string | null;
  impact: RecommendationImpact;
  evidence: RecommendationEvidence[];
  rationale: string[];
  profitabilityCoverage?: number | null;
  snapshotStatus?: string | null;
  aiExplanation?: string | null;
  allowedActions: RecommendationLifecycleAction[];
};

export type RecommendationLifecycleAction =
  | "ACKNOWLEDGE"
  | "DISMISS"
  | "RESTORE"
  | "RESOLVE";

export type RecommendationFilters = {
  page: number;
  size: number;
  lifecycle: RecommendationLifecycle | "ALL";
  type: RecommendationType | "ALL";
  severity: RecommendationSeverity | "ALL";
  productId: string;
  freshness: RecommendationFreshness | "ALL";
};

export type RecommendationPage = {
  content: ProfitRecommendation[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ProfitCenterMetric = {
  label: string;
  value?: ProfitCenterAmount | null;
  percent?: number | null;
  note?: string | null;
};

export type ProfitCenterAmount = {
  currency?: string | null;
  value?: number;
  unavailableReason?: string | null;
};

export type ProfitCenterTrendPoint = {
  period: string;
  attributedRevenue: ProfitCenterAmount;
  frozenCost: ProfitCenterAmount;
  contributionProfit: ProfitCenterAmount;
  contributionMarginPercent?: number | null;
};

export type ProfitCenterProductRank = {
  productId: string;
  productCode: string;
  productName: string;
  contributionProfit: ProfitCenterAmount;
  contributionMarginPercent?: number | null;
  completeness: RecommendationDataQuality;
  freshness: string;
};

export type ProfitCenterDashboard = {
  from: string;
  to: string;
  generatedAt: string;
  freshnessLabel: string;
  attributedRevenue: ProfitCenterAmount;
  frozenProductCost: ProfitCenterAmount;
  contributionProfit: ProfitCenterAmount;
  contributionMarginPercent?: number | null;
  costComposition: ProfitCenterMetric[];
  trends: ProfitCenterTrendPoint[];
  attributionCoveragePercent?: number | null;
  costCoveragePercent?: number | null;
  unallocatedRevenue: ProfitCenterAmount;
  unallocatedRevenueLineCount: number;
  dataGapReasons: string[];
  openRecommendationCount: number;
  recommendationSeverityCounts: Partial<
    Record<RecommendationSeverity, number>
  >;
  recommendationCategoryCounts: Array<{
    category: string;
    count: number;
    deterministicImpact?: ProfitCenterAmount | null;
  }>;
  topProducts: ProfitCenterProductRank[];
  bottomProducts: ProfitCenterProductRank[];
};

export type RecommendationJobStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED";

export type RecommendationGenerationJob = {
  id: string;
  status: RecommendationJobStatus;
  from: string;
  to: string;
  attempts: number;
  generatedCount: number;
  requestedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  lastGeneratedAt?: string | null;
  progressMessage?: string | null;
  failureReason?: string | null;
  retryAllowed: boolean;
};

export type RecommendationPreferences = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  minimumSeverity: RecommendationSeverity;
};
