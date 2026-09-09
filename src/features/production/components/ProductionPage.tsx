"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Boxes,
  Check,
  ClipboardCheck,
  Factory,
  Filter,
  History,
  LayoutDashboard,
  List,
  PackageCheck,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/button";
import { ProductionAnalytics } from "./ProductionAnalytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/hook";
import { useGetActiveCustomersQuery } from "@/features/customers/api/customerApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import type { InventoryItem } from "@/features/inventory/types/inventory.types";
import { useGetProductsQuery } from "@/features/products/api/productsApi";
import {
  useAssignOrderMutation,
  useAssignStepMutation,
  useCancelOrderMutation,
  useCreateBomMutation,
  useCreateOrderMutation,
  useCreateProductionStationMutation,
  useCreateQualityTemplateMutation,
  useCreateWorkflowDraftMutation,
  useCreateWorkflowMutation,
  useCreateWorkstationMutation,
  useExecuteStepMutation,
  useGetBomsQuery,
  useGetExecutionBoardQuery,
  useGetMaterialLotsQuery,
  useGetOrderExecutionQuery,
  useGetOrderQuery,
  useGetOrdersQuery,
  useGetProductionDashboardQuery,
  useGetQualityResultsQuery,
  useGetQualityTemplatesQuery,
  useGetStationsQuery,
  useGetStationWorkloadsQuery,
  useGetTimelineQuery,
  useGetWorkflowVersionsQuery,
  useGetWorkflowsQuery,
  usePublishBomMutation,
  usePublishWorkflowMutation,
  useRecordQualityResultMutation,
  useStepActionMutation,
  useUpdateProductionStationMutation,
  useUpdateQualityTemplateMutation,
  useUpdateWorkstationMutation,
} from "../api/productionApi";
import type {
  Bom,
  BomItemRequest,
  MaterialLotConsumptionRequest,
  MaterialRequirement,
  OrderExecutionDetails,
  OrderStatus,
  OrderStep,
  OrderPriority,
  ProductionAssignment,
  ProductionAssignmentRequest,
  ProductionBoardColumn,
  ProductionBoardItem,
  ProductionDashboard,
  ProductionExecutionConflict,
  ProductionIndicator,
  ProductionIndicatorSeverity,
  ProductionOrder,
  ProductionOrderRequest,
  ProductionStation,
  ProductionStationRequest,
  ProductionStationWorkload,
  ProductionWorkstation,
  ProductionWorkstationRequest,
  QualityChecklistItemDisposition,
  QualityChecklistItemRequest,
  QualityChecklistResult,
  QualityChecklistResultItemRequest,
  QualityChecklistResultRequest,
  QualityChecklistTemplate,
  QualityChecklistTemplateRequest,
  QualityResultStatus,
  StepExecutionAction,
  StepExecutionRequest,
  TimelineEvent,
  WorkflowRequest,
  WorkflowStepRequest,
} from "../types/production.types";

type Tab = "orders" | "workflows" | "boms" | "analytics";
type OrdersViewMode = "board" | "list";
type OrderStatusFilter = "ALL" | OrderStatus;
type AssignmentFormState = {
  stationId: string;
  workstationId: string;
  assigneeLabel: string;
  notes: string;
  batchSize: string;
};
type MaterialSelectionValue = {
  lotId: string;
  quantity: string;
  unit: string;
  notes: string;
};

const opsRoles = ["OWNER", "ADMIN", "MANAGEMENT"];
const orderStatuses: OrderStatus[] = [
  "PLANNED",
  "RELEASED",
  "IN_PROGRESS",
  "ON_HOLD",
  "PARTIALLY_COMPLETED",
  "COMPLETED",
  "CANCELLED",
];
const boardStatuses: OrderStatus[] = [
  "PLANNED",
  "RELEASED",
  "IN_PROGRESS",
  "ON_HOLD",
  "PARTIALLY_COMPLETED",
  "COMPLETED",
  "CANCELLED",
];
const selectClassName =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

const emptyStep = (): WorkflowStepRequest => ({
  name: "",
  code: "",
  sequenceNumber: 1,
  active: true,
});

const emptyOrder = (): ProductionOrderRequest => ({
  orderNumber: "",
  productId: "",
  plannedQuantity: 1,
  priority: "NORMAL",
  workflowVersionId: "",
});

const emptyStation = (): ProductionStationRequest => ({
  code: "",
  name: "",
  description: "",
  active: true,
  status: "ACTIVE",
  capacityPerShift: 0,
});

const emptyWorkstation = (): ProductionWorkstationRequest => ({
  code: "",
  name: "",
  description: "",
  active: true,
  status: "ACTIVE",
  capacityPerHour: 0,
  queueLimit: 0,
});

const emptyAssignment = (
  assignment?: ProductionAssignment | null,
  fallbackStationId?: string | null,
  fallbackWorkstationId?: string | null,
  fallbackAssignee?: string | null
): AssignmentFormState => ({
  stationId: assignment?.stationId ?? fallbackStationId ?? "",
  workstationId: assignment?.workstationId ?? fallbackWorkstationId ?? "",
  assigneeLabel: assignment?.assigneeLabel ?? fallbackAssignee ?? "",
  notes: assignment?.notes ?? "",
  batchSize:
    assignment?.batchSize !== undefined && assignment?.batchSize !== null
      ? String(assignment.batchSize)
      : "",
});

const emptyQualityTemplate = (): QualityChecklistTemplateRequest => ({
  name: "",
  description: "",
  active: true,
  items: [
    { label: "Visual inspection", description: "", sequenceNumber: 1, required: true, inputType: "BOOLEAN" },
  ],
});

const statusTone = (status: string) => {
  if (["COMPLETED", "PUBLISHED", "PASS"].includes(status)) return "success" as const;
  if (["CANCELLED", "FAIL"].includes(status)) return "error" as const;
  if (["ON_HOLD", "HOLD"].includes(status)) return "warning" as const;
  if (["DRAFT", "PLANNED"].includes(status)) return "draft" as const;
  return "pending" as const;
};

const indicatorTone = (severity: ProductionIndicatorSeverity) => {
  if (severity === "critical") return "error" as const;
  if (severity === "warning") return "warning" as const;
  return "info" as const;
};

export function ProductionPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [tab, setTab] = useState<Tab>("orders");
  const [selectedOrderId, setSelectedOrderId] = useState<string>();

  if (!user || !opsRoles.includes(user.role)) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Production administration is available to owners, admins, and management only.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production tracking"
        description="Configure versioned workflows and BOMs, then run Phase 2 execution with boards, stations, quality, and material controls."
        icon={Factory}
        module="production"
      />

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(["orders", "workflows", "boms", "analytics"] as Tab[]).map((item) => (
          <Button
            key={item}
            variant={tab === item ? "default" : "ghost"}
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
          >
            {item === "orders"
              ? "Production orders"
              : item === "workflows"
                ? "Workflow templates"
                : item === "boms"
                  ? "BOM definitions"
                  : "Analytics"}
          </Button>
        ))}
      </div>

      {tab === "orders" ? (
        <Orders selectedOrderId={selectedOrderId} onSelect={setSelectedOrderId} />
      ) : null}
      {tab === "workflows" ? <Workflows /> : null}
      {tab === "boms" ? <Boms /> : null}
      {tab === "analytics" ? <ProductionAnalytics /> : null}
    </div>
  );
}

