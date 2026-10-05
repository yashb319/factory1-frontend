import type { ProfitabilityMetricDto } from "./profitabilityApi.types";

export type SimulationBaselineSelectorDto =
  | { snapshotId: string; effectiveOnDate?: never }
  | { snapshotId?: never; effectiveOnDate: string };

export type SellingOverrideDto =
  | { unitPrice: number; totalRevenue?: never; percentChange?: never }
  | { unitPrice?: never; totalRevenue: number; percentChange?: never }
  | { unitPrice?: never; totalRevenue?: never; percentChange: number };

export type VolumeOverrideDto =
  | { outputQuantity: number; percentChange?: never }
  | { outputQuantity?: never; percentChange: number };

export type MaterialOverrideDto = {
  evidenceId?: string;
  inventoryItemId?: string;
  quantityPerOutput?: number;
  quantityPercentChange?: number;
  rate?: number;
  ratePercentChange?: number;
  wastePercentChange?: number;
  unit?: string;
  currency?: string;
};

export type AllocationModeDto =
  | "PER_OUTPUT"
  | "TOTAL_ALLOCATION"
  | "EXCLUDED";

export type AllocationOverrideDto = {
  mode: AllocationModeDto;
  amount?: number;
  percentChange?: number;
};

export type ProfitSimulationRequestDto = {
  productId: string;
  baseline: SimulationBaselineSelectorDto;
  overrides: {
    selling?: SellingOverrideDto;
    volume?: VolumeOverrideDto;
    materials?: MaterialOverrideDto[];
    labour?: AllocationOverrideDto;
    overhead?: AllocationOverrideDto;
    misc?: AllocationOverrideDto;
  };
};

export type ProfitMetricComponentDto = {
  total?: ProfitabilityMetricDto;
  perOutput?: ProfitabilityMetricDto;
};

export type ProfitMetricsDto = {
  outputQuantity?: ProfitabilityMetricDto;
  sellingUnitPrice?: ProfitabilityMetricDto;
  revenue?: ProfitabilityMetricDto;
  material: ProfitMetricComponentDto;
  labour: ProfitMetricComponentDto;
  overhead: ProfitMetricComponentDto;
  misc: ProfitMetricComponentDto;
  variableUnitCost?: ProfitabilityMetricDto;
  variableTotalCost?: ProfitabilityMetricDto;
  fixedTotalCost?: ProfitabilityMetricDto;
  unitCost?: ProfitabilityMetricDto;
  totalCost?: ProfitabilityMetricDto;
  unitContribution?: ProfitabilityMetricDto;
  totalContribution?: ProfitabilityMetricDto;
  unitProfit?: ProfitabilityMetricDto;
  totalProfit?: ProfitabilityMetricDto;
  marginPercent?: ProfitabilityMetricDto;
  markupPercent?: ProfitabilityMetricDto;
  breakEvenSellingPrice?: ProfitabilityMetricDto;
  breakEvenVolume?: ProfitabilityMetricDto;
  breakEvenVolumeUndefinedReason?:
    | "SELLING_PRICE_UNAVAILABLE"
    | "NO_FIXED_COSTS"
    | "NON_POSITIVE_UNIT_CONTRIBUTION"
    | null;
};

export type MetricDeltasDto = {
  outputQuantity?: ProfitabilityMetricDto;
  sellingUnitPrice?: ProfitabilityMetricDto;
  revenue?: ProfitabilityMetricDto;
  materialTotal?: ProfitabilityMetricDto;
  labourTotal?: ProfitabilityMetricDto;
  overheadTotal?: ProfitabilityMetricDto;
  miscTotal?: ProfitabilityMetricDto;
  unitCost?: ProfitabilityMetricDto;
  totalCost?: ProfitabilityMetricDto;
  unitContribution?: ProfitabilityMetricDto;
  totalContribution?: ProfitabilityMetricDto;
  unitProfit?: ProfitabilityMetricDto;
  totalProfit?: ProfitabilityMetricDto;
  marginPercentagePoints?: ProfitabilityMetricDto;
  markupPercentagePoints?: ProfitabilityMetricDto;
};

export type OverrideCategoryDto =
  | "SELLING_PRICE"
  | "OUTPUT_VOLUME"
  | "MATERIAL"
  | "LABOUR"
  | "OVERHEAD"
  | "MISC";

export type AppliedOverrideDto = {
  category: OverrideCategoryDto;
  key: string;
  field: string;
  baselineValue?: ProfitabilityMetricDto;
  scenarioValue: ProfitabilityMetricDto;
};

export type IgnoredOverrideDto = {
  category: OverrideCategoryDto;
  key: string;
  field: string;
  reason: string;
};

export type MaterialProvenanceDto = {
  evidenceId: string;
  inventoryItemId: string;
  sourceType: string;
  unit: string;
  currency: string | null;
  estimate: boolean;
};

export type SimulationProvenanceDto = {
  snapshotId: string;
  snapshotVersion: number;
  snapshotAsOfDate: string;
  frozenAt: string;
  policyId: string;
  policyVersion: number;
  bomId: string;
  bomVersion: number;
  sourceCostEngineVersion: string;
  simulationEngineVersion: string;
  baselineSelection: "SNAPSHOT_ID" | "EFFECTIVE_ON_DATE";
  requestedEffectiveOnDate?: string | null;
  materials: MaterialProvenanceDto[];
};

export type ProfitSimulationResponseDto = {
  productId: string;
  productCode: string;
  productName: string;
  currency: string | null;
  outputUnit: string;
  scale: 6;
  roundingMode: "HALF_UP";
  completeness: "COMPLETE" | "ESTIMATED" | "BLOCKED";
  baseline: ProfitMetricsDto | null;
  scenario: ProfitMetricsDto | null;
  deltas: MetricDeltasDto | null;
  appliedOverrides: AppliedOverrideDto[];
  ignoredOverrides: IgnoredOverrideDto[];
  assumptions: string[];
  warnings: string[];
  blockingReasons: string[];
  provenance: SimulationProvenanceDto;
};
