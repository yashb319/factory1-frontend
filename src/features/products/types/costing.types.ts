export type CostingCompleteness = "COMPLETE" | "ESTIMATED" | "BLOCKED";

export type CostingPolicyStatus = "DRAFT" | "PUBLISHED" | "SUPERSEDED";

export type CostingAmount = {
  currency: string;
  perUnit?: number | null;
  total?: number | null;
};

export type CostingEvidence = {
  id: string;
  label: string;
  sourceType: string;
  sourceReference?: string | null;
  quality?: string | null;
  asOf?: string | null;
  basis?: string | null;
  amount?: CostingAmount | null;
  notes?: string | null;
};

export type CostingComponent = {
  key: string;
  label: string;
  amount?: CostingAmount | null;
  completeness: CostingCompleteness;
  explanation?: string | null;
  evidence: CostingEvidence[];
};

export type ProductCostingView = {
  productId: string;
  productCode: string;
  productName: string;
  quantity?: number | null;
  unit?: string | null;
  currency: string;
  completeness: CostingCompleteness;
  missingInputs: string[];
  sourceQuality?: string | null;
  warnings: string[];
  sourceLabels: string[];
  asOf?: string | null;
  basis?: string | null;
  totalCost?: CostingAmount | null;
  sellingPrice?: CostingAmount | null;
  components: CostingComponent[];
  policyVersion?: string | null;
  policyId?: string | null;
  bomId?: string | null;
  bomVersion?: string | null;
  snapshotVersion?: string | null;
  engineVersion?: string | null;
  immutableSnapshotId?: string | null;
  inputHash?: string | null;
  frozenAt?: string | null;
  supersedesSnapshotId?: string | null;
  canFreeze: boolean;
};

export type CostingSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export type MaterialRateDraft = {
  clientId: string;
  inventoryItemId: string;
  rate: string;
  unit: string;
  currency: string;
};

export type CostingPolicyDraft = {
  name: string;
  currency: string;
  materialValuation: string;
  sellingPriceBasis: string;
  pinnedBomId: string;
  outputQuantity: string;
  labourMode: string;
  labourAmount: string;
  overheadMode: string;
  overheadAmount: string;
  miscMode: string;
  miscAmount: string;
  materialRates: MaterialRateDraft[];
};

export type CostingPolicyView = {
  id: string;
  status: CostingPolicyStatus;
  version?: string | null;
  publishedAt?: string | null;
  taxBasis?: string | null;
  discountBasis?: string | null;
  returnsBasis?: string | null;
  draft: CostingPolicyDraft;
};

export type CostingPolicyOptions = {
  materialValuations: CostingSelectOption[];
  sellingPriceBases: CostingSelectOption[];
  allocationModes: CostingSelectOption[];
};
