import type {
  ProfitabilityCompleteness,
  ProfitabilitySnapshotSummary,
} from "./profitability.types";

export type ProfitSimulatorUndefinedReason =
  | "SELLING_PRICE_UNAVAILABLE"
  | "NO_FIXED_COSTS"
  | "NON_POSITIVE_UNIT_CONTRIBUTION";

export type ProfitSimulatorMetricKey =
  | "unitCost"
  | "totalCost"
  | "materialCost"
  | "labourCost"
  | "overheadCost"
  | "miscCost"
  | "revenue"
  | "unitContribution"
  | "totalContribution"
  | "unitProfit"
  | "totalProfit"
  | "marginPercent"
  | "markupPercent"
  | "breakEvenSellingPrice"
  | "breakEvenVolume";

export type ProfitSimulatorMetric = {
  key: ProfitSimulatorMetricKey;
  label: string;
  baseline?: number;
  scenario?: number;
  delta?: number;
  currency?: string | null;
  unit?: string | null;
  undefinedReason?: string | null;
};

export type ProfitSimulatorMaterialInput = {
  evidenceId: string;
  inventoryItemId?: string | null;
  label: string;
  sourceLabel?: string | null;
  sourceReference?: string | null;
  asOf?: string | null;
  unit?: string | null;
  currency?: string | null;
  quantityPerOutput?: number;
  rate?: number;
  quantitySupported: boolean;
  rateSupported: boolean;
  wasteSupported: boolean;
};

export type ProfitSimulatorAllocationMode =
  | "PER_OUTPUT"
  | "TOTAL_ALLOCATION"
  | "EXCLUDED";

export type ProfitSimulatorAllocationInput = {
  supported: boolean;
  mode: ProfitSimulatorAllocationMode;
  amount?: number;
  reason?: string | null;
};

export type ProfitSimulatorBaseline = {
  snapshot: ProfitabilitySnapshotSummary;
  completeness: ProfitabilityCompleteness;
  warnings: string[];
  currency: string;
  outputUnit?: string | null;
  sellingPrice?: number;
  outputQuantity?: number;
  materials: ProfitSimulatorMaterialInput[];
  labour: ProfitSimulatorAllocationInput;
  overhead: ProfitSimulatorAllocationInput;
  misc: ProfitSimulatorAllocationInput;
};

export type ProfitSimulatorOverrideFeedback = {
  field: string;
  label: string;
  reason?: string | null;
};

export type ProfitSimulationProvenance = {
  snapshotId: string;
  snapshotVersion?: string | null;
  snapshotAsOf?: string | null;
  snapshotFrozenAt?: string | null;
  policyId?: string | null;
  policyVersion?: string | null;
  bomId?: string | null;
  bomVersion?: string | null;
  sourceCostEngineVersion?: string | null;
  simulationEngineVersion: string;
  selectorLabel: string;
};

export type ProfitSimulationResult = {
  productId: string;
  productCode: string;
  productName: string;
  status: "COMPLETE" | "ESTIMATED" | "BLOCKED";
  hypothetical: true;
  persisted: false;
  baselineSnapshotId: string;
  completeness: ProfitabilityCompleteness;
  metrics: ProfitSimulatorMetric[];
  appliedAssumptions: ProfitSimulatorOverrideFeedback[];
  ignoredAssumptions: ProfitSimulatorOverrideFeedback[];
  assumptions: string[];
  warnings: string[];
  blockedReasons: string[];
  provenance: ProfitSimulationProvenance;
};

export type ProfitSimulatorMaterialDraft = {
  evidenceId: string;
  quantityPerOutput: string;
  rate: string;
  wastePercentChange: string;
};

export type ProfitSimulatorDraft = {
  selectorMode: "SNAPSHOT" | "EFFECTIVE_DATE";
  snapshotId: string;
  effectiveOnDate: string;
  sellingPrice: string;
  outputQuantity: string;
  materials: ProfitSimulatorMaterialDraft[];
  labour: string;
  overhead: string;
  misc: string;
};

export type ProfitSimulatorRequest = {
  productId: string;
  baseline:
    | { snapshotId: string; effectiveOnDate?: never }
    | { snapshotId?: never; effectiveOnDate: string };
  overrides: {
    selling?: { unitPrice: number };
    volume?: { outputQuantity: number };
    materials?: Array<{
      evidenceId: string;
      quantityPerOutput?: number;
      rate?: number;
      wastePercentChange?: number;
      unit?: string;
      currency?: string;
    }>;
    labour?: {
      mode: ProfitSimulatorAllocationMode;
      amount: number;
    };
    overhead?: {
      mode: ProfitSimulatorAllocationMode;
      amount: number;
    };
    misc?: {
      mode: ProfitSimulatorAllocationMode;
      amount: number;
    };
  };
};