function Orders({
  selectedOrderId,
  onSelect,
}: {
  selectedOrderId?: string;
  onSelect: (id?: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [stationFilter, setStationFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<OrdersViewMode>("board");

  const ordersQuery = useGetOrdersQuery({ page: 0, size: 100 });
  const dashboardQuery = useGetProductionDashboardQuery();
  const stationsQuery = useGetStationsQuery();
  const stationWorkloadsQuery = useGetStationWorkloadsQuery();
  const boardQuery = useGetExecutionBoardQuery({
    page: 0,
    size: 100,
    search: search.trim() || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    stationId: stationFilter === "ALL" ? undefined : stationFilter,
  });

  const orders = useMemo(
    () => ordersQuery.data?.content ?? [],
    [ordersQuery.data]
  );
  const managedStations = useMemo(
    () => stationsQuery.data ?? [],
    [stationsQuery.data]
  );
  const fallbackStations = useMemo(
    () => deriveStationsFromOrders(orders),
    [orders]
  );
  const stations = managedStations.length ? managedStations : fallbackStations;

  const filteredOrders = useMemo(
    () =>
      filterOrders({
        orders,
        search,
        statusFilter,
        stationFilter,
      }),
    [orders, search, statusFilter, stationFilter]
  );

  const board = useMemo(() => {
    if (boardQuery.data?.columns?.length) {
      return boardQuery.data;
    }

    return {
      columns: buildFallbackBoardColumns(filteredOrders, statusFilter),
      generatedAt: undefined,
    };
  }, [boardQuery.data, filteredOrders, statusFilter]);

  const dashboard = useMemo<ProductionDashboard>(
    () =>
      dashboardQuery.data ??
      buildFallbackDashboard(
        orders,
        stationWorkloadsQuery.data ?? [],
        stations
      ),
    [dashboardQuery.data, orders, stationWorkloadsQuery.data, stations]
  );

  const refreshAll = () => {
    void ordersQuery.refetch();
    void dashboardQuery.refetch();
    void stationsQuery.refetch();
    void stationWorkloadsQuery.refetch();
    void boardQuery.refetch();
  };

  const statusCounts = useMemo(() => {
    return orders.reduce<Record<OrderStatus, number>>(
      (summary, order) => {
        summary[order.status] += 1;
        return summary;
      },
      {
        PLANNED: 0,
        RELEASED: 0,
        IN_PROGRESS: 0,
        ON_HOLD: 0,
        PARTIALLY_COMPLETED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      }
    );
  }, [orders]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active orders"
          value={String(dashboard.activeOrders)}
          description={`${dashboard.inProgressOrders} in progress · ${dashboard.plannedOrders} queued`}
          icon={PackageCheck}
          module="production"
        />
        <StatCard
          title="Delayed orders"
          value={String(dashboard.delayedOrders)}
          description={dashboard.delayedOrders ? "Requires recovery action" : "No overdue orders detected"}
          icon={AlertTriangle}
          module="production"
        />
        <StatCard
          title="Quality pass rate"
          value={`${formatPercent(dashboard.qualityPassRate)}`}
          description={`${dashboard.onHoldOrders} orders on hold`}
          icon={BadgeCheck}
          module="production"
        />
        <StatCard
          title="Shortage alerts"
          value={String(dashboard.shortageAlerts)}
          description={`${formatPercent(dashboard.stationUtilizationPercent ?? 0)} station utilization`}
          icon={Boxes}
          module="production"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Execution dashboard</CardTitle>
                  <CardDescription>
                    Switch between Kanban and list views, filter by status or station, and keep Phase 1 order workflows available.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={refreshAll}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create order
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto] lg:items-end">
                <Field label="Search orders">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Order number, product, step"
                      className="pl-9"
                      aria-label="Search production orders"
                    />
                  </div>
                </Field>
                <Field label="Station filter">
                  <select
                    className={selectClassName}
                    value={stationFilter}
                    onChange={(event) => setStationFilter(event.target.value)}
                    aria-label="Filter production orders by station"
                  >
                    <option value="ALL">All stations</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.code} · {station.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="View mode">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={viewMode === "board" ? "default" : "outline"}
                      onClick={() => setViewMode("board")}
                      aria-pressed={viewMode === "board"}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Board
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === "list" ? "default" : "outline"}
                      onClick={() => setViewMode("list")}
                      aria-pressed={viewMode === "list"}
                    >
                      <List className="mr-2 h-4 w-4" />
                      List
                    </Button>
                  </div>
                </Field>
              </div>

              <div className="flex flex-wrap gap-2" aria-label="Production status filters">
                <Button
                  type="button"
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  onClick={() => setStatusFilter("ALL")}
                  aria-pressed={statusFilter === "ALL"}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  All ({orders.length})
                </Button>
                {orderStatuses.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status)}
                    aria-pressed={statusFilter === status}
                  >
                    {humanize(status)} ({statusCounts[status]})
                  </Button>
                ))}
              </div>

              {boardQuery.isError ? (
                <InlineNotice tone="warning" title="Board endpoint unavailable">
                  Showing a locally derived board from order data. Station assignment, workload, and shortage indicators may be partial until <code>/api/production/orders/board</code> is implemented.
                </InlineNotice>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === "board" ? "Kanban board" : "Orders list"}
              </CardTitle>
              <CardDescription>
                {viewMode === "board"
                  ? "Track queued, running, blocked, and completed work by order status."
                  : "Review quantities, due dates, stations, and execution indicators in one table."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersQuery.isLoading ? (
                <Loading text="Loading production orders..." />
              ) : ordersQuery.isError && !orders.length ? (
                <ErrorState
                  title="Production orders could not be loaded"
                  message="Order APIs are unavailable right now."
                  onRetry={() => void ordersQuery.refetch()}
                />
              ) : !filteredOrders.length ? (
                <EmptyState
                  icon={Factory}
                  title="No orders match these filters"
                  description="Adjust the filters or create a new production order to start execution."
                  action={
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create order
                    </Button>
                  }
                />
              ) : viewMode === "board" ? (
                <BoardView
                  board={board.columns}
                  selectedOrderId={selectedOrderId}
                  onSelect={onSelect}
                />
              ) : (
                <OrderListView
                  orders={filteredOrders}
                  selectedOrderId={selectedOrderId}
                  onSelect={onSelect}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <StationManager
            stations={stations}
            workloads={stationWorkloadsQuery.data ?? []}
            managementAvailable={!stationsQuery.isError}
            loading={stationsQuery.isLoading && !stations.length}
            onRefresh={() => {
              void stationsQuery.refetch();
              void stationWorkloadsQuery.refetch();
            }}
          />

          {selectedOrderId ? (
            <OrderDetail
              key={selectedOrderId}
              orderId={selectedOrderId}
              stations={stations}
              stationsAvailable={!stationsQuery.isError}
              onClose={() => onSelect(undefined)}
            />
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="Select an order"
              description="Inspect assignments, partial execution, quality checks, material lots, and the immutable timeline from the detail panel."
            />
          )}
        </div>
      </div>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function BoardView({
  board,
  selectedOrderId,
  onSelect,
}: {
  board: ProductionBoardColumn[];
  selectedOrderId?: string;
  onSelect: (id?: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[960px] grid-flow-col auto-cols-[minmax(250px,1fr)] gap-4">
        {board.map((column) => (
          <div key={column.key} className="rounded-lg border bg-muted/25">
            <div className="border-b px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <StatusBadge tone={statusTone(column.key)}>{column.items.length}</StatusBadge>
              </div>
            </div>
            <div className="space-y-3 p-3">
              {column.items.length ? (
                column.items.map((item) => (
                  <button
                    key={item.orderId}
                    type="button"
                    className={cn(
                      "w-full rounded-lg border bg-white p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--factory1-primary)]",
                      selectedOrderId === item.orderId &&
                        "border-primary bg-primary/5 ring-1 ring-primary/25"
                    )}
                    onClick={() => onSelect(item.orderId)}
                    aria-pressed={selectedOrderId === item.orderId}
                    aria-label={`Open order ${item.orderNumber}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{item.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.productId}
                        </div>
                      </div>
                      <StatusBadge tone={statusTone(item.priority)}>
                        {item.priority}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                      <div>
                        Output {formatNumber(item.completedQuantity)} / {formatNumber(item.plannedQuantity)}
                      </div>
                      <div>Current step: {item.currentStepName || "Not started"}</div>
                      <div>
                        Station: {item.stationName || item.workstationName || "Unassigned"}
                      </div>
                      <div>Due: {formatDate(item.dueDate)}</div>
                    </div>
                    <IndicatorRow indicators={item.indicators ?? buildDerivedOrderIndicators(item)} className="mt-3" />
                  </button>
                ))
              ) : (
                <Empty text="No orders in this lane." />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderListView({
  orders,
  selectedOrderId,
  onSelect,
}: {
  orders: ProductionOrder[];
  selectedOrderId?: string;
  onSelect: (id?: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Current step</TableHead>
          <TableHead>Station</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Indicators</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const currentStep = getCurrentOrderStep(order);
          const indicators = order.indicators?.length
            ? order.indicators
            : buildDerivedOrderIndicators({
                orderId: order.id,
                orderNumber: order.orderNumber,
                productId: order.productId,
                priority: order.priority,
                status: order.status,
                dueDate: order.dueDate,
                plannedQuantity: order.plannedQuantity,
                completedQuantity: order.completedQuantity,
                rejectedQuantity: order.rejectedQuantity,
                remainingQuantity: order.remainingQuantity,
                currentStepId: order.currentStepId,
                currentStepName: currentStep?.name,
                stationName: order.assignedStationName ?? currentStep?.stationName ?? currentStep?.workstation,
                workstationName: order.assignedWorkstationName ?? currentStep?.workstationName,
              });

          return (
            <TableRow
              key={order.id}
              data-state={selectedOrderId === order.id ? "selected" : undefined}
            >
              <TableCell className="font-medium">
                <button
                  type="button"
                  className="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--factory1-primary)]"
                  onClick={() => onSelect(order.id)}
                >
                  {order.orderNumber}
                </button>
              </TableCell>
              <TableCell>{order.productId}</TableCell>
              <TableCell>
                {formatNumber(order.completedQuantity)} / {formatNumber(order.plannedQuantity)}
              </TableCell>
              <TableCell>{currentStep?.name || "Not started"}</TableCell>
              <TableCell>
                {order.assignedStationName ||
                  currentStep?.stationName ||
                  currentStep?.workstation ||
                  "Unassigned"}
              </TableCell>
              <TableCell>{formatDate(order.dueDate)}</TableCell>
              <TableCell>
                <IndicatorRow indicators={indicators} />
              </TableCell>
              <TableCell>
                <StatusBadge tone={statusTone(order.status)}>
                  {humanize(order.status)}
                </StatusBadge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function CreateOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: productsPage } = useGetProductsQuery({ page: 0, size: 300 });
  const { data: customers = [] } = useGetActiveCustomersQuery();
  const { data: workflowsPage } = useGetWorkflowsQuery({ page: 0, size: 100 });
  const products = productsPage?.content ?? [];
  const workflows = workflowsPage?.content ?? [];

  const [workflowId, setWorkflowId] = useState("");
  const { data: versions = [] } = useGetWorkflowVersionsQuery(workflowId, {
    skip: !workflowId,
  });
  const [form, setForm] = useState<ProductionOrderRequest>(emptyOrder());
  const [create, state] = useCreateOrderMutation();

  useEffect(() => {
    if (!open) return;
    setWorkflowId("");
    setForm(emptyOrder());
  }, [open]);

  const publishedVersions = versions.filter((version) => version.status === "PUBLISHED");

  const update = (patch: Partial<ProductionOrderRequest>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !form.orderNumber.trim() ||
      !form.productId ||
      !form.workflowVersionId ||
      Number(form.plannedQuantity) <= 0
    ) {
      toast.error("Order number, product, quantity, and a published workflow are required.");
      return;
    }

    try {
      await create({
        ...form,
        orderNumber: form.orderNumber.trim(),
        notes: form.notes?.trim() || undefined,
      }).unwrap();
      toast.success("Production order created");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not create production order");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create production order</DialogTitle>
          <DialogDescription>
            Orders stay compatible with the Phase 1 workflow while exposing Phase 2 execution controls.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Order number">
              <Input
                value={form.orderNumber}
                onChange={(event) => update({ orderNumber: event.target.value })}
                required
              />
            </Field>
            <Field label="Priority">
              <select
                className={selectClassName}
                value={form.priority}
                onChange={(event) => update({ priority: event.target.value as OrderPriority })}
              >
                {(["LOW", "NORMAL", "HIGH", "URGENT"] as OrderPriority[]).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Product">
            <select
              className={selectClassName}
              value={form.productId}
              onChange={(event) => update({ productId: event.target.value })}
              required
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.productCode} · {product.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer (optional)">
              <select
                className={selectClassName}
                value={form.customerId || ""}
                onChange={(event) =>
                  update({ customerId: event.target.value || undefined })
                }
              >
                <option value="">No customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerCode} · {customer.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Planned quantity">
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={form.plannedQuantity}
                onChange={(event) =>
                  update({ plannedQuantity: Number(event.target.value) || 0 })
                }
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Due date (optional)">
              <Input
                type="date"
                value={form.dueDate || ""}
                onChange={(event) => update({ dueDate: event.target.value || undefined })}
              />
            </Field>
            <Field label="Source order ID (optional)">
              <Input
                value={form.sourceOrderId || ""}
                onChange={(event) => update({ sourceOrderId: event.target.value || undefined })}
              />
            </Field>
          </div>

          <Field label="Workflow template">
            <select
              className={selectClassName}
              value={workflowId}
              onChange={(event) => {
                setWorkflowId(event.target.value);
                update({ workflowVersionId: "" });
              }}
              required
            >
              <option value="">Select workflow</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.code} · {workflow.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Published version">
            <select
              className={selectClassName}
              value={form.workflowVersionId}
              onChange={(event) => update({ workflowVersionId: event.target.value })}
              required
            >
              <option value="">Select version</option>
              {publishedVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  v{version.versionNumber}
                </option>
              ))}
            </select>
            {workflowId && !publishedVersions.length ? (
              <p className="text-xs text-amber-600">
                Publish a workflow version before creating an order.
              </p>
            ) : null}
          </Field>

          <Field label="Notes (optional)">
            <Textarea
              value={form.notes || ""}
              onChange={(event) => update({ notes: event.target.value || undefined })}
              placeholder="Planning note, customer requirement, or execution context"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={state.isLoading} type="submit">
              {state.isLoading ? "Creating..." : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StationManager({
  stations,
  workloads,
  managementAvailable,
  loading,
  onRefresh,
}: {
  stations: ProductionStation[];
  workloads: ProductionStationWorkload[];
  managementAvailable: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [stationDialog, setStationDialog] = useState<ProductionStation | null>(null);
  const [stationCreateOpen, setStationCreateOpen] = useState(false);
  const [workstationDialog, setWorkstationDialog] = useState<{
    station: ProductionStation;
    workstation?: ProductionWorkstation;
  } | null>(null);

  const [createStation, createStationState] = useCreateProductionStationMutation();
  const [updateStation, updateStationState] = useUpdateProductionStationMutation();
  const [createWorkstation, createWorkstationState] = useCreateWorkstationMutation();
  const [updateWorkstation, updateWorkstationState] = useUpdateWorkstationMutation();

  const workloadByStationId = useMemo(
    () => new Map(workloads.map((workload) => [workload.stationId, workload])),
    [workloads]
  );

  const saveStation = async (body: ProductionStationRequest) => {
    try {
      if (stationDialog) {
        await updateStation({ id: stationDialog.id, body }).unwrap();
        toast.success("Station updated");
      } else {
        await createStation(body).unwrap();
        toast.success("Station created");
      }
      setStationCreateOpen(false);
      setStationDialog(null);
      onRefresh();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not save station");
    }
  };

  const saveWorkstation = async (
    stationId: string,
    body: ProductionWorkstationRequest,
    workstationId?: string
  ) => {
    try {
      if (workstationId) {
        await updateWorkstation({ id: workstationId, body }).unwrap();
        toast.success("Workstation updated");
      } else {
        await createWorkstation({ stationId, body }).unwrap();
        toast.success("Workstation created");
      }
      setWorkstationDialog(null);
      onRefresh();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not save workstation");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Stations & workstations</CardTitle>
              <CardDescription>
                Manage production cells, view workload pressure, and keep assignment targets ready for execution.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {managementAvailable ? (
                <Button onClick={() => setStationCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add station
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!managementAvailable ? (
            <InlineNotice tone="warning" title="Station management unavailable">
              The UI is showing derived station labels from workflow steps because <code>/api/production/stations</code> is unavailable. CRUD actions are disabled until that endpoint exists.
            </InlineNotice>
          ) : null}

          {loading ? (
            <Loading text="Loading station configuration..." />
          ) : !stations.length ? (
            <EmptyState
              icon={Boxes}
              title="No stations configured"
              description="Add a station to organize assignments and workstation capacity."
            />
          ) : (
            stations.map((station) => {
              const workload = workloadByStationId.get(station.id) ?? station.workload;
              return (
                <div key={station.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {station.code} · {station.name}
                        </p>
                        <StatusBadge tone={statusTone(station.status || (station.active ? "ACTIVE" : "INACTIVE"))}>
                          {humanize(station.status || (station.active ? "ACTIVE" : "INACTIVE"))}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {station.description || "No station description"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Shift capacity: {formatNumber(station.capacityPerShift ?? 0)}</span>
                        <span>Active orders: {workload?.activeOrders ?? 0}</span>
                        <span>Delayed: {workload?.delayedOrders ?? 0}</span>
                        <span>Utilization: {formatPercent(workload?.capacityUtilization ?? 0)}</span>
                      </div>
                    </div>
                    {managementAvailable ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStationDialog(station)}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setWorkstationDialog({ station })}
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" />
                          Workstation
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <IndicatorRow indicators={station.indicators ?? deriveStationIndicators(workload)} className="mt-3" />

                  <div className="mt-3 space-y-2">
                    {station.workstations.length ? (
                      station.workstations.map((workstation) => (
                        <div
                          key={workstation.id}
                          className="rounded-md border bg-muted/20 p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">
                                {workstation.code} · {workstation.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {workstation.description || "No workstation description"}
                              </div>
                            </div>
                            {managementAvailable ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setWorkstationDialog({ station, workstation })
                                }
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </Button>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>Capacity/hr: {formatNumber(workstation.capacityPerHour ?? 0)}</span>
                            <span>Queue limit: {formatNumber(workstation.queueLimit ?? 0)}</span>
                            <span>{workstation.active ? "Active" : "Inactive"}</span>
                          </div>
                          <IndicatorRow indicators={workstation.indicators ?? []} className="mt-2" />
                        </div>
                      ))
                    ) : (
                      <Empty text="No workstations configured for this station." />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <StationDialog
        open={stationCreateOpen || Boolean(stationDialog)}
        station={stationDialog}
        loading={createStationState.isLoading || updateStationState.isLoading}
        onOpenChange={(open) => {
          if (!open) {
            setStationCreateOpen(false);
            setStationDialog(null);
          }
        }}
        onSubmit={saveStation}
      />

      <WorkstationDialog
        open={Boolean(workstationDialog)}
        station={workstationDialog?.station ?? null}
        workstation={workstationDialog?.workstation}
        loading={createWorkstationState.isLoading || updateWorkstationState.isLoading}
        onOpenChange={(open) => {
          if (!open) setWorkstationDialog(null);
        }}
        onSubmit={saveWorkstation}
      />
    </>
  );
}

function OrderDetail({
  orderId,
  stations,
  stationsAvailable,
  onClose,
}: {
  orderId: string;
  stations: ProductionStation[];
  stationsAvailable: boolean;
  onClose: () => void;
}) {
  const orderQuery = useGetOrderQuery(orderId);
  const timelineQuery = useGetTimelineQuery(orderId);
  const executionQuery = useGetOrderExecutionQuery(orderId);
  const [cancelOrder, cancelState] = useCancelOrderMutation();
  const [assignOrder, assignOrderState] = useAssignOrderMutation();
  const [assignStep, assignStepState] = useAssignStepMutation();
  const [executeStep, executeStepState] = useExecuteStepMutation();
  const [stepAction, stepActionState] = useStepActionMutation();
  const [recordQualityResult, recordQualityState] = useRecordQualityResultMutation();
  const [createQualityTemplate, createQualityTemplateState] = useCreateQualityTemplateMutation();
  const [updateQualityTemplate, updateQualityTemplateState] = useUpdateQualityTemplateMutation();

  const order = orderQuery.data;
  const execution = executionQuery.data;
  const orderSteps = order?.steps ?? [];
  const currentStep = order ? getCurrentOrderStep(order) : undefined;
  const activeExecutionStep = useMemo(() => {
    if (!execution || !currentStep) return undefined;
    return execution.steps.find((step) => step.stepId === currentStep.id);
  }, [execution, currentStep]);

  const { data: inventoryPage } = useGetInventoryItemsQuery({ page: 0, size: 300 });
  const inventoryItems = useMemo(
    () => inventoryPage?.content ?? [],
    [inventoryPage]
  );
  const { data: boms = [] } = useGetBomsQuery(order?.productId || "", {
    skip: !order?.productId,
  });

  const activeBom = useMemo(() => pickBestBom(boms), [boms]);
  const materialRequirements = useMemo(
    () => buildMaterialRequirements(activeBom, inventoryItems, order),
    [activeBom, inventoryItems, order]
  );

  const stepStationId =
    activeExecutionStep?.assignment?.stationId ?? currentStep?.stationId ?? order?.assignedStationId ?? undefined;

  const qualityTemplatesQuery = useGetQualityTemplatesQuery(
    {
      workflowStepCode: currentStep?.code,
      stationId: stepStationId || undefined,
    },
    { skip: !currentStep }
  );
  const qualityResultsQuery = useGetQualityResultsQuery(
    { orderId, stepId: currentStep?.id || "" },
    { skip: !currentStep }
  );
  const qualityTemplates = useMemo(
    () => qualityTemplatesQuery.data ?? [],
    [qualityTemplatesQuery.data]
  );
  const qualityResults = useMemo(
    () => qualityResultsQuery.data ?? [],
    [qualityResultsQuery.data]
  );

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [orderAssignment, setOrderAssignment] = useState<AssignmentFormState>(emptyAssignment());
  const [stepAssignment, setStepAssignment] = useState<AssignmentFormState>(emptyAssignment());
  const [completedQuantity, setCompletedQuantity] = useState("");
  const [rejectedQuantity, setRejectedQuantity] = useState("");
  const [holdQuantity, setHoldQuantity] = useState("");
  const [executionNotes, setExecutionNotes] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [qualityDraft, setQualityDraft] = useState<QualityChecklistResultRequest>({
    overallStatus: "PASS",
    notes: "",
    items: [],
  });
  const [materialSelections, setMaterialSelections] = useState<
    Record<string, MaterialSelectionValue>
  >({});
  const [templateDialog, setTemplateDialog] = useState<QualityChecklistTemplate | null>(null);
  const [templateCreateOpen, setTemplateCreateOpen] = useState(false);
  const [executionConflict, setExecutionConflict] = useState<ProductionExecutionConflict | null>(null);

  useEffect(() => {
    if (!order) return;
    queueMicrotask(() => {
      setOrderAssignment(
        emptyAssignment(
          undefined,
          order.assignedStationId,
          order.assignedWorkstationId,
          undefined
        )
      );
    });
  }, [order]);

  useEffect(() => {
    if (!currentStep) return;
    queueMicrotask(() => {
      setStepAssignment(
        emptyAssignment(
          activeExecutionStep?.assignment,
          currentStep.stationId,
          currentStep.workstationId,
          currentStep.assigneeLabel
        )
      );
    });
  }, [activeExecutionStep?.assignment, currentStep]);

  useEffect(() => {
    queueMicrotask(() => {
      if (!qualityTemplates.length) {
        setSelectedTemplateId("");
        return;
      }

      setSelectedTemplateId((current) => {
        if (
          current &&
          qualityTemplates.some((template) => template.id === current)
        ) {
          return current;
        }
        return qualityTemplates[0]?.id ?? "";
      });
    });
  }, [qualityTemplates]);

  const selectedTemplate = qualityTemplates.find(
    (template) => template.id === selectedTemplateId
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (!selectedTemplate) {
        setQualityDraft({ overallStatus: "PASS", notes: "", items: [] });
        return;
      }

      setQualityDraft({
        overallStatus: "PASS",
        notes: "",
        templateId: selectedTemplate.id,
        items: selectedTemplate.items.map((item) => ({
          checklistItemId: item.id,
          label: item.label,
          disposition: item.required ? "PASS" : "NOT_APPLICABLE",
          measuredValue: "",
          notes: "",
        })),
      });
    });
  }, [selectedTemplate]);

  if (orderQuery.isLoading || !order) {
    return (
      <Card>
        <CardContent className="p-6">
          {orderQuery.isError ? (
            <ErrorState
              title="Order details unavailable"
              message="The selected production order could not be loaded."
              onRetry={() => void orderQuery.refetch()}
            />
          ) : (
            <Loading text="Loading order details..." />
          )}
        </CardContent>
      </Card>
    );
  }

  const stationOptions = stations;
  const orderAssignmentWorkstations = getWorkstationsForStation(
    stationOptions,
    orderAssignment.stationId
  );
  const stepAssignmentWorkstations = getWorkstationsForStation(
    stationOptions,
    stepAssignment.stationId
  );
  const stepIndicators =
    activeExecutionStep?.indicators ?? currentStep?.indicators ?? [];
  const orderIndicators = execution?.orderIndicators ?? order.indicators ?? [];
  const shortageCount = materialRequirements.filter((item) => item.shortage).length;
  const latestQualityResult = qualityResults[0] ?? activeExecutionStep?.latestQualityResult;

  const refreshDetail = () => {
    void orderQuery.refetch();
    void timelineQuery.refetch();
    void executionQuery.refetch();
    void qualityResultsQuery.refetch();
    void qualityTemplatesQuery.refetch();
  };

  const submitOrderAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderAssignment.stationId) {
      toast.error("Select a station before assigning the order.");
      return;
    }

    const body: ProductionAssignmentRequest = {
      stationId: orderAssignment.stationId,
      workstationId: orderAssignment.workstationId || undefined,
      assigneeLabel: orderAssignment.assigneeLabel.trim() || undefined,
      notes: orderAssignment.notes.trim() || undefined,
      batchSize: parseNullableNumber(orderAssignment.batchSize),
    };

    try {
      await assignOrder({ orderId, body }).unwrap();
      toast.success("Order assigned");
      refreshDetail();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not assign production order");
    }
  };

  const submitStepAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentStep) return;
    if (!stepAssignment.stationId) {
      toast.error("Select a station before assigning the step.");
      return;
    }

    const body: ProductionAssignmentRequest = {
      stationId: stepAssignment.stationId,
      workstationId: stepAssignment.workstationId || undefined,
      assigneeLabel: stepAssignment.assigneeLabel.trim() || undefined,
      notes: stepAssignment.notes.trim() || undefined,
      batchSize: parseNullableNumber(stepAssignment.batchSize),
    };

    try {
      await assignStep({ orderId, stepId: currentStep.id, body }).unwrap();
      toast.success("Current step assigned");
      refreshDetail();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not assign current step");
    }
  };

  const submitQualityResult = async () => {
    if (!currentStep) return;
    if (!qualityDraft.items.length && !qualityDraft.notes?.trim()) {
      toast.error("Select or create a quality checklist first.");
      return;
    }

    try {
      await recordQualityResult({
        orderId,
        stepId: currentStep.id,
        body: normalizeQualityDraft(qualityDraft),
      }).unwrap();
      toast.success("Quality result recorded");
      void qualityResultsQuery.refetch();
      void executionQuery.refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not record quality result");
    }
  };

  const saveQualityTemplate = async (body: QualityChecklistTemplateRequest, id?: string) => {
    try {
      if (id) {
        await updateQualityTemplate({ id, body }).unwrap();
        toast.success("Quality template updated");
      } else {
        await createQualityTemplate(body).unwrap();
        toast.success("Quality template created");
      }
      setTemplateCreateOpen(false);
      setTemplateDialog(null);
      void qualityTemplatesQuery.refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not save quality template");
    }
  };

  const runExecutionAction = async (action: StepExecutionAction) => {
    if (!currentStep) return;

    const body = buildExecutionRequest({
      action,
      completedQuantity,
      rejectedQuantity,
      holdQuantity,
      executionNotes,
      order,
      currentStep,
      activeExecution: execution,
      assignment: stepAssignment,
      qualityDraft: selectedTemplate ? normalizeQualityDraft(qualityDraft) : undefined,
      materialSelections,
    });

    if (
      action === "COMPLETE" &&
      !body.completedQuantity &&
      !body.rejectedQuantity &&
      !body.holdQuantity
    ) {
      toast.error("Enter completed, rejected, or hold quantity before recording output.");
      return;
    }

    if (action === "HOLD" && !body.holdQuantity && !body.notes) {
      toast.error("Provide hold quantity or a note when putting a step on hold.");
      return;
    }

    try {
      setExecutionConflict(null);
      await executeStep({ orderId, stepId: currentStep.id, body }).unwrap();
      toast.success(getExecutionSuccessMessage(action));
      resetExecutionForm({
        setCompletedQuantity,
        setRejectedQuantity,
        setHoldQuantity,
        setExecutionNotes,
        setMaterialSelections,
      });
      refreshDetail();
      return;
    } catch (error) {
      const conflict = extractConflict(error);
      if (conflict || getErrorStatus(error) === 409) {
        setExecutionConflict(
          conflict ?? {
            message:
              apiErrorMessage(error) ??
              "Another operator updated this order. Refresh and review the latest execution state.",
          }
        );
        toast.warning("Execution conflict detected. Latest order state has been reloaded.");
        refreshDetail();
        return;
      }

      if (
        isEndpointUnavailable(error) &&
        canFallbackToPhase1StepAction(order, body)
      ) {
        try {
          await stepAction({
            orderId,
            stepId: currentStep.id,
            action: action === "START" ? "start" : action === "PAUSE" ? "pause" : "complete",
            body: {
              completedQuantity: body.completedQuantity,
              rejectedQuantity: body.rejectedQuantity,
              notes: body.notes,
              expectedOrderVersion: body.expectedOrderVersion,
              expectedStepVersion: body.expectedStepVersion,
            },
          }).unwrap();
          toast.warning(
            action === "COMPLETE"
              ? "Advanced execution endpoint unavailable. Recorded with the Phase 1 completion API; quality, hold, and lot details were not persisted."
              : "Advanced execution endpoint unavailable. The step was processed with the Phase 1 API."
          );
          resetExecutionForm({
            setCompletedQuantity,
            setRejectedQuantity,
            setHoldQuantity,
            setExecutionNotes,
            setMaterialSelections,
          });
          refreshDetail();
          return;
        } catch (fallbackError) {
          toast.error(apiErrorMessage(fallbackError) ?? "Could not process step action");
          return;
        }
      }

      toast.error(apiErrorMessage(error) ?? "Could not execute production step");
    }
  };

  const handleCancelOrder = async () => {
    try {
      await cancelOrder(orderId).unwrap();
      toast.success("Order cancelled");
      setConfirmCancelOpen(false);
      refreshDetail();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not cancel order");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{order.orderNumber}</CardTitle>
              <CardDescription>
                {order.productId} · workflow v{order.workflowVersionNumber} · {formatNumber(order.completedQuantity)} complete · {formatNumber(order.rejectedQuantity)} rejected
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone(order.status)}>{humanize(order.status)}</StatusBadge>
            <span className="text-xs text-muted-foreground">
              Remaining {formatNumber(order.remainingQuantity)}
            </span>
            <span className="text-xs text-muted-foreground">
              Due {formatDate(order.dueDate)}
            </span>
            {order.status !== "CANCELLED" && order.status !== "COMPLETED" ? (
              <Button size="sm" variant="outline" onClick={() => setConfirmCancelOpen(true)}>
                <Ban className="mr-2 h-3.5 w-3.5" />
                Cancel order
              </Button>
            ) : null}
          </div>

          {executionConflict ? (
            <InlineNotice tone="warning" title="Execution conflict handled">
              {executionConflict.message}
            </InlineNotice>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Completed" value={formatNumber(order.completedQuantity)} />
            <MiniStat label="Rejected" value={formatNumber(order.rejectedQuantity)} />
            <MiniStat label="Active step" value={currentStep?.name || "Not started"} />
            <MiniStat label="Shortages" value={String(shortageCount)} />
          </div>

          <IndicatorRow indicators={[...orderIndicators, ...deriveOrderRiskIndicators(order, latestQualityResult, shortageCount)]} />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Workflow steps</h3>
            <div className="space-y-2">
              {orderSteps.map((step) => {
                const executionStep = execution?.steps.find(
                  (candidate) => candidate.stepId === step.id
                );
                const isActive = currentStep?.id === step.id;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-lg border p-3",
                      isActive && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">
                          {step.sequenceNumber}. {step.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {step.code}
                          {step.workstation ? ` · ${step.workstation}` : ""}
                          {executionStep?.assignment?.stationName
                            ? ` · ${executionStep.assignment.stationName}`
                            : ""}
                          {executionStep?.assignment?.workstationName
                            ? ` / ${executionStep.assignment.workstationName}`
                            : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={statusTone(executionStep?.status || step.status || (isActive ? order.status : "PLANNED"))}>
                          {humanize(executionStep?.status || step.status || (isActive ? order.status : "PENDING"))}
                        </StatusBadge>
                        {executionStep?.expectedVersion !== undefined ? (
                          <span className="text-[11px] text-muted-foreground">
                            v{executionStep.expectedVersion}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <IndicatorRow
                      indicators={executionStep?.indicators ?? step.indicators ?? []}
                      className="mt-2"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Order assignment</CardTitle>
                <CardDescription>
                  Reserve the order for a station and optional workstation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!stationsAvailable ? (
                  <InlineNotice tone="warning" title="Assignment endpoint unavailable">
                    Station configuration could not be loaded, so assignment changes are disabled.
                  </InlineNotice>
                ) : (
                  <form className="space-y-3" onSubmit={submitOrderAssignment}>
                    <Field label="Station">
                      <select
                        className={selectClassName}
                        value={orderAssignment.stationId}
                        onChange={(event) => {
                          const nextStationId = event.target.value;
                          setOrderAssignment((current) => ({
                            ...current,
                            stationId: nextStationId,
                            workstationId: "",
                          }));
                        }}
                      >
                        <option value="">Select station</option>
                        {stationOptions.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.code} · {station.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Workstation (optional)">
                      <select
                        className={selectClassName}
                        value={orderAssignment.workstationId}
                        onChange={(event) =>
                          setOrderAssignment((current) => ({
                            ...current,
                            workstationId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Unassigned workstation</option>
                        {orderAssignmentWorkstations.map((workstation) => (
                          <option key={workstation.id} value={workstation.id}>
                            {workstation.code} · {workstation.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Assignee label (optional)">
                        <Input
                          value={orderAssignment.assigneeLabel}
                          onChange={(event) =>
                            setOrderAssignment((current) => ({
                              ...current,
                              assigneeLabel: event.target.value,
                            }))
                          }
                          placeholder="Supervisor or operator"
                        />
                      </Field>
                      <Field label="Batch size (optional)">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={orderAssignment.batchSize}
                          onChange={(event) =>
                            setOrderAssignment((current) => ({
                              ...current,
                              batchSize: event.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Notes (optional)">
                      <Textarea
                        value={orderAssignment.notes}
                        onChange={(event) =>
                          setOrderAssignment((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Capacity note, shift note, customer priority"
                      />
                    </Field>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={assignOrderState.isLoading}>
                        {assignOrderState.isLoading ? "Saving..." : "Assign order"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Current step assignment</CardTitle>
                <CardDescription>
                  Route the active step to a station, workstation, or named operator.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!currentStep ? (
                  <Empty text="This order has no active step yet." />
                ) : !stationsAvailable ? (
                  <InlineNotice tone="warning" title="Step assignment unavailable">
                    Station endpoints are unavailable, so the workflow's built-in workstation labels remain read-only.
                  </InlineNotice>
                ) : (
                  <form className="space-y-3" onSubmit={submitStepAssignment}>
                    <Field label="Station">
                      <select
                        className={selectClassName}
                        value={stepAssignment.stationId}
                        onChange={(event) => {
                          const nextStationId = event.target.value;
                          setStepAssignment((current) => ({
                            ...current,
                            stationId: nextStationId,
                            workstationId: "",
                          }));
                        }}
                      >
                        <option value="">Select station</option>
                        {stationOptions.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.code} · {station.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Workstation (optional)">
                      <select
                        className={selectClassName}
                        value={stepAssignment.workstationId}
                        onChange={(event) =>
                          setStepAssignment((current) => ({
                            ...current,
                            workstationId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Unassigned workstation</option>
                        {stepAssignmentWorkstations.map((workstation) => (
                          <option key={workstation.id} value={workstation.id}>
                            {workstation.code} · {workstation.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Assignee label (optional)">
                        <Input
                          value={stepAssignment.assigneeLabel}
                          onChange={(event) =>
                            setStepAssignment((current) => ({
                              ...current,
                              assigneeLabel: event.target.value,
                            }))
                          }
                          placeholder="Operator or shift lead"
                        />
                      </Field>
                      <Field label="Batch size (optional)">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={stepAssignment.batchSize}
                          onChange={(event) =>
                            setStepAssignment((current) => ({
                              ...current,
                              batchSize: event.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Notes (optional)">
                      <Textarea
                        value={stepAssignment.notes}
                        onChange={(event) =>
                          setStepAssignment((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Machine, jig, or staffing note"
                      />
                    </Field>
                    <IndicatorRow indicators={stepIndicators} className="mt-1" />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={assignStepState.isLoading}>
                        {assignStepState.isLoading ? "Saving..." : "Assign current step"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-dashed">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Quality checklist</CardTitle>
                  <CardDescription>
                    Use checklist templates to record PASS, FAIL, or HOLD outcomes with notes.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTemplateCreateOpen(true)}
                    disabled={!currentStep}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Template
                  </Button>
                  {selectedTemplate ? (
                    <Button variant="outline" onClick={() => setTemplateDialog(selectedTemplate)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {qualityTemplatesQuery.isError ? (
                <InlineNotice tone="warning" title="Quality templates unavailable">
                  The UI is ready for <code>/api/production/quality/templates</code>, but that endpoint is not responding yet.
                </InlineNotice>
              ) : null}

              {currentStep ? (
                <>
                  <Field label="Template">
                    <select
                      className={selectClassName}
                      value={selectedTemplateId}
                      onChange={(event) => setSelectedTemplateId(event.target.value)}
                    >
                      <option value="">No template selected</option>
                      {qualityTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                          {template.versionNumber ? ` · v${template.versionNumber}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {selectedTemplate ? (
                    <div className="space-y-3 rounded-lg border p-3">
                      {selectedTemplate.items.map((item, index) => {
                        const draftItem = qualityDraft.items[index];
                        return (
                          <div key={item.id} className="rounded-md border bg-muted/15 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{item.label}</p>
                              <StatusBadge tone={item.required ? "warning" : "info"}>
                                {item.required ? "Required" : "Optional"}
                              </StatusBadge>
                            </div>
                            {item.description ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            ) : null}
                            <div className="mt-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                              <Field label="Disposition">
                                <select
                                  className={selectClassName}
                                  value={draftItem?.disposition || "PASS"}
                                  onChange={(event) =>
                                    updateQualityDraftItem(
                                      setQualityDraft,
                                      index,
                                      "disposition",
                                      event.target.value as QualityChecklistItemDisposition
                                    )
                                  }
                                >
                                  {(["PASS", "FAIL", "HOLD", "NOT_APPLICABLE"] as QualityChecklistItemDisposition[]).map((disposition) => (
                                    <option key={disposition} value={disposition}>
                                      {humanize(disposition)}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field label={item.inputType === "NUMBER" ? "Measured value" : "Value (optional)"}>
                                  <Input
                                    value={draftItem?.measuredValue || ""}
                                    onChange={(event) =>
                                      updateQualityDraftItem(
                                        setQualityDraft,
                                        index,
                                        "measuredValue",
                                        event.target.value
                                      )
                                    }
                                    placeholder={item.targetValue ? `Target: ${item.targetValue}` : "Record value"}
                                  />
                                </Field>
                                <Field label="Notes (optional)">
                                  <Input
                                    value={draftItem?.notes || ""}
                                    onChange={(event) =>
                                      updateQualityDraftItem(
                                        setQualityDraft,
                                        index,
                                        "notes",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Observation"
                                  />
                                </Field>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty text="Select or create a quality template for this step." />
                  )}

                  <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <Field label="Overall result">
                      <select
                        className={selectClassName}
                        value={qualityDraft.overallStatus}
                        onChange={(event) =>
                          setQualityDraft((current) => ({
                            ...current,
                            overallStatus: event.target.value as QualityResultStatus,
                          }))
                        }
                      >
                        {(["PASS", "FAIL", "HOLD"] as QualityResultStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Quality notes">
                      <Textarea
                        value={qualityDraft.notes || ""}
                        onChange={(event) =>
                          setQualityDraft((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Inspection summary or disposition note"
                      />
                    </Field>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => void submitQualityResult()}
                      disabled={recordQualityState.isLoading || !selectedTemplate}
                    >
                      {recordQualityState.isLoading ? "Saving..." : "Record quality result"}
                    </Button>
                  </div>
                </>
              ) : (
                <Empty text="Quality controls become available when the order has an active step." />
              )}

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Recent quality results
                </div>
                {qualityResultsQuery.isError ? (
                  <InlineNotice tone="warning" title="Quality result history unavailable">
                    Result history will appear here after <code>/api/production/orders/:orderId/steps/:stepId/quality-results</code> is available.
                  </InlineNotice>
                ) : !qualityResults.length ? (
                  <Empty text="No quality results recorded for this step yet." />
                ) : (
                  qualityResults.map((result) => (
                    <div key={result.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={statusTone(result.overallStatus)}>
                          {result.overallStatus}
                        </StatusBadge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(result.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {result.notes || "No quality notes recorded."}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Material lots & shortages</CardTitle>
              <CardDescription>
                Select inventory lots for consumption and track shortage risk against the order's BOM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!activeBom ? (
                <Empty text="No BOM is available for this product yet." />
              ) : !materialRequirements.length ? (
                <Empty text="The selected BOM has no consumable material lines." />
              ) : (
                materialRequirements.map((requirement) => (
                  <div key={requirement.inventoryItemId} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium">
                          {requirement.itemCode || requirement.inventoryItemId}
                          {requirement.itemName ? ` · ${requirement.itemName}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Need ~{formatNumber(requirement.estimatedRequiredQuantity ?? 0)} {requirement.unit}
                          {" · "}
                          Available {formatNumber(requirement.availableQuantity ?? 0)} {requirement.unit}
                        </div>
                      </div>
                      {requirement.shortage ? (
                        <StatusBadge tone="warning">Shortage risk</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">Stock available</StatusBadge>
                      )}
                    </div>
                    <MaterialLotSelector
                      requirement={requirement}
                      stationId={stepAssignment.stationId || stepStationId || undefined}
                      value={materialSelections[requirement.inventoryItemId]}
                      onChange={(value) =>
                        setMaterialSelections((current) => ({
                          ...current,
                          [requirement.inventoryItemId]: value,
                        }))
                      }
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Step execution</CardTitle>
              <CardDescription>
                Record partial completion, rejections, holds, and operator notes with concurrency-safe version checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentStep ? (
                <Empty text="Execution controls will appear once an active step is available." />
              ) : (
                <>
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="font-medium">Execute: {currentStep.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {currentStep.code}
                      {activeExecutionStep?.status
                        ? ` · ${humanize(activeExecutionStep.status)}`
                        : ""}
                      {activeExecutionStep?.expectedVersion !== undefined
                        ? ` · step version ${activeExecutionStep.expectedVersion}`
                        : ""}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                      <span>Completed: {formatNumber(activeExecutionStep?.completedQuantity ?? order.completedQuantity)}</span>
                      <span>Rejected: {formatNumber(activeExecutionStep?.rejectedQuantity ?? order.rejectedQuantity)}</span>
                      <span>Held: {formatNumber(activeExecutionStep?.holdQuantity ?? 0)}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Completed quantity">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={completedQuantity}
                        onChange={(event) => setCompletedQuantity(event.target.value)}
                      />
                    </Field>
                    <Field label="Rejected quantity">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={rejectedQuantity}
                        onChange={(event) => setRejectedQuantity(event.target.value)}
                      />
                    </Field>
                    <Field label="Hold quantity">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={holdQuantity}
                        onChange={(event) => setHoldQuantity(event.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Execution notes">
                    <Textarea
                      value={executionNotes}
                      onChange={(event) => setExecutionNotes(event.target.value)}
                      placeholder="Downtime, recovery, inspection, material, or shift notes"
                    />
                  </Field>

                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    <p>
                      If the Phase 2 execution endpoint is unavailable, START and PAUSE automatically fall back to the Phase 1 step actions. COMPLETE only falls back when the request is equivalent to a final Phase 1 completion.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={executeStepState.isLoading || stepActionState.isLoading}
                      onClick={() => void runExecutionAction("START")}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={executeStepState.isLoading || stepActionState.isLoading}
                      onClick={() => void runExecutionAction("PAUSE")}
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={executeStepState.isLoading || stepActionState.isLoading}
                      onClick={() => void runExecutionAction("HOLD")}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Hold
                    </Button>
                    <Button
                      type="button"
                      disabled={executeStepState.isLoading || stepActionState.isLoading}
                      onClick={() => void runExecutionAction("COMPLETE")}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Record output
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Immutable timeline
              </CardTitle>
              <CardDescription>
                Preserves the Phase 1 event timeline while Phase 2 execution APIs roll out.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timelineQuery.isLoading ? (
                <Loading text="Loading order timeline..." />
              ) : timelineQuery.isError ? (
                <InlineNotice tone="warning" title="Timeline unavailable">
                  The current backend did not return timeline events for this order.
                </InlineNotice>
              ) : !timelineQuery.data?.length ? (
                <Empty text="No step activity recorded yet." />
              ) : (
                <div className="space-y-3">
                  {timelineQuery.data.map((event) => (
                    <TimelineEventRow key={event.id} event={event} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel this production order?"
        description="This preserves immutable history but prevents further execution on the order."
        confirmLabel={cancelState.isLoading ? "Cancelling..." : "Cancel order"}
        destructive
        loading={cancelState.isLoading}
        onConfirm={() => void handleCancelOrder()}
      />

      <QualityTemplateDialog
        open={templateCreateOpen || Boolean(templateDialog)}
        template={templateDialog}
        defaultWorkflowStepCode={currentStep?.code}
        defaultStationId={stepAssignment.stationId || stepStationId || ""}
        stations={stationOptions}
        loading={createQualityTemplateState.isLoading || updateQualityTemplateState.isLoading}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateCreateOpen(false);
            setTemplateDialog(null);
          }
        }}
        onSubmit={saveQualityTemplate}
      />
    </>
  );
}

function Workflows() {
  const workflowsQuery = useGetWorkflowsQuery({ page: 0, size: 50 });
  const [selectedId, setSelectedId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);

  const selectedTemplate = workflowsQuery.data?.content.find(
    (workflow) => workflow.id === selectedId
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Workflow templates</CardTitle>
              <CardDescription>
                Define versioned production steps without hardcoding garment operations.
              </CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workflowsQuery.isLoading ? (
            <Loading text="Loading workflow templates..." />
          ) : workflowsQuery.isError ? (
            <ErrorState
              title="Workflow templates unavailable"
              message="Workflow APIs could not be loaded."
              onRetry={() => void workflowsQuery.refetch()}
            />
          ) : !workflowsQuery.data?.content.length ? (
            <EmptyState
              icon={Factory}
              title="No workflow templates"
              description="Create a production workflow template to version your execution steps."
            />
          ) : (
            <div className="space-y-2">
              {workflowsQuery.data.content.map((workflow) => (
                <button
                  key={workflow.id}
                  type="button"
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--factory1-primary)]",
                    selectedId === workflow.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => setSelectedId(workflow.id)}
                >
                  <div className="font-medium">
                    {workflow.code} · {workflow.name}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {workflow.description || "No description"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTemplate ? (
        <WorkflowVersions template={selectedTemplate} />
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="Select a template"
          description="Choose a workflow to review versions and publish immutable steps."
        />
      )}

      <WorkflowDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function WorkflowVersions({
  template,
}: {
  template: { id: string; code: string; name: string; description?: string };
}) {
  const versionsQuery = useGetWorkflowVersionsQuery(template.id);
  const [publishWorkflow, publishState] = usePublishWorkflowMutation();
  const [createDraft, createDraftState] = useCreateWorkflowDraftMutation();
  const [pendingPublishId, setPendingPublishId] = useState<string>();

  const latest = versionsQuery.data?.[versionsQuery.data.length - 1];

  const cloneLatest = async () => {
    if (!latest) return;
    try {
      await createDraft({
        templateId: template.id,
        body: {
          code: template.code,
          name: template.name,
          description: template.description,
          steps: latest.steps.map(({ id: _id, ...step }) => step),
        },
      }).unwrap();
      toast.success("Draft version created");
      void versionsQuery.refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not create draft version");
    }
  };

  const confirmPublish = async () => {
    if (!pendingPublishId) return;
    try {
      await publishWorkflow(pendingPublishId).unwrap();
      toast.success("Workflow version published");
      setPendingPublishId(undefined);
      void versionsQuery.refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not publish workflow");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Workflow versions</CardTitle>
              <CardDescription>
                Published versions are immutable and can be reused by multiple orders.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => void cloneLatest()}
              disabled={!latest || createDraftState.isLoading}
            >
              {createDraftState.isLoading ? "Creating..." : "New draft"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {versionsQuery.isLoading ? (
            <Loading text="Loading workflow versions..." />
          ) : !versionsQuery.data?.length ? (
            <Empty text="No workflow versions yet." />
          ) : (
            versionsQuery.data.map((version) => (
              <div key={version.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">Version {version.versionNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {version.publishedAt
                        ? `Published ${formatDateTime(version.publishedAt)}`
                        : "Draft version"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={statusTone(version.status)}>
                      {version.status}
                    </StatusBadge>
                    {version.status === "DRAFT" ? (
                      <Button size="sm" onClick={() => setPendingPublishId(version.id)}>
                        Publish
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {version.steps.map((step) => (
                    <span key={step.id} className="rounded bg-muted px-2 py-1 text-xs">
                      {step.sequenceNumber}. {step.name}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingPublishId)}
        onOpenChange={(open) => !open && setPendingPublishId(undefined)}
        title="Publish this workflow version?"
        description="Published workflow steps cannot be edited and will be available for production orders immediately."
        confirmLabel={publishState.isLoading ? "Publishing..." : "Publish"}
        loading={publishState.isLoading}
        onConfirm={() => void confirmPublish()}
      />
    </>
  );
}

function WorkflowDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<WorkflowRequest>({
    code: "",
    name: "",
    description: "",
    steps: [emptyStep()],
  });
  const [createWorkflow, state] = useCreateWorkflowMutation();

  useEffect(() => {
    if (!open) return;
    setForm({ code: "", name: "", description: "", steps: [emptyStep()] });
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim() || form.steps.some((step) => !step.name.trim() || !step.code.trim())) {
      toast.error("Template code, name, and every step name/code are required.");
      return;
    }

    try {
      await createWorkflow({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        steps: form.steps.map((step, index) => ({
          ...step,
          name: step.name.trim(),
          code: step.code.trim(),
          description: step.description?.trim() || undefined,
          sequenceNumber: index + 1,
        })),
      }).unwrap();
      toast.success("Workflow draft created");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not create workflow");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New workflow template</DialogTitle>
          <DialogDescription>
            Create a draft template, then publish immutable versions for production orders.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                required
              />
            </Field>
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description || ""}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value || undefined })
              }
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Steps</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    steps: [
                      ...current.steps,
                      { ...emptyStep(), sequenceNumber: current.steps.length + 1 },
                    ],
                  }))
                }
              >
                Add step
              </Button>
            </div>
            {form.steps.map((step, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={`Step ${index + 1} name`}>
                    <Input
                      value={step.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          steps: current.steps.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Code">
                    <Input
                      value={step.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          steps: current.steps.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, code: event.target.value } : item
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Workstation label (optional)">
                    <Input
                      value={step.workstation || ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          steps: current.steps.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, workstation: event.target.value || undefined }
                              : item
                          ),
                        }))
                      }
                      placeholder="Cutting / Stitching / QC"
                    />
                  </Field>
                  <Field label="Role metadata (optional)">
                    <Input
                      value={step.roleMetadata || ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          steps: current.steps.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, roleMetadata: event.target.value || undefined }
                              : item
                          ),
                        }))
                      }
                      placeholder="Operator / checker / supervisor"
                    />
                  </Field>
                </div>
                <Field label="Description (optional)">
                  <Textarea
                    value={step.description || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        steps: current.steps.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, description: event.target.value || undefined }
                            : item
                        ),
                      }))
                    }
                  />
                </Field>
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={form.steps.length === 1}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        steps: current.steps
                          .filter((_, itemIndex) => itemIndex !== index)
                          .map((item, itemIndex) => ({
                            ...item,
                            sequenceNumber: itemIndex + 1,
                          })),
                      }))
                    }
                  >
                    Remove step
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={state.isLoading} type="submit">
              {state.isLoading ? "Creating..." : "Create draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Boms() {
  const { data: productsPage } = useGetProductsQuery({ page: 0, size: 300 });
  const products = productsPage?.content ?? [];
  const [productId, setProductId] = useState("");
  const bomsQuery = useGetBomsQuery(productId, { skip: !productId });
  const { data: inventoryPage } = useGetInventoryItemsQuery({
    page: 0,
    size: 300,
    itemType: "RAW_MATERIAL",
  });
  const inventoryItems = inventoryPage?.content ?? [];
  const [createBom, createState] = useCreateBomMutation();
  const [publishBom, publishState] = usePublishBomMutation();
  const [name, setName] = useState("Default BOM");
  const [items, setItems] = useState<BomItemRequest[]>([
    { inventoryItemId: "", quantityPerUnit: 1, unit: "", wastePercentage: 0 },
  ]);
  const [pendingPublishId, setPendingPublishId] = useState<string>();

  useEffect(() => {
    setName("Default BOM");
    setItems([{ inventoryItemId: "", quantityPerUnit: 1, unit: "", wastePercentage: 0 }]);
  }, [productId]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !productId ||
      !name.trim() ||
      items.some(
        (item) =>
          !item.inventoryItemId || Number(item.quantityPerUnit) <= 0 || !item.unit.trim()
      )
    ) {
      toast.error("Select a product and provide valid material, quantity, and unit for every BOM row.");
      return;
    }

    try {
      await createBom({
        productId,
        name: name.trim(),
        items: items.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          quantityPerUnit: Number(item.quantityPerUnit),
          unit: item.unit.trim(),
          wastePercentage: Number(item.wastePercentage || 0),
        })),
      }).unwrap();
      toast.success("BOM draft created");
      void bomsQuery.refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not save BOM");
    }
  };

  const confirmPublish = async () => {
    if (!pendingPublishId) return;
    try {
      await publishBom(pendingPublishId).unwrap();
      toast.success("BOM published");
      setPendingPublishId(undefined);
      void bomsQuery.refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not publish BOM");
    }
  };

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Product BOM</CardTitle>
            <CardDescription>
              Link raw materials to finished goods so execution can forecast shortages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="Product">
              <select
                className={selectClassName}
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productCode} · {product.name}
                  </option>
                ))}
              </select>
            </Field>

            {productId ? (
              <form onSubmit={save} className="mt-4 space-y-3">
                <Field label="BOM name">
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </Field>
                {items.map((item, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <Field label="Raw material">
                      <select
                        className={selectClassName}
                        value={item.inventoryItemId}
                        onChange={(event) => {
                          const selectedItem = inventoryItems.find(
                            (inventoryItem) => inventoryItem.id === event.target.value
                          );
                          setItems((current) =>
                            current.map((currentItem, currentIndex) =>
                              currentIndex === index
                                ? {
                                    ...currentItem,
                                    inventoryItemId: event.target.value,
                                    unit: selectedItem?.unit ?? currentItem.unit,
                                  }
                                : currentItem
                            )
                          );
                        }}
                      >
                        <option value="">Select raw material</option>
                        {inventoryItems.map((inventoryItem) => (
                          <option key={inventoryItem.id} value={inventoryItem.id}>
                            {inventoryItem.itemCode} · {inventoryItem.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field label="Qty / unit">
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.quantityPerUnit}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((currentItem, currentIndex) =>
                                currentIndex === index
                                  ? {
                                      ...currentItem,
                                      quantityPerUnit: Number(event.target.value) || 0,
                                    }
                                  : currentItem
                              )
                            )
                          }
                        />
                      </Field>
                      <Field label="Unit">
                        <Input
                          value={item.unit}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((currentItem, currentIndex) =>
                                currentIndex === index
                                  ? { ...currentItem, unit: event.target.value }
                                  : currentItem
                              )
                            )
                          }
                        />
                      </Field>
                      <Field label="Waste %">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.wastePercentage ?? 0}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((currentItem, currentIndex) =>
                                currentIndex === index
                                  ? {
                                      ...currentItem,
                                      wastePercentage: Number(event.target.value) || 0,
                                    }
                                  : currentItem
                              )
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setItems((current) => [
                        ...current,
                        { inventoryItemId: "", quantityPerUnit: 1, unit: "", wastePercentage: 0 },
                      ])
                    }
                  >
                    Add item
                  </Button>
                  <Button disabled={createState.isLoading} type="submit">
                    {createState.isLoading ? "Saving..." : "Save draft"}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{productId ? "BOM versions" : "Select a product"}</CardTitle>
            <CardDescription>
              Published BOMs stay immutable so production execution can audit material assumptions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bomsQuery.isLoading ? (
              <Loading text="Loading BOM versions..." />
            ) : bomsQuery.isError ? (
              <ErrorState
                title="BOMs unavailable"
                message="The BOM API is not responding right now."
                onRetry={() => void bomsQuery.refetch()}
              />
            ) : !productId ? (
              <Empty text="BOMs are scoped to a product." />
            ) : !bomsQuery.data?.length ? (
              <Empty text="No BOM versions yet." />
            ) : (
              <div className="space-y-2">
                {bomsQuery.data.map((bom) => (
                  <div key={bom.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {bom.name} · v{bom.versionNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {bom.items.length} material lines
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={statusTone(bom.status)}>{bom.status}</StatusBadge>
                        {bom.status === "DRAFT" ? (
                          <Button size="sm" onClick={() => setPendingPublishId(bom.id)}>
                            Publish
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(pendingPublishId)}
        onOpenChange={(open) => !open && setPendingPublishId(undefined)}
        title="Publish this BOM version?"
        description="Published BOM definitions become immutable and will drive shortage checks during execution."
        confirmLabel={publishState.isLoading ? "Publishing..." : "Publish"}
        loading={publishState.isLoading}
        onConfirm={() => void confirmPublish()}
      />
    </>
  );
}

function StationDialog({
  open,
  station,
  loading,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  station: ProductionStation | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: ProductionStationRequest) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductionStationRequest>(emptyStation());

  useEffect(() => {
    if (!open) return;
    setForm(
      station
        ? {
            code: station.code,
            name: station.name,
            description: station.description || "",
            active: station.active,
            status: station.status || "ACTIVE",
            capacityPerShift: station.capacityPerShift ?? 0,
          }
        : emptyStation()
    );
  }, [open, station]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Station code and name are required.");
      return;
    }

    await onSubmit({
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      capacityPerShift: Number(form.capacityPerShift) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{station ? "Edit station" : "Create station"}</DialogTitle>
          <DialogDescription>
            Configure a production station and its overall shift capacity.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            </Field>
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select
                className={selectClassName}
                value={form.status || "ACTIVE"}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as ProductionStationRequest["status"],
                  })
                }
              >
                {(["ACTIVE", "INACTIVE", "MAINTENANCE"] as const).map((status) => (
                  <option key={status} value={status}>
                    {humanize(status)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Capacity / shift">
              <Input
                type="number"
                min="0"
                step="0.001"
                value={form.capacityPerShift ?? 0}
                onChange={(event) =>
                  setForm({
                    ...form,
                    capacityPerShift: Number(event.target.value) || 0,
                  })
                }
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description || ""}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value || undefined })
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.active)}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Active station
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : station ? "Save station" : "Create station"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkstationDialog({
  open,
  station,
  workstation,
  loading,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  station: ProductionStation | null;
  workstation?: ProductionWorkstation;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    stationId: string,
    body: ProductionWorkstationRequest,
    workstationId?: string
  ) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductionWorkstationRequest>(emptyWorkstation());

  useEffect(() => {
    if (!open) return;
    setForm(
      workstation
        ? {
            code: workstation.code,
            name: workstation.name,
            description: workstation.description || "",
            active: workstation.active,
            status: workstation.status || "ACTIVE",
            capacityPerHour: workstation.capacityPerHour ?? 0,
            queueLimit: workstation.queueLimit ?? 0,
          }
        : emptyWorkstation()
    );
  }, [open, workstation]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!station) return;
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Workstation code and name are required.");
      return;
    }

    await onSubmit(
      station.id,
      {
        ...form,
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        capacityPerHour: Number(form.capacityPerHour) || 0,
        queueLimit: Number(form.queueLimit) || 0,
      },
      workstation?.id
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{workstation ? "Edit workstation" : "Create workstation"}</DialogTitle>
          <DialogDescription>
            {station ? `${station.code} · ${station.name}` : "Select station"}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            </Field>
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select
                className={selectClassName}
                value={form.status || "ACTIVE"}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as ProductionWorkstationRequest["status"],
                  })
                }
              >
                {(["ACTIVE", "INACTIVE", "MAINTENANCE"] as const).map((status) => (
                  <option key={status} value={status}>
                    {humanize(status)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Queue limit">
              <Input
                type="number"
                min="0"
                value={form.queueLimit ?? 0}
                onChange={(event) =>
                  setForm({ ...form, queueLimit: Number(event.target.value) || 0 })
                }
              />
            </Field>
          </div>
          <Field label="Capacity / hour">
            <Input
              type="number"
              min="0"
              step="0.001"
              value={form.capacityPerHour ?? 0}
              onChange={(event) =>
                setForm({
                  ...form,
                  capacityPerHour: Number(event.target.value) || 0,
                })
              }
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description || ""}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value || undefined })
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.active)}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Active workstation
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !station}>
              {loading ? "Saving..." : workstation ? "Save workstation" : "Create workstation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QualityTemplateDialog({
  open,
  template,
  defaultWorkflowStepCode,
  defaultStationId,
  stations,
  loading,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  template: QualityChecklistTemplate | null;
  defaultWorkflowStepCode?: string;
  defaultStationId?: string;
  stations: ProductionStation[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: QualityChecklistTemplateRequest, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<QualityChecklistTemplateRequest>(emptyQualityTemplate());

  useEffect(() => {
    if (!open) return;
    setForm(
      template
        ? {
            name: template.name,
            description: template.description || "",
            workflowStepCode: template.workflowStepCode,
            stationId: template.stationId,
            active: template.active,
            items: template.items.map((item) => ({
              label: item.label,
              description: item.description,
              sequenceNumber: item.sequenceNumber,
              required: item.required,
              inputType: item.inputType,
              targetValue: item.targetValue,
            })),
          }
        : {
            ...emptyQualityTemplate(),
            workflowStepCode: defaultWorkflowStepCode,
            stationId: defaultStationId || undefined,
          }
    );
  }, [open, template, defaultWorkflowStepCode, defaultStationId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || form.items.some((item) => !item.label.trim())) {
      toast.error("Template name and checklist item labels are required.");
      return;
    }

    await onSubmit(
      {
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        workflowStepCode: form.workflowStepCode?.trim() || undefined,
        stationId: form.stationId || undefined,
        items: form.items.map((item, index) => ({
          ...item,
          label: item.label.trim(),
          description: item.description?.trim() || undefined,
          targetValue: item.targetValue?.trim() || undefined,
          sequenceNumber: index + 1,
        })),
      },
      template?.id
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit quality template" : "Create quality template"}</DialogTitle>
          <DialogDescription>
            Templates can be scoped to a workflow step code and optional station.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Template name">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Workflow step code (optional)">
              <Input
                value={form.workflowStepCode || ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    workflowStepCode: event.target.value || undefined,
                  })
                }
                placeholder="STITCH-01"
              />
            </Field>
          </div>
          <Field label="Station (optional)">
            <select
              className={selectClassName}
              value={form.stationId || ""}
              onChange={(event) =>
                setForm({ ...form, stationId: event.target.value || undefined })
              }
            >
              <option value="">All stations</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.code} · {station.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description || ""}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value || undefined })
              }
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Checklist items</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    items: [
                      ...current.items,
                      {
                        label: "",
                        description: "",
                        sequenceNumber: current.items.length + 1,
                        required: true,
                        inputType: "BOOLEAN",
                        targetValue: "",
                      },
                    ],
                  }))
                }
              >
                Add item
              </Button>
            </div>
            {form.items.map((item, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Label">
                    <Input
                      value={item.label}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          items: current.items.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? { ...currentItem, label: event.target.value }
                              : currentItem
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Input type">
                    <select
                      className={selectClassName}
                      value={item.inputType || "BOOLEAN"}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          items: current.items.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  inputType: event.target.value as QualityChecklistItemRequest["inputType"],
                                }
                              : currentItem
                          ),
                        }))
                      }
                    >
                      {(["BOOLEAN", "TEXT", "NUMBER"] as const).map((inputType) => (
                        <option key={inputType} value={inputType}>
                          {humanize(inputType)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Target value (optional)">
                    <Input
                      value={item.targetValue || ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          items: current.items.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  targetValue: event.target.value || undefined,
                                }
                              : currentItem
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Description (optional)">
                    <Input
                      value={item.description || ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          items: current.items.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentItem,
                                  description: event.target.value || undefined,
                                }
                              : currentItem
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(item.required)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          items: current.items.map((currentItem, currentIndex) =>
                            currentIndex === index
                              ? { ...currentItem, required: event.target.checked }
                              : currentItem
                          ),
                        }))
                      }
                    />
                    Required item
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={form.items.length === 1}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        items: current.items
                          .filter((_, currentIndex) => currentIndex !== index)
                          .map((currentItem, currentIndex) => ({
                            ...currentItem,
                            sequenceNumber: currentIndex + 1,
                          })),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.active)}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Active template
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : template ? "Save template" : "Create template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaterialLotSelector({
  requirement,
  stationId,
  value,
  onChange,
}: {
  requirement: MaterialRequirement;
  stationId?: string;
  value?: MaterialSelectionValue;
  onChange: (value: MaterialSelectionValue) => void;
}) {
  const lotsQuery = useGetMaterialLotsQuery(
    {
      inventoryItemId: requirement.inventoryItemId,
      stationId,
    },
    { skip: !requirement.inventoryItemId }
  );

  const lots = lotsQuery.data ?? [];

  return (
    <div className="mt-3 space-y-2">
      {lotsQuery.isError ? (
        <InlineNotice tone="warning" title="Lot endpoint unavailable">
          Material-lot selection will work once <code>/api/production/material-lots</code> is available. The shortage estimate above still uses inventory balances.
        </InlineNotice>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
            <Field label="Inventory lot">
              <select
                className={selectClassName}
                value={value?.lotId || ""}
                onChange={(event) =>
                  onChange({
                    lotId: event.target.value,
                    quantity: value?.quantity || "",
                    unit:
                      lots.find((lot) => lot.id === event.target.value)?.unit ||
                      requirement.unit,
                    notes: value?.notes || "",
                  })
                }
                disabled={lotsQuery.isLoading}
              >
                <option value="">Select lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lotCode} · {formatNumber(lot.availableQuantity)} {lot.unit}
                    {lot.expiryDate ? ` · exp ${formatDate(lot.expiryDate)}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Consume qty">
              <Input
                type="number"
                min="0"
                step="0.001"
                value={value?.quantity || ""}
                onChange={(event) =>
                  onChange({
                    lotId: value?.lotId || "",
                    quantity: event.target.value,
                    unit: value?.unit || requirement.unit,
                    notes: value?.notes || "",
                  })
                }
              />
            </Field>
          </div>
          <Field label="Consumption note (optional)">
            <Input
              value={value?.notes || ""}
              onChange={(event) =>
                onChange({
                  lotId: value?.lotId || "",
                  quantity: value?.quantity || "",
                  unit: value?.unit || requirement.unit,
                  notes: event.target.value,
                })
              }
              placeholder="Issue bin, rack, or operator note"
            />
          </Field>
          {value?.lotId ? (
            <p className="text-xs text-muted-foreground">
              Selected unit: {value.unit || requirement.unit}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  return (
    <div className="border-l-2 border-primary/30 pl-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={statusTone(event.action)}>{humanize(event.action)}</StatusBadge>
        <span className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Completed {formatNumber(event.completedQuantity)} · Rejected {formatNumber(event.rejectedQuantity)}
        {event.notes ? ` · ${event.notes}` : ""}
      </p>
    </div>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function IndicatorRow({
  indicators,
  className,
}: {
  indicators: ProductionIndicator[];
  className?: string;
}) {
  if (!indicators.length) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {indicators.map((indicator, index) => (
        <StatusBadge
          key={`${indicator.label}-${index}`}
          tone={indicatorTone(indicator.severity)}
        >
          {indicator.label}
        </StatusBadge>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <p className="font-medium">{title}</p>
      <p>{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function InlineNotice({
  title,
  children,
  tone,
}: {
  title: string;
  children: ReactNode;
  tone: "warning" | "info";
}) {
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={cn("rounded-lg border p-3 text-sm", classes)}>
      <p className="font-medium">{title}</p>
      <div className="mt-1 text-xs leading-5">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function filterOrders({
  orders,
  search,
  statusFilter,
  stationFilter,
}: {
  orders: ProductionOrder[];
  search: string;
  statusFilter: OrderStatusFilter;
  stationFilter: string;
}) {
  const needle = search.trim().toLowerCase();

  return orders.filter((order) => {
    const currentStep = getCurrentOrderStep(order);
    const matchesSearch =
      !needle ||
      [
        order.orderNumber,
        order.productId,
        currentStep?.name,
        currentStep?.code,
        order.assignedStationName,
        order.assignedWorkstationName,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle));

    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    const matchesStation =
      stationFilter === "ALL" ||
      order.assignedStationId === stationFilter ||
      currentStep?.stationId === stationFilter;

    return matchesSearch && matchesStatus && matchesStation;
  });
}

function deriveStationsFromOrders(orders: ProductionOrder[]): ProductionStation[] {
  const stations = new Map<string, ProductionStation>();

  orders.forEach((order) => {
    order.steps.forEach((step) => {
      if (!step.workstation) return;

      const stationId = `derived-${step.workstation.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const existing = stations.get(stationId);
      if (!existing) {
        stations.set(stationId, {
          id: stationId,
          code: "WF",
          name: step.workstation,
          description: "Derived from workflow step labels",
          status: "ACTIVE",
          active: true,
          capacityPerShift: 0,
          workstations: [],
        });
      }
    });
  });

  return Array.from(stations.values());
}

function buildFallbackBoardColumns(
  orders: ProductionOrder[],
  statusFilter: OrderStatusFilter
): ProductionBoardColumn[] {
  const columns = (statusFilter === "ALL" ? boardStatuses : [statusFilter]).map(
    (status) => ({
      key: status,
      label: humanize(status),
      items: [] as ProductionBoardItem[],
    })
  );

  const columnsByKey = new Map(columns.map((column) => [column.key, column]));

  orders.forEach((order) => {
    const currentStep = getCurrentOrderStep(order);
    const column = columnsByKey.get(order.status);
    if (!column) return;
    column.items.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      productId: order.productId,
      priority: order.priority,
      status: order.status,
      dueDate: order.dueDate,
      plannedQuantity: order.plannedQuantity,
      completedQuantity: order.completedQuantity,
      rejectedQuantity: order.rejectedQuantity,
      remainingQuantity: order.remainingQuantity,
      currentStepId: order.currentStepId,
      currentStepName: currentStep?.name,
      stationId: order.assignedStationId ?? currentStep?.stationId ?? null,
      stationName:
        order.assignedStationName ??
        currentStep?.stationName ??
        currentStep?.workstation ??
        null,
      workstationId:
        order.assignedWorkstationId ?? currentStep?.workstationId ?? null,
      workstationName:
        order.assignedWorkstationName ?? currentStep?.workstationName ?? null,
      indicators: buildDerivedOrderIndicators({
        orderId: order.id,
        orderNumber: order.orderNumber,
        productId: order.productId,
        priority: order.priority,
        status: order.status,
        dueDate: order.dueDate,
        plannedQuantity: order.plannedQuantity,
        completedQuantity: order.completedQuantity,
        rejectedQuantity: order.rejectedQuantity,
        remainingQuantity: order.remainingQuantity,
        currentStepId: order.currentStepId,
        currentStepName: currentStep?.name,
        stationName:
          order.assignedStationName ??
          currentStep?.stationName ??
          currentStep?.workstation ??
          null,
        workstationName:
          order.assignedWorkstationName ?? currentStep?.workstationName ?? null,
      }),
    });
  });

  return columns;
}

function buildFallbackDashboard(
  orders: ProductionOrder[],
  workloads: ProductionStationWorkload[],
  stations: ProductionStation[]
): ProductionDashboard {
  const delayedOrders = orders.filter(isOrderDelayed).length;
  const activeOrders = orders.filter((order) =>
    ["PLANNED", "RELEASED", "IN_PROGRESS", "ON_HOLD", "PARTIALLY_COMPLETED"].includes(order.status)
  ).length;
  const completedToday = orders.filter((order) => {
    const due = safeDate(order.dueDate);
    if (!due) return false;
    const now = new Date();
    return due.toDateString() === now.toDateString() && order.status === "COMPLETED";
  }).length;
  const averageCompletionPercent =
    orders.length === 0
      ? 0
      : orders.reduce((sum, order) => sum + orderCompletionPercent(order), 0) /
        orders.length;

  return {
    activeOrders,
    plannedOrders: orders.filter((order) => order.status === "PLANNED").length,
    inProgressOrders: orders.filter((order) => order.status === "IN_PROGRESS").length,
    onHoldOrders: orders.filter((order) => order.status === "ON_HOLD").length,
    completedToday,
    delayedOrders,
    qualityPassRate:
      orders.length === 0
        ? 0
        : (orders.filter((order) => order.rejectedQuantity === 0).length / orders.length) * 100,
    shortageAlerts: orders.filter((order) => order.status === "ON_HOLD").length,
    averageCompletionPercent,
    stationUtilizationPercent:
      workloads.length > 0
        ? workloads.reduce(
            (sum, workload) => sum + Number(workload.capacityUtilization || 0),
            0
          ) / workloads.length
        : stations.length
          ? Math.min(100, (activeOrders / Math.max(stations.length, 1)) * 100)
          : 0,
    workloadByStation: workloads,
  };
}

function deriveStationIndicators(
  workload?: ProductionStationWorkload
): ProductionIndicator[] {
  if (!workload) return [];

  const indicators: ProductionIndicator[] = [];
  if ((workload.capacityUtilization ?? 0) >= 85) {
    indicators.push({
      type: "WORKLOAD",
      severity: "warning",
      label: "High workload",
    });
  }
  if (workload.delayedOrders > 0) {
    indicators.push({
      type: "DELAYED",
      severity: "warning",
      label: `${workload.delayedOrders} delayed`,
    });
  }
  if (workload.qualityHolds > 0) {
    indicators.push({
      type: "QUALITY_FAILURE",
      severity: "critical",
      label: `${workload.qualityHolds} QC holds`,
    });
  }
  return indicators;
}

function buildDerivedOrderIndicators(order: ProductionBoardItem): ProductionIndicator[] {
  const indicators: ProductionIndicator[] = [];
  if (isDueSoon(order.dueDate) && !["COMPLETED", "CANCELLED"].includes(order.status)) {
    indicators.push({
      type: "DELAYED",
      severity: isOrderDelayed(order) ? "critical" : "warning",
      label: isOrderDelayed(order) ? "Delayed" : "Due soon",
    });
  }
  if (order.status === "ON_HOLD") {
    indicators.push({ type: "INFO", severity: "warning", label: "On hold" });
  }
  if (!order.stationName && !order.workstationName) {
    indicators.push({ type: "INFO", severity: "info", label: "Unassigned" });
  }
  return indicators;
}

function deriveOrderRiskIndicators(
  order: ProductionOrder,
  latestQualityResult: QualityChecklistResult | undefined,
  shortageCount: number
): ProductionIndicator[] {
  const indicators: ProductionIndicator[] = [];

  if (isOrderDelayed(order)) {
    indicators.push({ type: "DELAYED", severity: "critical", label: "Delayed" });
  } else if (isDueSoon(order.dueDate)) {
    indicators.push({ type: "DELAYED", severity: "warning", label: "Due soon" });
  }

  if (latestQualityResult?.overallStatus === "FAIL") {
    indicators.push({ type: "QUALITY_FAILURE", severity: "critical", label: "Quality failure" });
  } else if (latestQualityResult?.overallStatus === "HOLD") {
    indicators.push({ type: "QUALITY_FAILURE", severity: "warning", label: "Quality hold" });
  }

  if (shortageCount > 0) {
    indicators.push({
      type: "SHORTAGE",
      severity: shortageCount > 1 ? "critical" : "warning",
      label: `${shortageCount} shortage${shortageCount > 1 ? "s" : ""}`,
    });
  }

  return indicators;
}

function buildMaterialRequirements(
  bom: Bom | undefined,
  inventoryItems: InventoryItem[],
  order?: ProductionOrder
): MaterialRequirement[] {
  if (!bom || !order) return [];

  return bom.items.map((item) => {
    const inventoryItem = inventoryItems.find(
      (candidate) => candidate.id === item.inventoryItemId
    );
    const estimatedRequiredQuantity = Number(order.remainingQuantity || 0) * Number(item.quantityPerUnit || 0);
    const availableQuantity = Number(inventoryItem?.currentStock || 0);
    return {
      inventoryItemId: item.inventoryItemId,
      itemCode: inventoryItem?.itemCode,
      itemName: inventoryItem?.name,
      unit: item.unit,
      quantityPerUnit: item.quantityPerUnit,
      estimatedRequiredQuantity,
      availableQuantity,
      shortage: availableQuantity < estimatedRequiredQuantity,
    };
  });
}

function buildExecutionRequest({
  action,
  completedQuantity,
  rejectedQuantity,
  holdQuantity,
  executionNotes,
  order,
  currentStep,
  activeExecution,
  assignment,
  qualityDraft,
  materialSelections,
}: {
  action: StepExecutionAction;
  completedQuantity: string;
  rejectedQuantity: string;
  holdQuantity: string;
  executionNotes: string;
  order: ProductionOrder;
  currentStep: OrderStep;
  activeExecution?: OrderExecutionDetails;
  assignment: AssignmentFormState;
  qualityDraft?: QualityChecklistResultRequest;
  materialSelections: Record<string, MaterialSelectionValue>;
}): StepExecutionRequest {
  const materialLots: MaterialLotConsumptionRequest[] = Object.entries(materialSelections)
    .map(([inventoryItemId, selection]) => ({
      inventoryItemId,
      lotId: selection.lotId,
      quantity: Number(selection.quantity),
      unit: selection.unit || undefined,
      notes: selection.notes.trim() || undefined,
    }))
    .filter((selection) => selection.lotId && selection.quantity > 0);

  return {
    action,
    completedQuantity: parseNullableNumber(completedQuantity),
    rejectedQuantity: parseNullableNumber(rejectedQuantity),
    holdQuantity: parseNullableNumber(holdQuantity),
    notes: executionNotes.trim() || undefined,
    expectedOrderVersion:
      activeExecution?.orderVersion ?? order.version ?? undefined,
    expectedStepVersion:
      activeExecution?.steps.find((step) => step.stepId === currentStep.id)?.expectedVersion ??
      currentStep.expectedVersion ??
      undefined,
    stationId: assignment.stationId || undefined,
    workstationId: assignment.workstationId || undefined,
    assigneeLabel: assignment.assigneeLabel.trim() || undefined,
    materialLots: materialLots.length ? materialLots : undefined,
    qualityResult:
      qualityDraft && (qualityDraft.items.length || qualityDraft.notes?.trim())
        ? qualityDraft
        : undefined,
  };
}

function canFallbackToPhase1StepAction(
  order: ProductionOrder,
  body: StepExecutionRequest
) {
  if (body.action === "START" || body.action === "PAUSE") {
    return true;
  }

  if (body.action !== "COMPLETE") {
    return false;
  }

  if (body.holdQuantity || body.materialLots?.length || body.qualityResult) {
    return false;
  }

  const completed = Number(body.completedQuantity || 0);
  const rejected = Number(body.rejectedQuantity || 0);
  return completed + rejected >= Number(order.remainingQuantity || 0);
}

function pickBestBom(boms: Bom[]) {
  return boms.find((bom) => bom.status === "PUBLISHED") ?? boms.at(-1);
}

function getCurrentOrderStep(order: ProductionOrder) {
  return order.steps.find((step) => step.id === order.currentStepId) ?? order.steps[0];
}

function getWorkstationsForStation(stations: ProductionStation[], stationId: string) {
  return stations.find((station) => station.id === stationId)?.workstations ?? [];
}

function updateQualityDraftItem(
  setQualityDraft: React.Dispatch<React.SetStateAction<QualityChecklistResultRequest>>,
  index: number,
  field: keyof QualityChecklistResultItemRequest,
  value: string
) {
  setQualityDraft((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ),
  }));
}

function normalizeQualityDraft(
  qualityDraft: QualityChecklistResultRequest
): QualityChecklistResultRequest {
  return {
    templateId: qualityDraft.templateId,
    overallStatus: qualityDraft.overallStatus,
    notes: qualityDraft.notes?.trim() || undefined,
    items: qualityDraft.items.map((item) => ({
      checklistItemId: item.checklistItemId,
      label: item.label,
      disposition: item.disposition,
      measuredValue: item.measuredValue?.trim() || undefined,
      notes: item.notes?.trim() || undefined,
    })),
  };
}

function resetExecutionForm({
  setCompletedQuantity,
  setRejectedQuantity,
  setHoldQuantity,
  setExecutionNotes,
  setMaterialSelections,
}: {
  setCompletedQuantity: (value: string) => void;
  setRejectedQuantity: (value: string) => void;
  setHoldQuantity: (value: string) => void;
  setExecutionNotes: (value: string) => void;
  setMaterialSelections: (value: Record<string, MaterialSelectionValue>) => void;
}) {
  setCompletedQuantity("");
  setRejectedQuantity("");
  setHoldQuantity("");
  setExecutionNotes("");
  setMaterialSelections({});
}

function getExecutionSuccessMessage(action: StepExecutionAction) {
  switch (action) {
    case "START":
      return "Step started";
    case "PAUSE":
      return "Step paused";
    case "HOLD":
      return "Step placed on hold";
    case "COMPLETE":
      return "Step execution recorded";
    default:
      return "Execution updated";
  }
}

function apiErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeError = error as {
    data?: {
      message?: unknown;
      error?: unknown;
      detail?: unknown;
    };
    error?: unknown;
  };

  if (typeof maybeError.data?.message === "string") {
    return maybeError.data.message;
  }

  if (typeof maybeError.data?.error === "string") {
    return maybeError.data.error;
  }

  if (typeof maybeError.data?.detail === "string") {
    return maybeError.data.detail;
  }

  if (typeof maybeError.error === "string") {
    return maybeError.error;
  }

  return null;
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const maybeError = error as { status?: unknown };
  return typeof maybeError.status === "number" ? maybeError.status : null;
}

function isEndpointUnavailable(error: unknown) {
  const status = getErrorStatus(error);
  return status === 404 || status === 405 || status === 501 || status === 503;
}

function extractConflict(error: unknown): ProductionExecutionConflict | null {
  if (!error || typeof error !== "object") return null;
  const maybeError = error as {
    data?: {
      conflict?: ProductionExecutionConflict;
      data?: {
        conflict?: ProductionExecutionConflict;
      };
    };
  };

  return maybeError.data?.conflict ?? maybeError.data?.data?.conflict ?? null;
}

function parseNullableNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());
}

function formatDate(value?: string | null) {
  const date = safeDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  const date = safeDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-IN");
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(
    Number(value || 0)
  );
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function orderCompletionPercent(order: ProductionOrder) {
  if (!order.plannedQuantity) return 0;
  return (Number(order.completedQuantity || 0) / Number(order.plannedQuantity || 0)) * 100;
}

function isDueSoon(value?: string | null) {
  const date = safeDate(value);
  if (!date) return false;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return diff <= 1000 * 60 * 60 * 24 * 2;
}

function isOrderDelayed(order: Pick<ProductionOrder, "dueDate" | "status"> | Pick<ProductionBoardItem, "dueDate" | "status">) {
  const dueDate = safeDate(order.dueDate);
  if (!dueDate) return false;
  if (["COMPLETED", "CANCELLED"].includes(order.status)) return false;
  return dueDate.getTime() < Date.now();
}
