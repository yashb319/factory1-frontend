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
import { useGetEmployeesQuery } from "@/features/employees/api/employeeApi";
import {
  useCancelOrderMutation,
  useCreateBomMutation,
  useCreateMaterialConsumptionMutation,
  useCreateOrderAssignmentMutation,
  useCreateOrderMutation,
  useCreateQualityCheckTemplateMutation,
  useCreateQualityResultMutation,
  useCreateWorkflowDraftMutation,
  useCreateWorkflowMutation,
  useCreateWorkstationRecordMutation,
  useDeactivateWorkstationMutation,
  useDeleteAssignmentMutation,
  useGetBomsQuery,
  useGetDashboardStationsQuery,
  useGetExecutionBatchesQuery,
  useGetMaterialConsumptionsQuery,
  useGetOrderAssignmentsQuery,
  useGetOrderQuery,
  useGetOrdersQuery,
  useGetProductionDashboardQuery,
  useGetProductionKanbanQuery,
  useGetQualityCheckTemplatesQuery,
  useGetQualityResultsQuery,
  useGetTimelineQuery,
  useGetWorkflowVersionsQuery,
  useGetWorkflowsQuery,
  useGetWorkstationsQuery,
  usePublishBomMutation,
  usePublishWorkflowMutation,
  useStepActionMutation,
  useUpdateWorkstationRecordMutation,
} from "../api/productionApi";
import type {
  AssignmentRole,
  Bom,
  BomItemRequest,
  KanbanCard,
  MaterialConsumptionRequest,
  MaterialRequirement,
  OrderAssignmentRequest,
  OrderStatus,
  OrderPriority,
  ProductionBoardColumn,
  ProductionBoardItem,
  ProductionDashboard,
  ProductionExecutionConflict,
  ProductionIndicator,
  ProductionIndicatorSeverity,
  ProductionOrder,
  ProductionOrderRequest,
  ProductionStationWorkload,
  QualityResult,
  QualityResultRequest,
  QualityTemplateRequest,
  StepAction,
  StepActionRequest,
  TimelineEvent,
  Workstation,
  WorkstationRequest,
  WorkflowRequest,
  WorkflowStepRequest,
} from "../types/production.types";

