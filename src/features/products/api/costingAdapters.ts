import type {
  CostingAmount,
  CostingCompleteness,
  CostingPolicyDraft,
  CostingPolicyView,
  ProductCostingView,
} from "../types/costing.types";
import type {
  CostBreakdownDto,
  CostingPolicyDto,
  CostingPolicyRequestDto,
  EvidenceLineDto,
} from "../types/costingApi.types";
import { costingDecimal } from "./costingContract";

function version(value: string | number | null | undefined) {
  return value === null || value === undefined ? null : String(value);
}

function amount(
  currency: string,
  perUnit: number | string | null | undefined,
  total: number | string | null | undefined
): CostingAmount {
  return {
    currency,
    perUnit: costingDecimal(perUnit, "perUnit"),
    total: costingDecimal(total, "total"),
  };
}

function componentStatus(
  component: string,
  dto: CostBreakdownDto,
  evidence: EvidenceLineDto[]
): CostingCompleteness {
  if (
    dto.status === "BLOCKED" &&
    dto.missingComponents.some((missing) =>
      missing.toUpperCase().includes(component)
    )
  ) {
    return "BLOCKED";
  }

  return evidence.some((line) => line.estimate) ? "ESTIMATED" : "COMPLETE";
}

function componentEvidence(component: string, dto: CostBreakdownDto) {
  return dto.evidence.filter(
    (line) => line.component.toUpperCase() === component
  );
}

