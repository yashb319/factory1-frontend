import type { ProductionBoardItem, ProductionOrder } from "../types/production.types";
import type { ProductionQuantities } from "../types/productionFlow.types";
import { canProductionAction, productionIsTerminal } from "./productionFlow.ts";

export type FixedColumnKey = "TODO" | "IN_PROGRESS" | "DONE";
export type BoardColumn = { key: string; label: string; items: ProductionBoardItem[] };

export function productionBoardLeaves(items: ProductionBoardItem[]): ProductionBoardItem[] {
  return items.filter((item) => item.batch?.nodeType !== "SUMMARY");
}

export function fixedColumnForStatus(item: ProductionBoardItem): FixedColumnKey {
  if (productionIsTerminal(item)) return "DONE";
  if (item.status === "PLANNED" || item.status === "RELEASED") {
    return item.hasActiveAssignment ? "IN_PROGRESS" : "TODO";
  }
  return "IN_PROGRESS";
}

export function canDragProductionItem(item: ProductionBoardItem): boolean {
  return !productionIsTerminal(item) &&
    (canProductionAction(item, "ADVANCE") || canProductionAction(item, "SPLIT_ADVANCE"));
}

export function buildStepColumns(items: ProductionBoardItem[]): BoardColumn[] {
  const columns = new Map<string, BoardColumn>();
  const done: BoardColumn = { key: "DONE", label: "Done", items: [] };
  for (const item of productionBoardLeaves(items)) {
    if (productionIsTerminal(item)) {
      done.items.push(item);
      continue;
    }
    const label = item.currentStepName || "Unassigned step";
    const key = `STEP:${label}`;
    const column = columns.get(key) ?? { key, label, items: [] };
    column.items.push(item);
    columns.set(key, column);
  }
  return [...Array.from(columns.values()).sort((a, b) => a.label.localeCompare(b.label)), done];
}

export function productionDropTarget(order: ProductionOrder | undefined, label: string): string | undefined {
  const matches = order?.steps.filter((step) => step.name === label);
  // Step UUIDs belong to an order; never borrow a target from another leaf in the lane.
  return matches?.length === 1 ? matches[0].id : undefined;
}

export function productionTargetBasisLabel(basis: ProductionQuantities["targetBasis"] | undefined): string {
  switch (basis) {
    case "CREATED": return "Created target";
    case "CAPTURED_AT_ADOPTION": return "Target captured at legacy adoption";
    case "LEGACY_CURRENT": return "Legacy current target";
    default: return "Target provenance unavailable";
  }
}
