import type {
  CostBreakdownDto,
  PageResponseDto,
} from "./costingApi.types";

export type ProfitabilityMetricDto = number | string | null;

export type ProfitabilityCompletenessDto =
  | "COMPLETE"
  | "ESTIMATED"
  | "INCOMPLETE";

export type ProfitabilityHealthDto =
  | "HEALTHY"
  | "WATCH"
  | "AT_RISK"
  | "UNKNOWN";

export type SnapshotFreshnessDto = "CURRENT" | "AGING" | "STALE" | "MISSING";

export type SnapshotStatusDto = "BLOCKED" | "ESTIMATED" | "COMPLETE";

export type ProductProfitabilityItemDto = {
  productId: string;
  productCode: string;
  productName: string;
  unit?: string | null;
  active: boolean;
  snapshotId?: string | null;
  snapshotVersion?: number | string | null;
  snapshotAsOfDate?: string | null;
  snapshotFrozenAt?: string | null;
  snapshotAgeDays?: number | null;
  snapshotFreshness: SnapshotFreshnessDto;
  snapshotStatus?: SnapshotStatusDto | null;
  currency: string | null;
  sellingPriceBasis?: string | null;
  frozenSellingUnitPrice?: ProfitabilityMetricDto;
  frozenUnitCost?: ProfitabilityMetricDto;
  realizedRevenue?: ProfitabilityMetricDto;
  realizedQuantity?: ProfitabilityMetricDto;
  realizedCost?: ProfitabilityMetricDto;
  unitRevenue?: ProfitabilityMetricDto;
  unitCost?: ProfitabilityMetricDto;
  unitProfit?: ProfitabilityMetricDto;
  profit?: ProfitabilityMetricDto;
  marginPercent?: ProfitabilityMetricDto;
  costCoveragePercent?: ProfitabilityMetricDto;
  attributedLineCount: number;
  missingCostLineCount: number;
  completeness: ProfitabilityCompletenessDto;
  health: ProfitabilityHealthDto;
};

export type PortfolioSummaryDto = {
  totalAttributedRevenue?: ProfitabilityMetricDto;
  totalAttributedCost?: ProfitabilityMetricDto;
  totalProfit?: ProfitabilityMetricDto;
  marginPercent?: ProfitabilityMetricDto;
  unallocatedSalesAmount?: ProfitabilityMetricDto;
  unallocatedSalesLineCount: number;
  attributionCoveragePercent?: ProfitabilityMetricDto;
  costCoveragePercent?: ProfitabilityMetricDto;
};

export type ProfitabilityMetadataDto = {
  costBasis?: string | null;
  revenueBasis?: string | null;
  dateBoundary?: string | null;
  [key: string]: unknown;
};

export type ProductProfitabilityPortfolioDto = {
  products: PageResponseDto<ProductProfitabilityItemDto>;
  summary: PortfolioSummaryDto;
  metadata: ProfitabilityMetadataDto;
};

export type ComponentMixDto = {
  component: "MATERIAL" | "LABOUR" | "OVERHEAD" | "MISC";
  totalAmount?: ProfitabilityMetricDto;
  unitAmount?: ProfitabilityMetricDto;
  percentOfTotal?: ProfitabilityMetricDto;
};

export type ReconciliationDto = {
  attributedSalesAmount?: ProfitabilityMetricDto;
  attributedSalesLineCount: number;
  unallocatedSalesAmount?: ProfitabilityMetricDto;
  unallocatedSalesLineCount: number;
  attributionCoveragePercent?: ProfitabilityMetricDto;
  costCoveragePercent?: ProfitabilityMetricDto;
  warnings: string[];
};

export type ProductProfitabilityDetailDto = {
  profitability: ProductProfitabilityItemDto;
  frozenCost: CostBreakdownDto | null;
  componentMix: ComponentMixDto[];
  reconciliation: ReconciliationDto;
  metadata: ProfitabilityMetadataDto;
};

export type ProfitabilityTrendPointDto = {
  periodStart: string;
  periodEnd: string;
  snapshotId?: string | null;
  snapshotAsOfDate?: string | null;
  snapshotFreshness: SnapshotFreshnessDto;
  realizedRevenue?: ProfitabilityMetricDto;
  realizedQuantity?: ProfitabilityMetricDto;
  realizedCost?: ProfitabilityMetricDto;
  profit?: ProfitabilityMetricDto;
  marginPercent?: ProfitabilityMetricDto;
  attributedLineCount: number;
  missingCostLineCount: number;
  completeness: ProfitabilityCompletenessDto;
  health: ProfitabilityHealthDto;
};

export type ProductProfitabilityTrendsDto = {
  productId: string;
  productCode: string;
  productName: string;
  grain: "MONTH";
  periods: ProfitabilityTrendPointDto[];
  metadata: ProfitabilityMetadataDto;
};

export type ProfitabilityPortfolioQuery = {
  from: string;
  to: string;
  productId?: string;
  search?: string;
  active?: boolean;
  completeness?: ProfitabilityCompletenessDto;
  snapshotStatus?: SnapshotStatusDto;
  health?: ProfitabilityHealthDto;
  snapshotFreshness?: SnapshotFreshnessDto;
  sellingPriceBasis?: string;
  revenueBasis?: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE";
  minProfit?: number;
  maxProfit?: number;
  minMarginPercent?: number;
  maxMarginPercent?: number;
  minCostCoveragePercent?: number;
  maxSnapshotAgeDays?: number;
  sort?:
    | "PRODUCT_NAME"
    | "PRODUCT_CODE"
    | "REVENUE"
    | "QUANTITY"
    | "COST"
    | "PROFIT"
    | "MARGIN_PERCENT"
    | "SNAPSHOT_AS_OF"
    | "SNAPSHOT_AGE_DAYS"
    | "COMPLETENESS"
    | "HEALTH";
  direction?: "ASC" | "DESC";
  page?: number;
  size?: number;
};
