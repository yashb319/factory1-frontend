import { costingDecimal } from "./costingContract";
import {
  PROFIT_SIMULATOR_BOUNDS,
  PROFIT_SIMULATOR_MAX_MATERIAL_OVERRIDES,
} from "../config/profitSimulator";
import type {
  AppliedOverrideDto,
  MetricDeltasDto,
  ProfitMetricsDto,
  ProfitSimulationRequestDto,
  ProfitSimulationResponseDto,
} from "../types/profitSimulatorApi.types";
import type {
  ProfitSimulationResult,
  ProfitSimulatorAllocationInput,
  ProfitSimulatorBaseline,
  ProfitSimulatorDraft,
  ProfitSimulatorMetric,
  ProfitSimulatorRequest,
} from "../types/profitSimulator.types";
import type { CostingPolicyView } from "../types/costing.types";
import type { ProductProfitabilityDetail } from "../types/profitability.types";

const CATEGORY_LABELS = {
  SELLING_PRICE: "Selling price",
  OUTPUT_VOLUME: "Output volume",
  MATERIAL: "Material",
  LABOUR: "Labour",
  OVERHEAD: "Overhead",
  MISC: "Miscellaneous",
} as const;

export function toProfitSimulationRequest(
  productId: string,
  draft: ProfitSimulatorDraft,
  baseline: ProfitSimulatorBaseline
): ProfitSimulationRequestDto {
  if (
    draft.selectorMode === "EFFECTIVE_DATE" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveOnDate)
  ) {
    throw new Error("A valid effectiveOnDate is required.");
  }
  if (draft.materials.length > PROFIT_SIMULATOR_MAX_MATERIAL_OVERRIDES) {
    throw new Error("At most 100 material overrides are allowed.");
  }
  const request: ProfitSimulatorRequest = {
    productId,
    baseline:
      draft.selectorMode === "EFFECTIVE_DATE"
        ? { effectiveOnDate: draft.effectiveOnDate }
        : { snapshotId: draft.snapshotId },
    overrides: {},
  };

  const sellingPrice = changedDecimal(
    draft.sellingPrice,
    baseline.sellingPrice,
    "selling.unitPrice",
    PROFIT_SIMULATOR_BOUNDS.sellingPrice
  );
  if (sellingPrice !== undefined) {
    request.overrides.selling = { unitPrice: sellingPrice };
  }

  const outputQuantity = changedDecimal(
    draft.outputQuantity,
    baseline.outputQuantity,
    "volume.outputQuantity",
    PROFIT_SIMULATOR_BOUNDS.outputQuantity
  );
  if (outputQuantity !== undefined) {
    request.overrides.volume = { outputQuantity };
  }

  const materials = draft.materials.flatMap((material) => {
    const source = baseline.materials.find(
      (entry) => entry.evidenceId === material.evidenceId
    );
    if (!source) return [];

    const quantityPerOutput = changedDecimal(
      material.quantityPerOutput,
      source.quantityPerOutput,
      `${material.evidenceId}.quantityPerOutput`,
      PROFIT_SIMULATOR_BOUNDS.materialQuantity
    );
    const rate = changedDecimal(
      material.rate,
      source.rate,
      `${material.evidenceId}.rate`,
      PROFIT_SIMULATOR_BOUNDS.materialRate
    );
    const wastePercentChange = optionalDecimal(
      material.wastePercentChange,
      `${material.evidenceId}.wastePercentChange`,
      PROFIT_SIMULATOR_BOUNDS.wastePercentChange
    );
    if (
      quantityPerOutput === undefined &&
      rate === undefined &&
      wastePercentChange === undefined
    ) {
      return [];
    }

    return [
      {
        evidenceId: material.evidenceId,
        quantityPerOutput,
        rate,
        wastePercentChange,
        unit: source.unit || undefined,
        currency: source.currency || undefined,
      },
    ];
  });
  if (materials.length) request.overrides.materials = materials;

  addAllocationOverride(
    request,
    "labour",
    draft.labour,
    baseline.labour
  );
  addAllocationOverride(
    request,
    "overhead",
    draft.overhead,
    baseline.overhead
  );
  addAllocationOverride(request, "misc", draft.misc, baseline.misc);

  return request;
}

