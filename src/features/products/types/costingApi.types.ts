import type {
  CostingCompleteness,
  CostingPolicyStatus,
} from "./costing.types";

export type MaterialRateDto = {
  inventoryItemId: string;
  rate: number | string;
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
  outputQuantity: number | string;
  labourMode: string;
  labourAmount?: number | string | null;
  overheadMode: string;
  overheadAmount?: number | string | null;
  miscMode: string;
  miscAmount?: number | string | null;
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
  id: string;
  component: string;
  sourceType: string;
  sourceId?: string | null;
  sourceDate?: string | null;
  inventoryItemId?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  rate?: number | string | null;
  currency: string;
  calculatedAmount?: number | string | null;
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
  outputQuantity: number | string;
  currency: string;
  materialTotal?: number | string | null;
  materialUnit?: number | string | null;
  labourTotal?: number | string | null;
  labourUnit?: number | string | null;
  overheadTotal?: number | string | null;
  overheadUnit?: number | string | null;
  miscTotal?: number | string | null;
  miscUnit?: number | string | null;
  totalCost?: number | string | null;
  totalUnitCost?: number | string | null;
  sellingPriceBasis: string;
  sellingUnitPrice?: number | string | null;
  revenueTotal?: number | string | null;
  unitProfit?: number | string | null;
  marginPercent?: number | string | null;
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