function evidenceView(line: EvidenceLineDto) {
  return {
    id: line.id,
    label: line.label,
    sourceType: line.sourceType,
    sourceReference: line.sourceId,
    quality: line.estimate ? "Estimate" : "Actual or published assumption",
    asOf: line.sourceDate,
    basis: line.component,
    amount: amount(line.currency, line.rate, line.calculatedAmount),
    notes: [
      line.inventoryItemId ? `Inventory item ${line.inventoryItemId}` : null,
      line.quantity !== null && line.quantity !== undefined
        ? `Quantity ${line.quantity}${line.unit ? ` ${line.unit}` : ""}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

export function toProductCostingView(
  dto: CostBreakdownDto
): ProductCostingView {
  const definitions = [
    {
      key: "MATERIAL",
      label: "Materials",
      perUnit: dto.materialUnit,
      total: dto.materialTotal,
    },
    {
      key: "LABOUR",
      label: "Labour",
      perUnit: dto.labourUnit,
      total: dto.labourTotal,
    },
    {
      key: "OVERHEAD",
      label: "Overhead",
      perUnit: dto.overheadUnit,
      total: dto.overheadTotal,
    },
    {
      key: "MISC",
      label: "Miscellaneous",
      perUnit: dto.miscUnit,
      total: dto.miscTotal,
    },
  ];

  return {
    productId: dto.productId,
    productCode: dto.productCode,
    productName: dto.productName,
    quantity: costingDecimal(dto.outputQuantity, "outputQuantity"),
    currency: dto.currency,
    completeness: dto.status,
    missingInputs: dto.missingComponents,
    sourceQuality:
      dto.status === "COMPLETE"
        ? "Actual or published assumptions"
        : dto.status === "ESTIMATED"
          ? "Includes estimates"
          : "Insufficient evidence",
    warnings: dto.warnings,
    sourceLabels: dto.sourceLabels,
    asOf: dto.asOfDate,
    basis: dto.sellingPriceBasis,
    totalCost: amount(dto.currency, dto.totalUnitCost, dto.totalCost),
    sellingPrice: amount(
      dto.currency,
      dto.sellingUnitPrice,
      dto.revenueTotal
    ),
    components: definitions.map((definition) => {
      const evidence = componentEvidence(definition.key, dto);
      return {
        key: definition.key,
        label: definition.label,
        amount: amount(dto.currency, definition.perUnit, definition.total),
        completeness: componentStatus(definition.key, dto, evidence),
        explanation:
          dto.missingComponents.find((missing) =>
            missing.toUpperCase().includes(definition.key)
          ) ??
          ((definition.perUnit === null || definition.perUnit === undefined) &&
          (definition.total === null || definition.total === undefined)
            ? "Excluded by the published costing policy."
            : null),
        evidence: evidence.map(evidenceView),
      };
    }),
    policyId: dto.policyId,
    policyVersion: version(dto.policyVersion),
    bomId: dto.bomId,
    bomVersion: version(dto.bomVersion),
    snapshotVersion: version(dto.snapshotVersion),
    engineVersion: dto.engineVersion,
    immutableSnapshotId: dto.snapshotId,
    inputHash: dto.inputHash,
    frozenAt: dto.frozenAt,
    supersedesSnapshotId: dto.supersedesSnapshotId,
    canFreeze: dto.status !== "BLOCKED" && !dto.snapshotId,
  };
}

export function toCostingPolicyView(dto: CostingPolicyDto): CostingPolicyView {
  return {
    id: dto.id,
    status: dto.status,
    version: version(dto.version),
    publishedAt: dto.publishedAt,
    taxBasis: dto.taxBasis,
    discountBasis: dto.discountBasis,
    returnsBasis: dto.returnsBasis,
    draft: {
      name: dto.name,
      currency: dto.currency,
      materialValuation: dto.materialValuation,
      sellingPriceBasis: dto.sellingPriceBasis,
      pinnedBomId: dto.pinnedBomId ?? "",
      outputQuantity: String(dto.outputQuantity),
      labourMode: dto.labourMode,
      labourAmount:
        dto.labourAmount === null || dto.labourAmount === undefined
          ? ""
          : String(dto.labourAmount),
      overheadMode: dto.overheadMode,
      overheadAmount:
        dto.overheadAmount === null || dto.overheadAmount === undefined
          ? ""
          : String(dto.overheadAmount),
      miscMode: dto.miscMode,
      miscAmount:
        dto.miscAmount === null || dto.miscAmount === undefined
          ? ""
          : String(dto.miscAmount),
      materialRates: dto.materialRates.map((rate, index) => ({
        clientId: `${rate.inventoryItemId}-${index}`,
        inventoryItemId: rate.inventoryItemId,
        rate: String(rate.rate),
        unit: rate.unit,
        currency: rate.currency,
      })),
    },
  };
}

export function toCostingPolicyRequest(
  draft: CostingPolicyDraft
): CostingPolicyRequestDto {
  return {
    name: draft.name.trim(),
    currency: draft.currency.trim().toUpperCase(),
    materialValuation: draft.materialValuation,
    sellingPriceBasis: draft.sellingPriceBasis,
    pinnedBomId: draft.pinnedBomId.trim() || undefined,
    outputQuantity: requiredDecimal(draft.outputQuantity, "outputQuantity"),
    labourMode: draft.labourMode,
    labourAmount: allocationAmount(
      draft.labourMode,
      draft.labourAmount,
      "labourAmount"
    ),
    overheadMode: draft.overheadMode,
    overheadAmount: allocationAmount(
      draft.overheadMode,
      draft.overheadAmount,
      "overheadAmount"
    ),
    miscMode: draft.miscMode,
    miscAmount: allocationAmount(
      draft.miscMode,
      draft.miscAmount,
      "miscAmount"
    ),
    materialRates: draft.materialRates.map((rate) => ({
      inventoryItemId: rate.inventoryItemId,
      rate: requiredDecimal(rate.rate, "materialRate"),
      unit: rate.unit.trim(),
      currency: rate.currency.trim().toUpperCase(),
    })),
  };
}

function requiredDecimal(value: string, field: string) {
  const parsed = costingDecimal(value, field);
  if (parsed === undefined) throw new Error(`${field} is required.`);
  return parsed;
}

function allocationAmount(mode: string, value: string, field: string) {
  return mode === "EXCLUDED" ? undefined : requiredDecimal(value, field);
}
