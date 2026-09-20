import type { MaterialCoverage, MaterialWaste, ProductionDisposition } from "../types/productionFlow.types";
import { parseProductionQuantity, productionQuantityUnits } from "./productionQuantity.ts";

export type MaterialSourceOption = {
  consumptionId: string;
  sourceOrderId: string;
  inventoryItemId: string;
  itemLabel: string;
  unit: string;
  remainingAllocatableQuantity: number;
};

export type MaterialAllocationDraft = {
  key: string;
  source: "NEW_STOCK" | "EXISTING_CONSUMPTION";
  inventoryItemId: string;
  consumptionId: string;
  itemLabel: string;
  unit: string;
  quantity: string;
  lotNumber: string;
};

export function materialAllocationLines(drafts: MaterialAllocationDraft[], options: MaterialSourceOption[]): MaterialWaste[] {
  const consumed = new Map<string, number>();
  return drafts.map((draft) => {
    const quantity = parseProductionQuantity(draft.quantity, { positive: true });
    if (!draft.inventoryItemId || !draft.unit) throw new Error("Select a material and its unit for each allocation.");
    if (draft.source === "NEW_STOCK") {
      if (!draft.lotNumber.trim()) throw new Error("A lot number is required for new material consumption.");
      if (draft.lotNumber.trim().length > 150) throw new Error("A material lot number cannot exceed 150 characters.");
      return { source: "NEW_STOCK", inventoryItemId: draft.inventoryItemId, unit: draft.unit, quantity, lotNumber: draft.lotNumber.trim() };
    }
    const option = options.find((item) => item.consumptionId === draft.consumptionId);
    if (!option || option.inventoryItemId !== draft.inventoryItemId || option.unit !== draft.unit) {
      throw new Error("Refresh and select an eligible existing material issue.");
    }
    const units = (consumed.get(option.consumptionId) ?? 0) + productionQuantityUnits(quantity);
    if (units > productionQuantityUnits(option.remainingAllocatableQuantity)) {
      throw new Error("Material allocations exceed the available quantity of an existing issue.");
    }
    consumed.set(option.consumptionId, units);
    return { source: "EXISTING_CONSUMPTION", consumptionId: option.consumptionId, inventoryItemId: option.inventoryItemId, unit: option.unit, quantity };
  });
}

export function materialCoverageLines(drafts: MaterialAllocationDraft[], options: MaterialSourceOption[]): MaterialCoverage[] {
  return materialAllocationLines(drafts, options).map((line) => {
    if (line.source !== "EXISTING_CONSUMPTION") throw new Error("Good-output coverage must reference already-consumed material.");
    return { consumptionId: line.consumptionId, inventoryItemId: line.inventoryItemId, quantity: line.quantity, unit: line.unit };
  });
}

export type DispositionDraft = {
  key: string;
  type: "SCRAP" | "CANCEL_UNPRODUCED";
  quantity: string;
  reason: string;
  sourceKind: "NEW_UNRECORDED" | "EXISTING_REJECTION";
  sourceType: "STEP_EXECUTION" | "EXECUTION_BATCH";
  sourceId: string;
  neverProducedAttestation: boolean;
  noMaterialWasteReason: string;
  materials: MaterialAllocationDraft[];
};

export function productionDispositions(drafts: DispositionDraft[], options: MaterialSourceOption[]): ProductionDisposition[] {
  if (!drafts.length) throw new Error("Add at least one reasoned scrap or never-produced disposition.");
  materialAllocationLines(drafts.flatMap((draft) => draft.materials), options);
  return drafts.map((draft) => {
    const quantity = parseProductionQuantity(draft.quantity, { positive: true });
    if (!draft.reason.trim()) throw new Error("Every disposition requires a reason.");
    const source: ProductionDisposition["source"] = draft.sourceKind === "NEW_UNRECORDED" ? { kind: "NEW_UNRECORDED" } : {
      kind: "EXISTING_REJECTION", sourceType: draft.sourceType, sourceId: draft.sourceId.trim(),
    };
    if (source.kind === "EXISTING_REJECTION" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(source.sourceId)) {
      throw new Error("Select or enter the original rejection source UUID. Historical loss must not be recorded twice.");
    }
    const base = { type: draft.type, quantity, reason: draft.reason.trim(), source };
    if (draft.type === "CANCEL_UNPRODUCED") {
      if (!draft.neverProducedAttestation) throw new Error("Confirm that cancelled pieces were never physically produced or processed.");
      if (draft.materials.length) throw new Error("Never-produced cancellation cannot contain material-waste lines.");
      return { ...base, neverProducedAttestation: true };
    }
    const materialWaste = materialAllocationLines(draft.materials, options);
    if (!materialWaste.length && !draft.noMaterialWasteReason.trim()) {
      throw new Error("Explain why scrap has no material waste, or declare actual wasted materials.");
    }
    return { ...base, materialWaste, ...(materialWaste.length ? {} : { noMaterialWasteReason: draft.noMaterialWasteReason.trim() }) };
  });
}
