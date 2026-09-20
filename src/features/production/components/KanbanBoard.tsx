"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import { productionOrderPath } from "@/lib/productionOrderLink";
import { useGetOrderAssignmentsQuery } from "../api/productionApi";
import { useGetActiveVendorsQuery } from "@/features/vendors/api/vendorApi";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import type { ProductionBoardItem, ProductionOrder } from "../types/production.types";
import {
  buildStepColumns, canDragProductionItem, fixedColumnForStatus, productionBoardLeaves,
  productionDropTarget, type BoardColumn, type FixedColumnKey,
} from "../utils/productionBoard";
import { formatProductionQuantity } from "../utils/productionQuantity";

export type KanbanViewMode = "fixed" | "step";

const FIXED_COLUMN_KEYS = ["TODO", "IN_PROGRESS", "DONE"] as const;

const FIXED_COLUMN_LABELS: Record<FixedColumnKey, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

function buildFixedColumns(items: ProductionBoardItem[]): BoardColumn[] {
  return FIXED_COLUMN_KEYS.map((key) => ({
    key,
    label: FIXED_COLUMN_LABELS[key],
    items: items.filter((item) => fixedColumnForStatus(item) === key),
  }));
}

export function KanbanBoard({
  items,
  ordersById,
  viewMode,
  selectedOrderId,
  onSelect,
  onRequestAdvance,
}: {
  items: ProductionBoardItem[];
  ordersById: Map<string, ProductionOrder>;
  viewMode: KanbanViewMode;
  selectedOrderId?: string;
  onSelect: (id?: string) => void;
  onRequestAdvance: (orderId: string, targetStepId?: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const leafItems = useMemo(() => productionBoardLeaves(items), [items]);
  const columns = useMemo(
    () => (viewMode === "fixed" ? buildFixedColumns(leafItems) : buildStepColumns(leafItems)),
    [leafItems, viewMode]
  );

  const itemsById = useMemo(() => new Map(leafItems.map((item) => [item.orderId, item])), [leafItems]);
  const activeItem = activeId ? itemsById.get(activeId) : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const item = itemsById.get(String(active.id));
    if (!item || !canDragProductionItem(item)) return;

    const sourceColumnKey = String(active.data.current?.columnKey ?? "");
    const targetColumnKey = String(over.id);
    if (sourceColumnKey === targetColumnKey) return;

    if (viewMode === "fixed") {
      handleFixedDrop(item, sourceColumnKey as FixedColumnKey, targetColumnKey as FixedColumnKey);
    } else {
      const target = columns.find((column) => column.key === targetColumnKey);
      if (!target) return;
      onRequestAdvance(
        item.orderId,
        target.key === "DONE" ? undefined : productionDropTarget(ordersById.get(item.orderId), target.label)
      );
    }
  };

  const handleFixedDrop = (
    item: ProductionBoardItem,
    from: FixedColumnKey,
    to: FixedColumnKey
  ) => {
    if (from === "DONE") {
      toast.error("This order is already finished and can't be moved.");
      return;
    }
    if (to === "TODO") {
      toast.error("Work can't be moved back to To Do.");
      return;
    }
    if (item.quantityModel === "FLOW_V1") {
      onRequestAdvance(item.orderId);
      return;
    }
    if (from === "TODO" && to === "DONE") {
      onSelect(item.orderId);
      toast.error("Record production before completing this order.");
      return;
    }
    if (from === "TODO" && to === "IN_PROGRESS") {
      onSelect(item.orderId);
      toast.info("Assign this order or a workflow step to move it into active work.");
      return;
    }

    onRequestAdvance(item.orderId);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {columns.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            selectedOrderId={selectedOrderId}
            onSelect={onSelect}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="w-64 rounded-lg border bg-white p-3 shadow-lg">
            <div className="font-medium">{activeItem.orderNumber}</div>
            {activeItem.batch && <div className="text-xs">{activeItem.batch.batchLabel}</div>}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  selectedOrderId,
  onSelect,
}: {
  column: BoardColumn;
  selectedOrderId?: string;
  onSelect: (id?: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-[70vh] flex-col rounded-lg border bg-muted/25",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{column.label}</h3>
          <StatusBadge tone="pending">{column.items.length}</StatusBadge>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {column.items.length ? (
          column.items.map((item) => (
            <KanbanCard
              key={item.orderId}
              item={item}
              columnKey={column.key}
              selected={selectedOrderId === item.orderId}
              onSelect={onSelect}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            No orders in this lane.
          </p>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  item,
  columnKey,
  selected,
  onSelect,
}: {
  item: ProductionBoardItem;
  columnKey: string;
  selected: boolean;
  onSelect: (id?: string) => void;
}) {
  const draggable = canDragProductionItem(item);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.orderId,
    data: { columnKey },
    disabled: !draggable,
  });

  const { data: assignments = [] } = useGetOrderAssignmentsQuery(item.orderId);
  const { data: activeVendors = [] } = useGetActiveVendorsQuery();

  const currentAssignment = assignments.find(
    (assignment) => assignment.orderStepSnapshotId === item.currentStepId
  );
  const vendor = currentAssignment?.vendorId
    ? activeVendors.find((candidate: Vendor) => candidate.id === currentAssignment.vendorId)
    : undefined;
  const isOverdue = Boolean(
    currentAssignment?.deadlineBreachNotifiedAt ||
      // eslint-disable-next-line react-hooks/purity -- overdue badges must compare against the current wall-clock time at render.
      (currentAssignment?.deadline && new Date(currentAssignment.deadline).getTime() < Date.now())
  );

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-white p-3 text-left transition",
        selected && "border-primary bg-primary/5 ring-1 ring-primary/25"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 text-left"
          onClick={() => onSelect(item.orderId)}
          aria-pressed={selected}
        >
          <div className="font-medium">{item.orderNumber}</div>
          {item.batch && <div className="text-xs font-medium">{item.batch.batchLabel}</div>}
          <div className="text-xs text-muted-foreground">
            {item.productName || item.productCode || item.productId}
          </div>
        </button>
        <button
          type="button"
          aria-label="Drag to move order"
          disabled={!draggable}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          {...attributes}
          {...listeners}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>
      </div>

      {item.batch && (
        <Link className="mt-1 block text-xs text-primary underline" href={productionOrderPath(item.batch.rootOrderId)}>
          Original order / family
        </Link>
      )}
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
        <div>
          Current-step good: {formatProductionQuantity(item.completedQuantity)}
        </div>
        <div>Step: {item.currentStepName || "Awaiting workflow step"}</div>
        {item.quantities || item.quantityModel === "FLOW_V1" ? (
          <>
            <div>Allocation: {formatProductionQuantity(item.quantities?.allocatedQuantity)}</div>
            <div>Final good: {formatProductionQuantity(item.quantities?.finalGoodQuantity)}</div>
            <div>Scrap: {formatProductionQuantity(item.quantities?.scrapQuantity)} · Cancelled: {formatProductionQuantity(item.quantities?.cancelledQuantity)}</div>
            <div>Pending: {formatProductionQuantity(item.quantities?.pendingQuantity)}</div>
            <div>Unclassified legacy: {formatProductionQuantity(item.quantities?.legacyUnclassifiedQuantity)}</div>
            {item.quantities?.reconciliationComplete !== true && <div className="text-amber-700">Quantity reconciliation incomplete or unavailable.</div>}
          </>
        ) : <div>Legacy planned: {formatProductionQuantity(item.plannedQuantity)}</div>}
        {item.batch?.closureOutcome && item.batch.closureOutcome !== "NONE" && <div>Closure: {item.batch.closureOutcome}</div>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {vendor ? (
          <Badge variant="secondary">Vendor: {vendor.name}</Badge>
        ) : currentAssignment?.assigneeUserId ? (
          <Badge variant="outline">Worker assigned</Badge>
        ) : null}
        {currentAssignment?.deadline ? (
          <Badge variant={isOverdue ? "destructive" : "outline"}>
            {isOverdue ? <AlertTriangle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
            {new Date(currentAssignment.deadline).toLocaleDateString()}
          </Badge>
        ) : null}
      </div>

    </div>
  );
}