export function toProfitSimulationResult(
  dto: ProfitSimulationResponseDto
): ProfitSimulationResult {
  const baselineSnapshotId = dto.provenance.snapshotId;
  return {
    productId: dto.productId,
    productCode: dto.productCode,
    productName: dto.productName,
    status: dto.completeness,
    hypothetical: true,
    persisted: false,
    baselineSnapshotId,
    completeness:
      dto.completeness === "BLOCKED" ? "INCOMPLETE" : dto.completeness,
    metrics: simulationMetrics(
      dto.currency,
      dto.outputUnit,
      dto.baseline,
      dto.scenario,
      dto.deltas
    ),
    appliedAssumptions: dto.appliedOverrides.map((entry) => ({
      field: `${entry.category}.${entry.key}.${entry.field}`,
      label: overrideLabel(entry),
      reason:
        entry.baselineValue === null || entry.baselineValue === undefined
          ? `applied ${entry.scenarioValue}; baseline was unavailable`
          : `applied ${entry.scenarioValue}; baseline ${entry.baselineValue}`,
    })),
    ignoredAssumptions: dto.ignoredOverrides.map((entry) => ({
      field: `${entry.category}.${entry.key}.${entry.field}`,
      label: `${CATEGORY_LABELS[entry.category]} ${entry.field}`,
      reason: entry.reason,
    })),
    assumptions: dto.assumptions,
    warnings: dto.warnings,
    blockedReasons: dto.blockingReasons,
    provenance: {
      snapshotId: dto.provenance.snapshotId,
      snapshotVersion: String(dto.provenance.snapshotVersion),
      snapshotAsOf: dto.provenance.snapshotAsOfDate,
      snapshotFrozenAt: dto.provenance.frozenAt,
      policyId: dto.provenance.policyId,
      policyVersion: String(dto.provenance.policyVersion),
      bomId: dto.provenance.bomId,
      bomVersion: String(dto.provenance.bomVersion),
      sourceCostEngineVersion: dto.provenance.sourceCostEngineVersion,
      simulationEngineVersion: dto.provenance.simulationEngineVersion,
      selectorLabel:
        dto.provenance.baselineSelection === "EFFECTIVE_ON_DATE"
          ? `Effective on ${dto.provenance.requestedEffectiveOnDate}`
          : "Frozen snapshot ID",
    },
  };
}

export function toProfitSimulatorBaselines(
  detail: ProductProfitabilityDetail,
  policy?: CostingPolicyView | null
): ProfitSimulatorBaseline[] {
  const snapshots = [
    detail.snapshot,
    ...detail.snapshotHistory,
  ].filter(
    (
      snapshot
    ): snapshot is NonNullable<ProductProfitabilityDetail["snapshot"]> =>
      Boolean(snapshot?.id)
  );
  const unique = snapshots.filter(
    (snapshot, index) =>
      snapshots.findIndex((candidate) => candidate.id === snapshot.id) === index
  );

  return unique.map((snapshot) => {
    const current = snapshot.id === detail.snapshot?.id;
    return {
      snapshot,
      completeness: current ? detail.completeness : "UNKNOWN",
      warnings: current
        ? detail.warnings
        : [
            "Detailed source values for this historical snapshot are loaded by the server when calculated.",
          ],
      currency: detail.frozenUnitCost.currency,
      outputUnit: detail.metadata.outputUnit,
      sellingPrice: current ? detail.metadata.frozenSellingPrice : undefined,
      outputQuantity: current ? detail.metadata.outputQuantity : undefined,
      materials: current
        ? detail.evidence
            .filter((entry) => entry.component === "MATERIAL")
            .map((entry) => ({
              evidenceId: entry.id,
              inventoryItemId: entry.inventoryItemId,
              label: entry.label,
              sourceLabel: entry.sourceType,
              sourceReference: entry.sourceReference,
              asOf: entry.asOf,
              unit: entry.unit,
              currency: entry.currency,
              quantityPerOutput: undefined,
              rate: entry.rate,
              quantitySupported: Boolean(entry.simulatorOverrideSupported),
              rateSupported:
                Boolean(entry.simulatorOverrideSupported) &&
                entry.rate !== undefined,
              wasteSupported: Boolean(entry.simulatorOverrideSupported),
            }))
        : [],
      labour: allocation(current ? policy : null, "labour"),
      overhead: allocation(current ? policy : null, "overhead"),
      misc: allocation(current ? policy : null, "misc"),
    };
  });
}

