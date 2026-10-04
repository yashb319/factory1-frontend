import type {
  CostingCompleteness,
  CostingPolicyStatus,
} from "./costing.types";

export type MaterialRateDto = {
  inventoryItemId: string;
  rate: number;
  unit: string;
  currency: string;
};

export type CostingPolicyDto = {
  id: string;
  policyKey: string;
  version: number;
  name: string;
  status: CostingPolicyStatus | "SUPERSEDED";
  currency: string;
  materialValuation: string;
  sellingPriceBasis: string;
  pinnedBomId?: string | null;
  outputQuantity: number;
  labourMode: string;
  labourAmount?: number | null;
  overheadMode: string;
  overheadAmount?: number | null;
  miscMode: string;
  miscAmount?: number | null;
  taxBasis: string;
  discountBasis: string;
  returnsBasis: string;
  materialRates: MaterialRateDto[];
  publishedAt?: string | null;
};

export type CostingPolicyRequestDto = {
  name: string;
  currency: string;
  materialValuation: string;
  sellingPriceBasis: string;
  pinnedBomId?: string;
  outputQuantity: number;
  labourMode: string;
  labourAmount?: number;
  overheadMode: string;
  overheadAmount?: number;
  miscMode: string;
  miscAmount?: number;
  materialRates: MaterialRateDto[];
};

export type EvidenceLineDto = {
  id?: string | null;
  component: string;
  sourceType: string;
  sourceId?: string | null;
  sourceDate?: string | null;
  inventoryItemId?: string | null;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  currency: string;
  calculatedAmount?: number | null;
  estimate: boolean;
  label: string;
};

export type CostBreakdownDto = {
  productId: string;
  productCode: string;
  productName: string;
  snapshotId?: string | null;
  inputHash?: string | null;
  supersedesSnapshotId?: string | null;
  frozenAt?: string | null;
  policyId: string;
  policyVersion: number;
  bomId?: string | null;
  bomVersion?: number | null;
  snapshotVersion?: number | null;
  engineVersion: string;
  asOfDate: string;
  outputQuantity: number;
  currency: string;
  materialTotal?: number | null;
  materialUnit?: number | null;
  labourTotal?: number | null;
  labourUnit?: number | null;
  overheadTotal?: number | null;
  overheadUnit?: number | null;
  miscTotal?: number | null;
  miscUnit?: number | null;
  totalCost?: number | null;
  totalUnitCost?: number | null;
  sellingPriceBasis: string;
  sellingUnitPrice?: number | null;
  revenueTotal?: number | null;
  unitProfit?: number | null;
  marginPercent?: number | null;
  status: CostingCompleteness;
  missingComponents: string[];
  warnings: string[];
  sourceLabels: string[];
  evidence: EvidenceLineDto[];
};

export type FreezeCostingSnapshotRequestDto = {
  requestKey: string;
  policyId: string;
  asOfDate?: string;
  supersedesSnapshotId?: string;
};

export type PageResponseDto<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
