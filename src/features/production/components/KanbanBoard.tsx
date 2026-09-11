"use client";

import { useMemo, useState } from "react";
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
import { useGetOrderAssignmentsQuery } from "../api/productionApi";
import { useGetActiveVendorsQuery } from "@/features/vendors/api/vendorApi";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import type { ProductionBoardItem, ProductionOrder } from "../types/production.types";

export type KanbanViewMode = "fixed" | "step";

const FIXED_COLUMN_KEYS = ["TODO", "IN_PROGRESS", "DONE"] as const;
type FixedColumnKey = (typeof FIXED_COLUMN_KEYS)[number];

const FIXED_COLUMN_LABELS: Record<FixedColumnKey, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

function fixedColumnForStatus(item: ProductionBoardItem): FixedColumnKey {
  switch (item.status) {
    case "PLANNED":
    case "RELEASED":
      return item.hasActiveAssignment ? "IN_PROGRESS" : "TODO";
    case "COMPLETED":
    case "CANCELLED":
      return "DONE";
    default:
      // IN_PROGRESS, ON_HOLD, PARTIALLY_COMPLETED
      return "IN_PROGRESS";
  }
}

type BoardColumn = {
  key: string;
  label: string;
  items: ProductionBoardItem[];
};

function buildFixedColumns(items: ProductionBoardItem[]): BoardColumn[] {
  return FIXED_COLUMN_KEYS.map((key) => ({
    key,
    label: FIXED_COLUMN_LABELS[key],
    items: items.filter((item) => fixedColumnForStatus(item) === key),
  }));
}

function buildStepColumns(
  items: ProductionBoardItem[],
  ordersById: Map<string, ProductionOrder>
): BoardColumn[] {
  const columnsByLabel = new Map<string, { items: ProductionBoardItem[]; minSequence: number }>();

  for (const item of items) {
    const label = item.currentStepName || "Unassigned step";
    const order = ordersById.get(item.orderId);
    const step = order?.steps.find((candidate) => candidate.id === item.currentStepId);
    const sequence = step?.sequenceNumber ?? 999;

    const existing = columnsByLabel.get(label);
    if (existing) {
      existing.items.push(item);
      existing.minSequence = Math.min(existing.minSequence, sequence);
    } else {
      columnsByLabel.set(label, { items: [item], minSequence: sequence });
    }
  }

  return Array.from(columnsByLabel.entries())
    .sort((a, b) => a[1].minSequence - b[1].minSequence)
    .map(([label, value]) => ({ key: label, label, items: value.items }));
}

function findStep(order: ProductionOrder | undefined, stepId: string | undefined) {
  if (!order || !stepId) return undefined;
  return order.steps.find((step) => step.id === stepId);
}

function findStepByName(order: ProductionOrder | undefined, name: string) {
  if (!order) return undefined;
  return order.steps.find((step) => step.name === name);
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

  const columns = useMemo(
    () => (viewMode === "fixed" ? buildFixedColumns(items) : buildStepColumns(items, ordersById)),
    [items, ordersById, viewMode]
  );

  const itemsById = useMemo(() => new Map(items.map((item) => [item.orderId, item])), [items]);
  const activeItem = activeId ? itemsById.get(activeId) : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const item = itemsById.get(String(active.id));
    if (!item) return;

    const sourceColumnKey = String(active.data.current?.columnKey ?? "");
    const targetColumnKey = String(over.id);
    if (sourceColumnKey === targetColumnKey) return;

    if (viewMode === "fixed") {
      await handleFixedDrop(item, sourceColumnKey as FixedColumnKey, targetColumnKey as FixedColumnKey);
    } else {
      await handleStepDrop(item, targetColumnKey);
    }
  };

  const handleFixedDrop = async (
    item: ProductionBoardItem,
    from: FixedColumnKey,
    to: FixedColumnKey
  ) => {
    const order = ordersById.get(item.orderId);
    const step = findStep(order, item.currentStepId);

    if (from === "DONE") {
      toast.error("This order is already finished and can't be moved.");
      return;
    }
    if (to === "TODO") {
      toast.error("Work can't be moved back to To Do.");
      return;
    }
    if (from === "TODO" && to === "DONE") {
      onSelect(item.orderId);
      toast.error("Record production before completing this order.");
      return;
    }
    if (!step) {
      toast.error("This order's current step isn't loaded yet — refresh and try again.");
      return;
    }

    if (from === "TODO" && to === "IN_PROGRESS") {
      onSelect(item.orderId);
      toast.info("Assign this order or a workflow step to move it into active work.");
      return;
    }

    onRequestAdvance(item.orderId);
  };

  const handleStepDrop = async (item: ProductionBoardItem, targetLabel: string) => {
    const order = ordersById.get(item.orderId);
    const sourceStep = findStep(order, item.currentStepId);
    const targetStep = findStepByName(order, targetLabel);

    if (!order || !sourceStep) {
      toast.error("This order's steps aren't loaded yet — refresh and try again.");
      return;
    }
    if (!targetStep) {
      toast.error(`This order's workflow has no "${targetLabel}" step.`);
      return;
    }
    if (targetStep.sequenceNumber <= sourceStep.sequenceNumber) {
      toast.error("Can't move a step backward.");
      return;
    }
    if (targetStep.sequenceNumber > sourceStep.sequenceNumber + 1) {
      toast.error("Skipping steps isn't allowed — move one step at a time.");
      return;
    }

    onRequestAdvance(item.orderId, targetStep.id);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={(event) => void handleDragEnd(event)}>
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.orderId,
    data: { columnKey },
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
          <div className="text-xs text-muted-foreground">{item.productId}</div>
        </button>
        <button
          type="button"
          aria-label="Drag to move order"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
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

      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
        <div>
          Output {item.completedQuantity} / {item.plannedQuantity}
        </div>
        <div>Step: {item.currentStepName || "Awaiting workflow step"}</div>
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