function simulationMetrics(
  currency: string,
  outputUnit: string,
  baseline: ProfitMetricsDto | null,
  scenario: ProfitMetricsDto | null,
  deltas: MetricDeltasDto | null
): ProfitSimulatorMetric[] {
  return [
    moneyMetric(
      "unitCost",
      "Unit cost",
      currency,
      baseline?.unitCost,
      scenario?.unitCost,
      deltas?.unitCost
    ),
    moneyMetric(
      "totalCost",
      "Total cost",
      currency,
      baseline?.totalCost,
      scenario?.totalCost,
      deltas?.totalCost
    ),
    moneyMetric(
      "materialCost",
      "Material cost",
      currency,
      baseline?.material.total,
      scenario?.material.total,
      deltas?.materialTotal
    ),
    moneyMetric(
      "labourCost",
      "Labour cost",
      currency,
      baseline?.labour.total,
      scenario?.labour.total,
      deltas?.labourTotal
    ),
    moneyMetric(
      "overheadCost",
      "Overhead cost",
      currency,
      baseline?.overhead.total,
      scenario?.overhead.total,
      deltas?.overheadTotal
    ),
    moneyMetric(
      "miscCost",
      "Miscellaneous cost",
      currency,
      baseline?.misc.total,
      scenario?.misc.total,
      deltas?.miscTotal
    ),
    moneyMetric(
      "revenue",
      "Revenue",
      currency,
      baseline?.revenue,
      scenario?.revenue,
      deltas?.revenue
    ),
    moneyMetric(
      "unitContribution",
      "Unit contribution",
      currency,
      baseline?.unitContribution,
      scenario?.unitContribution,
      deltas?.unitContribution
    ),
    moneyMetric(
      "totalContribution",
      "Contribution profit",
      currency,
      baseline?.totalContribution,
      scenario?.totalContribution,
      deltas?.totalContribution
    ),
    moneyMetric(
      "unitProfit",
      "Unit profit",
      currency,
      baseline?.unitProfit,
      scenario?.unitProfit,
      deltas?.unitProfit
    ),
    moneyMetric(
      "totalProfit",
      "Total profit",
      currency,
      baseline?.totalProfit,
      scenario?.totalProfit,
      deltas?.totalProfit
    ),
    plainMetric(
      "marginPercent",
      "Margin",
      baseline?.marginPercent,
      scenario?.marginPercent,
      deltas?.marginPercentagePoints
    ),
    plainMetric(
      "markupPercent",
      "Markup",
      baseline?.markupPercent,
      scenario?.markupPercent,
      deltas?.markupPercentagePoints
    ),
    moneyMetric(
      "breakEvenSellingPrice",
      "Break-even selling price",
      currency,
      baseline?.breakEvenSellingPrice,
      scenario?.breakEvenSellingPrice,
      undefined
    ),
    {
      ...plainMetric(
        "breakEvenVolume",
        "Break-even volume",
        baseline?.breakEvenVolume,
        scenario?.breakEvenVolume,
        undefined
      ),
      unit: outputUnit,
      undefinedReason: breakEvenReason(
        scenario?.breakEvenVolumeUndefinedReason ??
          baseline?.breakEvenVolumeUndefinedReason
      ),
    },
  ];
}

