export type ProfitabilityHealth =
  | "HEALTHY"
  | "OPPORTUNITY"
  | "ATTENTION"
  | "INCOMPLETE"
  | "UNKNOWN";

export type ProfitabilityCompleteness =
  | "COMPLETE"
  | "ESTIMATED"
  | "INCOMPLETE"
  | "UNKNOWN";

export type ProfitabilityMoney = {
  currency: string;
  value?: number;
};

export type ProfitabilityCoverage = {
  allocatedSalesPercent?: number;
  allocatedRevenue: ProfitabilityMoney;
  unallocatedRevenue: ProfitabilityMoney;
  reason?: string | null;
};

export type ProfitabilitySnapshotSummary = {
  id: string;
  version?: string | null;
  asOf?: string | null;
  frozenAt?: string | null;
  costingSnapshotId?: string | null;
  costingSnapshotAsOf?: string | null;
  costingSnapshotFrozenAt?: string | null;
  freshness?: "CURRENT" | "AGING" | "STALE" | "MISSING" | null;
  current: boolean;
};

export type ProductProfitabilitySummary = {
  productId: string;
  productCode: string;
  productName: string;
  realizedUnitSellingPrice: ProfitabilityMoney;
  attributedRevenue: ProfitabilityMoney;
  frozenUnitCost: ProfitabilityMoney;
  unitProfit: ProfitabilityMoney;
  marginPercent?: number;
  health: ProfitabilityHealth;
  completeness: ProfitabilityCompleteness;
  reasons: string[];
  snapshot: ProfitabilitySnapshotSummary | null;
  freshnessAt?: string | null;
  coverage: ProfitabilityCoverage;
};

export type ProfitabilityComponent = {
  key: string;
  label: string;
  amount: ProfitabilityMoney;
  perUnit: ProfitabilityMoney;
  sourceLabel?: string | null;
  sourceReference?: string | null;
  asOf?: string | null;
  notes?: string | null;
};

export type ProfitabilityEvidence = {
  id: string;
  label: string;
  sourceType: string;
  sourceReference?: string | null;
  asOf?: string | null;
  quality?: string | null;
  notes?: string | null;
};

export type ProfitabilityTrendPoint = {
  period: string;
  periodLabel: string;
  attributedRevenue: ProfitabilityMoney;
  grossProfit: ProfitabilityMoney;
  marginPercent?: number;
  costingSnapshotId?: string | null;
  costingSnapshotFrozenAt?: string | null;
  completeness: ProfitabilityCompleteness;
};

export type ProductProfitabilityDetail = ProductProfitabilitySummary & {
  grossProfit: ProfitabilityMoney;
  components: ProfitabilityComponent[];
  evidence: ProfitabilityEvidence[];
  warnings: string[];
  snapshotHistory: ProfitabilitySnapshotSummary[];
  trends: ProfitabilityTrendPoint[];
  metadata: {
    costBasis?: string | null;
    revenueBasis?: string | null;
    dateBoundary?: string | null;
  };
};

export type ProfitabilitySort =
  | "PRODUCT"
  | "ATTRIBUTED_REVENUE"
  | "COST"
  | "MARGIN"
  | "HEALTH"
  | "FRESHNESS";

export type ProfitabilityFilters = {
  from: string;
  to: string;
  page: number;
  size: number;
  search: string;
  health: ProfitabilityHealth | "ALL";
  completeness: "COMPLETE" | "ESTIMATED" | "INCOMPLETE" | "ALL";
  sort: ProfitabilitySort;
  direction: "ASC" | "DESC";
};

export type ProfitabilityPage = {
  content: ProductProfitabilitySummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ProfitabilityPortfolioSummary = {
  currency: string;
  totalAttributedRevenue: ProfitabilityMoney;
  totalAttributedCost: ProfitabilityMoney;
  totalProfit: ProfitabilityMoney;
  marginPercent?: number;
  unallocatedSalesAmount: ProfitabilityMoney;
  unallocatedSalesLineCount: number;
  attributionCoveragePercent?: number;
  costCoveragePercent?: number;
};

export type ProfitabilityPortfolioView = {
  products: ProfitabilityPage;
  summary: ProfitabilityPortfolioSummary;
  metadata: {
    costBasis?: string | null;
    revenueBasis?: string | null;
    dateBoundary?: string | null;
  };
};