type Tab = "orders" | "workflows" | "boms" | "analytics";
type OrdersViewMode = "board" | "list";
type OrderStatusFilter = "ALL" | OrderStatus;
type AssignmentFormState = {
  assignmentRole: AssignmentRole;
  assigneeUserId: string;
};
type MaterialConsumptionDraft = {
  lotNumber: string;
  quantity: string;
};
type QualityCheckDraft = {
  passed: boolean;
  value: string;
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

const emptyWorkstationRecord = (): WorkstationRequest => ({
  code: "",
  name: "",
  description: "",
  location: "",
  active: true,
});

const emptyAssignment = (): AssignmentFormState => ({
  assignmentRole: "OPERATOR",
  assigneeUserId: "",
});

const emptyDashboard: ProductionDashboard = {
  activeOrders: 0,
  plannedOrders: 0,
  inProgressOrders: 0,
  onHoldOrders: 0,
  completedToday: 0,
  delayedOrders: 0,
  qualityPassRate: 0,
  shortageAlerts: 0,
};

const emptyQualityTemplate = (): QualityTemplateRequest => ({
  code: "",
  name: "",
  description: "",
  workflowVersionId: undefined,
  productId: undefined,
  stepCode: undefined,
  checks: [{ code: "VISUAL", name: "Visual inspection", sequenceNumber: 1, required: true }],
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
  const workstationsQuery = useGetWorkstationsQuery({ page: 0, size: 200 });
  const workstationWorkloadsQuery = useGetDashboardStationsQuery();
  const boardQuery = useGetProductionKanbanQuery({
    page: 0,
    size: 100,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const orders = useMemo(
    () => ordersQuery.data?.content ?? [],
    [ordersQuery.data]
  );
  const stations = useMemo(
    () => workstationsQuery.data?.content ?? [],
    [workstationsQuery.data]
  );

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

  const board = useMemo(
    () =>
      buildBoardColumns(
        boardQuery.data?.content ?? [],
        orders,
        search,
        stationFilter
      ),
    [boardQuery.data, orders, search, stationFilter]
  );

  const dashboard = dashboardQuery.data ?? emptyDashboard;

  const refreshAll = () => {
    void ordersQuery.refetch();
    void dashboardQuery.refetch();
    void workstationsQuery.refetch();
    void workstationWorkloadsQuery.refetch();
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
                <InlineNotice tone="warning" title="Kanban board unavailable">
                  The production board could not be loaded right now. Try refreshing, or switch to the list view.
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
                  board={board}
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
          <WorkstationManager
            stations={stations}
            workloads={workstationWorkloadsQuery.data ?? []}
            loading={workstationsQuery.isLoading && !stations.length}
            error={workstationsQuery.isError && !stations.length}
            onRefresh={() => {
              void workstationsQuery.refetch();
              void workstationWorkloadsQuery.refetch();
            }}
          />

          {selectedOrderId ? (
            <OrderDetail
              key={selectedOrderId}
              orderId={selectedOrderId}
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

function WorkstationManager({
  stations,
  workloads,
  loading,
  error,
  onRefresh,
}: {
  stations: Workstation[];
  workloads: ProductionStationWorkload[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}) {
  const [workstationDialog, setWorkstationDialog] = useState<Workstation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Workstation | null>(null);

  const [createWorkstation, createWorkstationState] = useCreateWorkstationRecordMutation();
  const [updateWorkstation, updateWorkstationState] = useUpdateWorkstationRecordMutation();
  const [deactivateWorkstation, deactivateWorkstationState] = useDeactivateWorkstationMutation();

  const workloadByWorkstationId = useMemo(
    () => new Map(workloads.map((workload) => [workload.stationId, workload])),
    [workloads]
  );

  const saveWorkstation = async (body: WorkstationRequest) => {
    try {
      if (workstationDialog) {
        await updateWorkstation({ id: workstationDialog.id, body }).unwrap();
        toast.success("Workstation updated");
      } else {
        await createWorkstation(body).unwrap();
        toast.success("Workstation created");
      }
      setCreateOpen(false);
      setWorkstationDialog(null);
      onRefresh();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not save workstation");
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await deactivateWorkstation(deactivateTarget.id).unwrap();
      toast.success("Workstation deactivated");
      setDeactivateTarget(null);
      onRefresh();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not deactivate workstation");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Workstations</CardTitle>
              <CardDescription>
                Manage workstations, view workload pressure, and keep assignment targets ready for execution.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add workstation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <ErrorState
              title="Workstations could not be loaded"
              message="The workstation directory is unavailable right now."
              onRetry={onRefresh}
            />
          ) : loading ? (
            <Loading text="Loading workstation configuration..." />
          ) : !stations.length ? (
            <EmptyState
              icon={Boxes}
              title="No workstations configured"
              description="Add a workstation to organize assignments and workload."
            />
          ) : (
            stations.map((workstation) => {
              const workload = workloadByWorkstationId.get(workstation.id);
              return (
                <div key={workstation.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {workstation.code} · {workstation.name}
                        </p>
                        <StatusBadge tone={statusTone(workstation.active ? "ACTIVE" : "INACTIVE")}>
                          {humanize(workstation.active ? "ACTIVE" : "INACTIVE")}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {workstation.description || "No workstation description"}
                        {workstation.location ? ` · ${workstation.location}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Active orders: {workload?.activeOrders ?? 0}</span>
                        <span>Delayed: {workload?.delayedOrders ?? 0}</span>
                        <span>Utilization: {formatPercent(workload?.capacityUtilization ?? 0)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWorkstationDialog(workstation)}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      {workstation.active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeactivateTarget(workstation)}
                        >
                          <Ban className="mr-2 h-3.5 w-3.5" />
                          Deactivate
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <IndicatorRow indicators={deriveStationIndicators(workload)} className="mt-3" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <WorkstationRecordDialog
        open={createOpen || Boolean(workstationDialog)}
        workstation={workstationDialog}
        loading={createWorkstationState.isLoading || updateWorkstationState.isLoading}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setWorkstationDialog(null);
          }
        }}
        onSubmit={saveWorkstation}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title="Deactivate this workstation?"
        description="Deactivated workstations are hidden from new assignments but existing history is preserved."
        confirmLabel={deactivateWorkstationState.isLoading ? "Deactivating..." : "Deactivate"}
        destructive
        loading={deactivateWorkstationState.isLoading}
        onConfirm={() => void confirmDeactivate()}
      />
    </>
  );
}

function OrderDetail({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const orderQuery = useGetOrderQuery(orderId);
  const timelineQuery = useGetTimelineQuery(orderId);
  const assignmentsQuery = useGetOrderAssignmentsQuery(orderId);
  const executionBatchesQuery = useGetExecutionBatchesQuery(orderId);
  const materialConsumptionsQuery = useGetMaterialConsumptionsQuery(orderId);
  const { data: employeesPage } = useGetEmployeesQuery({ page: 0, size: 300, status: "ACTIVE" });
  const employees = useMemo(() => employeesPage?.content ?? [], [employeesPage]);
  const [cancelOrder, cancelState] = useCancelOrderMutation();
  const [createOrderAssignment, createOrderAssignmentState] = useCreateOrderAssignmentMutation();
  const [deleteAssignment, deleteAssignmentState] = useDeleteAssignmentMutation();
  const [stepAction, stepActionState] = useStepActionMutation();
  const [createQualityResult, createQualityResultState] = useCreateQualityResultMutation();
  const [createQualityTemplate, createQualityTemplateState] = useCreateQualityCheckTemplateMutation();

  const order = orderQuery.data;
  const orderSteps = order?.steps ?? [];
  const currentStep = order ? getCurrentOrderStep(order) : undefined;

  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);
  const orderAssignments = useMemo(
    () => assignments.filter((assignment) => !assignment.orderStepSnapshotId),
    [assignments]
  );
  const stepAssignments = useMemo(
    () =>
      currentStep
        ? assignments.filter((assignment) => assignment.orderStepSnapshotId === currentStep.id)
        : [],
    [assignments, currentStep]
  );
  const employeeName = (userId: string) =>
    employees.find((employee) => employee.id === userId)?.name ?? userId;

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
  const materialConsumptions = useMemo(
    () => materialConsumptionsQuery.data ?? [],
    [materialConsumptionsQuery.data]
  );
  const executionBatches = useMemo(
    () => executionBatchesQuery.data ?? [],
    [executionBatchesQuery.data]
  );

  // Backend only exposes a paged list of quality-check templates (no
  // per-step/station filter query params), so filter client-side against the
  // active step's code when a match exists, falling back to the full list.
  const qualityTemplatesQuery = useGetQualityCheckTemplatesQuery({ page: 0, size: 100 });
  const qualityResultsQuery = useGetQualityResultsQuery(
    { orderId, stepId: currentStep?.id },
    { skip: !currentStep }
  );
  const qualityTemplates = useMemo(() => {
    const all = qualityTemplatesQuery.data?.content ?? [];
    if (!currentStep?.code) return all;
    const matching = all.filter((template) => template.stepCode === currentStep.code);
    return matching.length ? matching : all;
  }, [qualityTemplatesQuery.data, currentStep]);
  const qualityResults = useMemo(
    () => qualityResultsQuery.data ?? [],
    [qualityResultsQuery.data]
  );

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [orderAssignment, setOrderAssignment] = useState<AssignmentFormState>(emptyAssignment());
  const [stepAssignment, setStepAssignment] = useState<AssignmentFormState>(emptyAssignment());
  const [completedQuantity, setCompletedQuantity] = useState("");
  const [rejectedQuantity, setRejectedQuantity] = useState("");
  const [executionNotes, setExecutionNotes] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [qualityChecks, setQualityChecks] = useState<Record<string, QualityCheckDraft>>({});
  const [materialDrafts, setMaterialDrafts] = useState<Record<string, MaterialConsumptionDraft>>({});
  const [templateCreateOpen, setTemplateCreateOpen] = useState(false);
  const [executionConflict, setExecutionConflict] = useState<ProductionExecutionConflict | null>(null);

  useEffect(() => {
    if (!order?.id) return;
    queueMicrotask(() => {
      setOrderAssignment(emptyAssignment());
    });
  }, [order?.id]);

  useEffect(() => {
    if (!currentStep?.id) return;
    queueMicrotask(() => {
      setStepAssignment(emptyAssignment());
    });
  }, [currentStep?.id]);

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
        setQualityChecks({});
        return;
      }

      setQualityChecks(
        Object.fromEntries(
          selectedTemplate.checks.map((check) => [
            check.id,
            { passed: true, value: "", notes: "" },
          ])
        )
      );
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

  const stepIndicators = currentStep?.indicators ?? [];
  const orderIndicators = order.indicators ?? [];
  const shortageCount = materialRequirements.filter((item) => item.shortage).length;
  const latestQualityResult = qualityResults[0];

  const refreshDetail = () => {
    void orderQuery.refetch();
    void timelineQuery.refetch();
    void qualityResultsQuery.refetch();
    void qualityTemplatesQuery.refetch();
    void assignmentsQuery.refetch();
    void executionBatchesQuery.refetch();
    void materialConsumptionsQuery.refetch();
  };

  const submitOrderAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderAssignment.assigneeUserId) {
      toast.error("Select an assignee before assigning the order.");
      return;
    }

    const body: OrderAssignmentRequest = {
      productionOrderId: orderId,
      assignmentRole: orderAssignment.assignmentRole,
      assigneeUserId: orderAssignment.assigneeUserId,
    };

    try {
      await createOrderAssignment({ orderId, body }).unwrap();
      toast.success("Order assigned");
      setOrderAssignment(emptyAssignment());
      refreshDetail();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not assign production order");
    }
  };

  const submitStepAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentStep) return;
    if (!stepAssignment.assigneeUserId) {
      toast.error("Select an assignee before assigning the step.");
      return;
    }

    const body: OrderAssignmentRequest = {
      productionOrderId: orderId,
      orderStepSnapshotId: currentStep.id,
      assignmentRole: stepAssignment.assignmentRole,
      assigneeUserId: stepAssignment.assigneeUserId,
    };

    try {
      await createOrderAssignment({ orderId, body }).unwrap();
      toast.success("Current step assigned");
      setStepAssignment(emptyAssignment());
      refreshDetail();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not assign current step");
    }
  };

  const removeAssignment = async (id: string) => {
    try {
      await deleteAssignment(id).unwrap();
      toast.success("Assignment removed");
      refreshDetail();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not remove assignment");
    }
  };

  const submitQualityResults = async () => {
    if (!currentStep || !selectedTemplate) return;
    const checks = selectedTemplate.checks;
    if (!checks.length) {
      toast.error("The selected template has no checks to record.");
      return;
    }

    try {
      await Promise.all(
        checks.map((check) => {
          const draft = qualityChecks[check.id] ?? { passed: true, value: "", notes: "" };
          const body: QualityResultRequest = {
            orderStepSnapshotId: currentStep.id,
            templateId: selectedTemplate.id,
            definitionId: check.id,
            passed: draft.passed,
            value: draft.value.trim() || undefined,
            notes: draft.notes.trim() || undefined,
          };
          return createQualityResult({ orderId, body }).unwrap();
        })
      );
      toast.success("Quality results recorded");
      void qualityResultsQuery.refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not record quality results");
    }
  };

  const saveQualityTemplate = async (body: QualityTemplateRequest) => {
    try {
      await createQualityTemplate(body).unwrap();
      toast.success("Quality template created");
      setTemplateCreateOpen(false);
      void qualityTemplatesQuery.refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not save quality template");
    }
  };

  const runStepAction = async (action: StepAction) => {
    if (!currentStep) return;

    const body: StepActionRequest = {
      completedQuantity: parseNullableNumber(completedQuantity),
      rejectedQuantity: parseNullableNumber(rejectedQuantity),
      notes: executionNotes.trim() || undefined,
      expectedOrderVersion: order.version ?? undefined,
      expectedStepVersion: currentStep.expectedVersion ?? undefined,
    };

    if (
      action === "complete" &&
      !body.completedQuantity &&
      !body.rejectedQuantity
    ) {
      toast.error("Enter a completed or rejected quantity before recording output.");
      return;
    }

    try {
      setExecutionConflict(null);
      await stepAction({ orderId, stepId: currentStep.id, action, body }).unwrap();
      toast.success(getStepActionSuccessMessage(action));
      setCompletedQuantity("");
      setRejectedQuantity("");
      setExecutionNotes("");
      refreshDetail();
    } catch (error) {
      if (getErrorStatus(error) === 409) {
        setExecutionConflict({
          message:
            apiErrorMessage(error) ??
            "Another operator updated this order. Refresh and review the latest state.",
        });
        toast.warning("Execution conflict detected. Latest order state has been reloaded.");
        refreshDetail();
        return;
      }

      toast.error(apiErrorMessage(error) ?? "Could not process step action");
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
                          {step.stationName ? ` · ${step.stationName}` : ""}
                          {step.workstationName ? ` / ${step.workstationName}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={statusTone(step.status || (isActive ? order.status : "PLANNED"))}>
                          {humanize(step.status || (isActive ? order.status : "PENDING"))}
                        </StatusBadge>
                        {step.expectedVersion !== undefined ? (
                          <span className="text-[11px] text-muted-foreground">
                            v{step.expectedVersion}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <IndicatorRow
                      indicators={step.indicators ?? []}
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
                  Assign a user with a role to own this production order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignmentsQuery.isError ? (
                  <InlineNotice tone="warning" title="Assignments unavailable">
                    Current assignments could not be loaded. You can still try assigning below.
                  </InlineNotice>
                ) : null}

                {orderAssignments.length ? (
                  <div className="space-y-2">
                    {orderAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 p-2 text-sm"
                      >
                        <span>
                          <StatusBadge tone="pending">{humanize(assignment.assignmentRole)}</StatusBadge>{" "}
                          {employeeName(assignment.assigneeUserId)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteAssignmentState.isLoading}
                          onClick={() => void removeAssignment(assignment.id)}
                        >
                          <Ban className="mr-2 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty text="No one is assigned to this order yet." />
                )}

                <form className="space-y-3" onSubmit={submitOrderAssignment}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Role">
                      <select
                        className={selectClassName}
                        value={orderAssignment.assignmentRole}
                        onChange={(event) =>
                          setOrderAssignment((current) => ({
                            ...current,
                            assignmentRole: event.target.value as AssignmentRole,
                          }))
                        }
                      >
                        {(["OPERATOR", "SUPERVISOR", "USER"] as AssignmentRole[]).map((role) => (
                          <option key={role} value={role}>
                            {humanize(role)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Assignee">
                      <select
                        className={selectClassName}
                        value={orderAssignment.assigneeUserId}
                        onChange={(event) =>
                          setOrderAssignment((current) => ({
                            ...current,
                            assigneeUserId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select assignee</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={createOrderAssignmentState.isLoading}>
                      {createOrderAssignmentState.isLoading ? "Saving..." : "Assign order"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Current step assignment</CardTitle>
                <CardDescription>
                  Assign a user with a role to the active workflow step.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!currentStep ? (
                  <Empty text="This order has no active step yet." />
                ) : (
                  <div className="space-y-3">
                    {assignmentsQuery.isError ? (
                      <InlineNotice tone="warning" title="Assignments unavailable">
                        Current assignments could not be loaded. You can still try assigning below.
                      </InlineNotice>
                    ) : null}

                    {stepAssignments.length ? (
                      <div className="space-y-2">
                        {stepAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 p-2 text-sm"
                          >
                            <span>
                              <StatusBadge tone="pending">{humanize(assignment.assignmentRole)}</StatusBadge>{" "}
                              {employeeName(assignment.assigneeUserId)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deleteAssignmentState.isLoading}
                              onClick={() => void removeAssignment(assignment.id)}
                            >
                              <Ban className="mr-2 h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty text="No one is assigned to this step yet." />
                    )}

                    <form className="space-y-3" onSubmit={submitStepAssignment}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Role">
                          <select
                            className={selectClassName}
                            value={stepAssignment.assignmentRole}
                            onChange={(event) =>
                              setStepAssignment((current) => ({
                                ...current,
                                assignmentRole: event.target.value as AssignmentRole,
                              }))
                            }
                          >
                            {(["OPERATOR", "SUPERVISOR", "USER"] as AssignmentRole[]).map((role) => (
                              <option key={role} value={role}>
                                {humanize(role)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Assignee">
                          <select
                            className={selectClassName}
                            value={stepAssignment.assigneeUserId}
                            onChange={(event) =>
                              setStepAssignment((current) => ({
                                ...current,
                                assigneeUserId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select assignee</option>
                            {employees.map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {employee.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <IndicatorRow indicators={stepIndicators} className="mt-1" />
                      <div className="flex justify-end">
                        <Button type="submit" disabled={createOrderAssignmentState.isLoading}>
                          {createOrderAssignmentState.isLoading ? "Saving..." : "Assign current step"}
                        </Button>
                      </div>
                    </form>
                  </div>
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
                    Use quality-check templates to record PASS/FAIL outcomes per check, with an optional value and notes.
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {qualityTemplatesQuery.isError ? (
                <InlineNotice tone="warning" title="Quality templates unavailable">
                  Quality-check templates could not be loaded from <code>/api/production/quality-check-templates</code>.
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
                          {template.code} · {template.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {selectedTemplate ? (
                    <div className="space-y-3 rounded-lg border p-3">
                      {selectedTemplate.checks.map((check) => {
                        const draft = qualityChecks[check.id] ?? { passed: true, value: "", notes: "" };
                        return (
                          <div key={check.id} className="rounded-md border bg-muted/15 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{check.name}</p>
                              <StatusBadge tone={check.required ? "warning" : "info"}>
                                {check.required ? "Required" : "Optional"}
                              </StatusBadge>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                              <Field label="Result">
                                <select
                                  className={selectClassName}
                                  value={draft.passed ? "PASS" : "FAIL"}
                                  onChange={(event) =>
                                    setQualityChecks((current) => ({
                                      ...current,
                                      [check.id]: { ...draft, passed: event.target.value === "PASS" },
                                    }))
                                  }
                                >
                                  <option value="PASS">Pass</option>
                                  <option value="FAIL">Fail</option>
                                </select>
                              </Field>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Value (optional)">
                                  <Input
                                    value={draft.value}
                                    onChange={(event) =>
                                      setQualityChecks((current) => ({
                                        ...current,
                                        [check.id]: { ...draft, value: event.target.value },
                                      }))
                                    }
                                    placeholder="Record value"
                                  />
                                </Field>
                                <Field label="Notes (optional)">
                                  <Input
                                    value={draft.notes}
                                    onChange={(event) =>
                                      setQualityChecks((current) => ({
                                        ...current,
                                        [check.id]: { ...draft, notes: event.target.value },
                                      }))
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

                  <div className="flex justify-end">
                    <Button
                      onClick={() => void submitQualityResults()}
                      disabled={createQualityResultState.isLoading || !selectedTemplate}
                    >
                      {createQualityResultState.isLoading ? "Saving..." : "Record quality results"}
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
                  <ErrorState
                    title="Quality result history unavailable"
                    message="Could not load quality results for this order."
                    onRetry={() => void qualityResultsQuery.refetch()}
                  />
                ) : !qualityResults.length ? (
                  <Empty text="No quality results recorded for this step yet." />
                ) : (
                  qualityResults.map((result) => (
                    <div key={result.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={result.passed ? "success" : "error"}>
                          {result.passed ? "PASS" : "FAIL"}
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
                Record inventory lot consumption against the order's BOM and track shortage risk.
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
                    <MaterialConsumptionForm
                      orderId={orderId}
                      stepId={currentStep?.id}
                      requirement={requirement}
                      draft={materialDrafts[requirement.inventoryItemId]}
                      onDraftChange={(value) =>
                        setMaterialDrafts((current) => ({
                          ...current,
                          [requirement.inventoryItemId]: value,
                        }))
                      }
                      onRecorded={() => {
                        setMaterialDrafts((current) => ({
                          ...current,
                          [requirement.inventoryItemId]: { lotNumber: "", quantity: "" },
                        }));
                        void materialConsumptionsQuery.refetch();
                      }}
                    />
                    {materialConsumptions.filter((item) => item.inventoryItemId === requirement.inventoryItemId).length ? (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {materialConsumptions
                          .filter((item) => item.inventoryItemId === requirement.inventoryItemId)
                          .map((item) => (
                            <div key={item.id}>
                              Lot {item.lotNumber} · {formatNumber(item.quantity)} {item.unit}
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Step execution</CardTitle>
              <CardDescription>
                Start, pause, or record completed and rejected quantities with concurrency-safe version checks.
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
                      {currentStep.status ? ` · ${humanize(currentStep.status)}` : ""}
                      {currentStep.expectedVersion !== undefined
                        ? ` · step version ${currentStep.expectedVersion}`
                        : ""}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                      <span>Completed: {formatNumber(currentStep.completedQuantity ?? order.completedQuantity)}</span>
                      <span>Rejected: {formatNumber(currentStep.rejectedQuantity ?? order.rejectedQuantity)}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
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
                  </div>

                  <Field label="Execution notes">
                    <Textarea
                      value={executionNotes}
                      onChange={(event) => setExecutionNotes(event.target.value)}
                      placeholder="Downtime, recovery, inspection, material, or shift notes"
                    />
                  </Field>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={stepActionState.isLoading}
                      onClick={() => void runStepAction("start")}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={stepActionState.isLoading}
                      onClick={() => void runStepAction("pause")}
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                    <Button
                      type="button"
                      disabled={stepActionState.isLoading}
                      onClick={() => void runStepAction("complete")}
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
              <CardTitle>Execution batches</CardTitle>
              <CardDescription>
                History of recorded output batches for this order.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executionBatchesQuery.isLoading ? (
                <Loading text="Loading execution batches..." />
              ) : executionBatchesQuery.isError ? (
                <ErrorState
                  title="Execution batches unavailable"
                  message="Could not load recorded execution batches for this order."
                  onRetry={() => void executionBatchesQuery.refetch()}
                />
              ) : !executionBatches.length ? (
                <Empty text="No execution batches recorded yet." />
              ) : (
                <div className="space-y-2">
                  {executionBatches.map((batch) => (
                    <div key={batch.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">Batch {batch.batchNumber}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(batch.createdAt)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Completed {formatNumber(batch.completedQuantity)} · Rejected {formatNumber(batch.rejectedQuantity)}
                      </div>
                      {batch.notes ? <p className="mt-1 text-xs text-muted-foreground">{batch.notes}</p> : null}
                    </div>
                  ))}
                </div>
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
                Preserves the immutable event timeline for this order.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timelineQuery.isLoading ? (
                <Loading text="Loading order timeline..." />
              ) : timelineQuery.isError ? (
                <ErrorState
                  title="Timeline unavailable"
                  message="The current backend did not return timeline events for this order."
                  onRetry={() => void timelineQuery.refetch()}
                />
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
        open={templateCreateOpen}
        defaultStepCode={currentStep?.code}
        defaultProductId={order.productId}
        defaultWorkflowVersionId={order.workflowVersionId}
        loading={createQualityTemplateState.isLoading}
        onOpenChange={(open) => setTemplateCreateOpen(open)}
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

function WorkstationRecordDialog({
  open,
  workstation,
  loading,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  workstation: Workstation | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: WorkstationRequest) => Promise<void>;
}) {
  const [form, setForm] = useState<WorkstationRequest>(emptyWorkstationRecord());

  useEffect(() => {
    if (!open) return;
    setForm(
      workstation
        ? {
            code: workstation.code,
            name: workstation.name,
            description: workstation.description || "",
            location: workstation.location || "",
            metadata: workstation.metadata,
            active: workstation.active,
          }
        : emptyWorkstationRecord()
    );
  }, [open, workstation]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Workstation code and name are required.");
      return;
    }

    await onSubmit({
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      location: form.location?.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{workstation ? "Edit workstation" : "Create workstation"}</DialogTitle>
          <DialogDescription>
            Configure a workstation used for assignments and workload tracking.
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
          <Field label="Location (optional)">
            <Input
              value={form.location || ""}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value || undefined })
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
            <Button type="submit" disabled={loading}>
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
  defaultStepCode,
  defaultProductId,
  defaultWorkflowVersionId,
  loading,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  defaultStepCode?: string;
  defaultProductId?: string;
  defaultWorkflowVersionId?: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: QualityTemplateRequest) => Promise<void>;
}) {
  const [form, setForm] = useState<QualityTemplateRequest>(emptyQualityTemplate());

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyQualityTemplate(),
      stepCode: defaultStepCode,
      productId: defaultProductId,
      workflowVersionId: defaultWorkflowVersionId,
    });
  }, [open, defaultStepCode, defaultProductId, defaultWorkflowVersionId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim() || form.checks.some((check) => !check.name.trim() || !check.code.trim())) {
      toast.error("Template code, name, and check code/name are required.");
      return;
    }

    await onSubmit({
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      stepCode: form.stepCode?.trim() || undefined,
      productId: form.productId || undefined,
      workflowVersionId: form.workflowVersionId || undefined,
      checks: form.checks.map((check, index) => ({
        ...check,
        code: check.code.trim(),
        name: check.name.trim(),
        sequenceNumber: index + 1,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create quality template</DialogTitle>
          <DialogDescription>
            Templates can be scoped to a workflow step code, product, and workflow version.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Template code">
              <Input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            </Field>
            <Field label="Template name">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
          </div>
          <Field label="Step code (optional)">
            <Input
              value={form.stepCode || ""}
              onChange={(event) =>
                setForm({ ...form, stepCode: event.target.value || undefined })
              }
              placeholder="STITCH-01"
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Checks</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    checks: [
                      ...current.checks,
                      {
                        code: "",
                        name: "",
                        sequenceNumber: current.checks.length + 1,
                        required: true,
                      },
                    ],
                  }))
                }
              >
                Add check
              </Button>
            </div>
            {form.checks.map((check, index) => (
              <div key={index} className="rounded-lg border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Check code">
                    <Input
                      value={check.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          checks: current.checks.map((currentCheck, currentIndex) =>
                            currentIndex === index
                              ? { ...currentCheck, code: event.target.value }
                              : currentCheck
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Check name">
                    <Input
                      value={check.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          checks: current.checks.map((currentCheck, currentIndex) =>
                            currentIndex === index
                              ? { ...currentCheck, name: event.target.value }
                              : currentCheck
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
                      checked={Boolean(check.required)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          checks: current.checks.map((currentCheck, currentIndex) =>
                            currentIndex === index
                              ? { ...currentCheck, required: event.target.checked }
                              : currentCheck
                          ),
                        }))
                      }
                    />
                    Required check
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={form.checks.length === 1}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        checks: current.checks
                          .filter((_, currentIndex) => currentIndex !== index)
                          .map((currentCheck, currentIndex) => ({
                            ...currentCheck,
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaterialConsumptionForm({
  orderId,
  stepId,
  requirement,
  draft,
  onDraftChange,
  onRecorded,
}: {
  orderId: string;
  stepId?: string;
  requirement: MaterialRequirement;
  draft?: MaterialConsumptionDraft;
  onDraftChange: (value: MaterialConsumptionDraft) => void;
  onRecorded: () => void;
}) {
  const [createMaterialConsumption, createMaterialConsumptionState] = useCreateMaterialConsumptionMutation();
  const lotNumber = draft?.lotNumber || "";
  const quantity = draft?.quantity || "";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = parseNullableNumber(quantity);
    if (!lotNumber.trim() || !parsedQuantity) {
      toast.error("Enter a lot number and quantity before recording consumption.");
      return;
    }

    const body: MaterialConsumptionRequest = {
      productionOrderId: orderId,
      orderStepSnapshotId: stepId,
      inventoryItemId: requirement.inventoryItemId,
      lotNumber: lotNumber.trim(),
      quantity: parsedQuantity,
      unit: requirement.unit,
    };

    try {
      await createMaterialConsumption(body).unwrap();
      toast.success("Material consumption recorded");
      onRecorded();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not record material consumption");
    }
  };

  return (
    <form className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]" onSubmit={submit}>
      <Field label="Lot number">
        <Input
          value={lotNumber}
          onChange={(event) => onDraftChange({ lotNumber: event.target.value, quantity })}
          placeholder="Enter lot number"
        />
      </Field>
      <Field label="Consume qty">
        <Input
          type="number"
          min="0"
          step="0.001"
          value={quantity}
          onChange={(event) => onDraftChange({ lotNumber, quantity: event.target.value })}
        />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={createMaterialConsumptionState.isLoading}>
          {createMaterialConsumptionState.isLoading ? "Recording..." : "Record"}
        </Button>
      </div>
    </form>
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

// Backend GET /api/production/kanban returns a flat PageResponse<KanbanCard>
// rather than pre-grouped columns. Group cards into the standard status lanes
// and enrich each card with fields (productId, priority, dueDate, current step,
// station) sourced from the already-loaded orders list.
function buildBoardColumns(
  cards: KanbanCard[],
  orders: ProductionOrder[],
  search: string,
  stationFilter: string
): ProductionBoardColumn[] {
  const needle = search.trim().toLowerCase();
  const ordersById = new Map(orders.map((order) => [order.id, order]));

  const items: ProductionBoardItem[] = cards.map((card) => {
    const order = ordersById.get(card.orderId);
    const currentStepId = card.currentStepId ?? order?.currentStepId;
    const step = order?.steps.find((candidate) => candidate.id === currentStepId);
    const remainingQuantity =
      order?.remainingQuantity ??
      Math.max(card.plannedQuantity - card.completedQuantity - card.rejectedQuantity, 0);

    return {
      orderId: card.orderId,
      orderNumber: card.orderNumber,
      productId: order?.productId ?? "",
      priority: order?.priority ?? "NORMAL",
      status: card.status,
      dueDate: order?.dueDate,
      plannedQuantity: card.plannedQuantity,
      completedQuantity: card.completedQuantity,
      rejectedQuantity: card.rejectedQuantity,
      remainingQuantity,
      currentStepId,
      currentStepName: step?.name,
      stationId: order?.assignedStationId ?? step?.stationId ?? null,
      stationName: order?.assignedStationName ?? step?.stationName ?? null,
      workstationId: order?.assignedWorkstationId ?? step?.workstationId ?? null,
      workstationName: order?.assignedWorkstationName ?? step?.workstationName ?? null,
      indicators: order?.indicators,
    };
  });

  const filtered = items.filter((item) => {
    const matchesSearch =
      !needle ||
      [item.orderNumber, item.productId, item.currentStepName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle));

    const matchesStation =
      stationFilter === "ALL" ||
      item.stationId === stationFilter ||
      item.workstationId === stationFilter;

    return matchesSearch && matchesStation;
  });

  return orderStatuses.map((status) => ({
    key: status,
    label: humanize(status),
    items: filtered.filter((item) => item.status === status),
  }));
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
  latestQualityResult: QualityResult | undefined,
  shortageCount: number
): ProductionIndicator[] {
  const indicators: ProductionIndicator[] = [];

  if (isOrderDelayed(order)) {
    indicators.push({ type: "DELAYED", severity: "critical", label: "Delayed" });
  } else if (isDueSoon(order.dueDate)) {
    indicators.push({ type: "DELAYED", severity: "warning", label: "Due soon" });
  }

  if (latestQualityResult && !latestQualityResult.passed) {
    indicators.push({ type: "QUALITY_FAILURE", severity: "critical", label: "Quality failure" });
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

function pickBestBom(boms: Bom[]) {
  return boms.find((bom) => bom.status === "PUBLISHED") ?? boms.at(-1);
}

function getCurrentOrderStep(order: ProductionOrder) {
  return order.steps.find((step) => step.id === order.currentStepId) ?? order.steps[0];
}

function getStepActionSuccessMessage(action: StepAction) {
  switch (action) {
    case "start":
      return "Step started";
    case "pause":
      return "Step paused";
    case "complete":
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