function moneyMetric(
  key: ProfitSimulatorMetric["key"],
  label: string,
  currency: string,
  baseline: unknown,
  scenario: unknown,
  delta: unknown
): ProfitSimulatorMetric {
  return {
    ...plainMetric(key, label, baseline, scenario, delta),
    currency,
  };
}

function plainMetric(
  key: ProfitSimulatorMetric["key"],
  label: string,
  baseline: unknown,
  scenario: unknown,
  delta: unknown
): ProfitSimulatorMetric {
  return {
    key,
    label,
    baseline: metric(baseline, `${key}.baseline`),
    scenario: metric(scenario, `${key}.scenario`),
    delta: metric(delta, `${key}.delta`),
  };
}

function allocation(
  policy: CostingPolicyView | null | undefined,
  field: "labour" | "overhead" | "misc"
): ProfitSimulatorAllocationInput {
  const mode = policy?.draft[`${field}Mode`];
  const amount = policy?.draft[`${field}Amount`];
  if (
    mode !== "PER_OUTPUT" &&
    mode !== "TOTAL_ALLOCATION" &&
    mode !== "EXCLUDED"
  ) {
    return {
      supported: false,
      mode: "EXCLUDED",
      reason: "The published allocation mode is unavailable.",
    };
  }
  return {
    supported: mode !== "EXCLUDED",
    mode,
    amount: optionalDecimal(
      amount ?? "",
      `${field}.amount`,
      PROFIT_SIMULATOR_BOUNDS.allocation
    ),
    reason:
      mode === "EXCLUDED"
        ? "Excluded by the frozen costing policy."
        : undefined,
  };
}

function addAllocationOverride(
  request: ProfitSimulatorRequest,
  field: "labour" | "overhead" | "misc",
  value: string,
  baseline: ProfitSimulatorAllocationInput
) {
  if (!baseline.supported || baseline.mode === "EXCLUDED") return;
  const amount = changedDecimal(
    value,
    baseline.amount,
    `${field}.amount`,
    PROFIT_SIMULATOR_BOUNDS.allocation
  );
  if (amount !== undefined) {
    request.overrides[field] = { mode: baseline.mode, amount };
  }
}

function overrideLabel(entry: AppliedOverrideDto) {
  const key = entry.key ? ` ${entry.key}` : "";
  return `${CATEGORY_LABELS[entry.category]}${key} ${entry.field}`;
}

function changedDecimal(
  value: string,
  baseline: number | undefined,
  field: string,
  bounds: { min: number; max: number }
) {
  const parsed = optionalDecimal(value, field, bounds);
  if (parsed === undefined || parsed === baseline) return undefined;
  return parsed;
}

function optionalDecimal(
  value: string,
  field: string,
  bounds: { min: number; max: number }
) {
  if (!value.trim()) return undefined;
  if (!/^-?\d+(?:\.\d{1,6})?$/.test(value.trim())) {
    throw new Error(`${field} must use at most 6 decimal places.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} is invalid.`);
  }
  if (parsed < bounds.min || parsed > bounds.max) {
    throw new Error(
      `${field} must be between ${bounds.min} and ${bounds.max}.`
    );
  }
  return parsed;
}

function metric(value: unknown, field: string) {
  if (
    value !== null &&
    value !== undefined &&
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    throw new Error(`Invalid numeric value returned for ${field}.`);
  }
  return costingDecimal(value, field);
}

function breakEvenReason(
  reason:
    | ProfitMetricsDto["breakEvenVolumeUndefinedReason"]
    | undefined
) {
  switch (reason) {
    case "SELLING_PRICE_UNAVAILABLE":
      return "Undefined because selling price is unavailable.";
    case "NO_FIXED_COSTS":
      return "Undefined because there are no fixed costs.";
    case "NON_POSITIVE_UNIT_CONTRIBUTION":
      return "Undefined because unit contribution is not positive.";
    default:
      return null;
  }
}
