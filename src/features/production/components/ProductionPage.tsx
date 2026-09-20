"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ScanLine,
  ShieldCheck,
  Truck,
  UserMinus,
  UserPlus,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { KanbanBoard } from "./KanbanBoard";
import { PartialCompletionForm } from "./PartialCompletionForm";
import { OrderBomBinding } from "./OrderBomBinding";
import { CatalogPagination } from "./CatalogPagination";
import { OrderQrLabel } from "./OrderQrLabel";
import { OrderQrScanner } from "./OrderQrScanner";
import { ProductionQuantitySummary } from "./ProductionQuantitySummary";
import { ProductionFamilyOverview } from "./ProductionFamilyOverview";
import { ProductionSplit } from "./ProductionSplit";
import { ProductionFinalGoodForm } from "./ProductionFinalGoodForm";
import { ProductionShortClose } from "./ProductionShortClose";
import { canProductionAction, matchesProductionOrderGuard, productionActionBlock, productionIsTerminal, productionOrderGuard } from "../utils/productionFlow";
import type { ProductionOrderGuard } from "../types/productionFlow.types";
import { parseProductionQuantity } from "../utils/productionQuantity";
import { productionOrderPath, safeProductionReturnPath } from "@/lib/productionOrderLink";
import { hasExecutionVersions, matchesProductionAction, productionActionBody, reviewProductionAction, type ProductionActionSnapshot } from "../utils/productionAction";
import { bomRevision, buildPinnedMaterialRequirements, isSelectableBom, validBomRequest, workflowRevision } from "../utils/lifecycle";
import { cn } from "@/lib/utils";
import { humanizeEnum } from "@/lib/format";
import { useAppSelector } from "@/lib/hook";
import { useGetActiveCustomersQuery } from "@/features/customers/api/customerApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import { useGetProductsQuery } from "@/features/products/api/productsApi";
import { useGetUserAccountsQuery } from "@/features/access/api/accessApi";
import { useGetActiveVendorsQuery } from "@/features/vendors/api/vendorApi";
import type { Vendor } from "@/features/vendors/types/vendor.types";
import {
  useCancelOrderMutation,
  useArchiveBomMutation,
  useArchiveWorkflowMutation,
  useCreateBomDraftMutation,
  useGetProductionBomQuery,
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
  useGetAuditLogQuery,
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
  AuditEventType,
  AuditLogResponse,
  Bom,
  BomItemRequest,
  KanbanCard,
  MaterialConsumptionRequest,
  MaterialRequirement,
  OrderAssignment,
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
  TimelineEvent,
  Workstation,
  WorkstationRequest,
  WorkflowRequest,
  WorkflowTemplate,
  WorkflowVersion,
  WorkflowStepRequest,
} from "../types/production.types";

type Tab = "orders" | "workflows" | "boms" | "workstations" | "analytics";
type OrdersViewMode = "board" | "list";
type OrderStatusFilter = "ALL" | OrderStatus;
type DetailTab = "execution" | "assignments" | "quality" | "materials" | "timeline" | "audit";
type DisplayOrder = ProductionOrder & { productCode?: string; productName?: string };

const detailTabLabel: Record<DetailTab, string> = {
  execution: "Execution",
  assignments: "Assignments",
  quality: "Quality",
  materials: "Materials",
  timeline: "Timeline",
  audit: "Audit trail",
};
type AssignmentFormState = {
  assignmentRole: AssignmentRole;
  assigneeType: "USER" | "VENDOR";
  assigneeUserId: string;
  vendorId: string;
  deadline: string;
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
type AuxiliaryReview = { orderId: string; guard: ProductionOrderGuard; description: string } & (
  | { kind: "ASSIGN"; body: OrderAssignmentRequest }
  | { kind: "UNASSIGN"; assignmentId: string }
  | { kind: "QUALITY"; body: QualityResultRequest }
);

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
  bomId: "",
  responsibleUserId: "",
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
  assigneeType: "USER",
  assigneeUserId: "",
  vendorId: "",
  deadline: "",
});

const emptyDashboard: ProductionDashboard = {
  planned: 0,
  released: 0,
  inProgress: 0,
  onHold: 0,
  completed: 0,
  blocked: 0,
  plannedQuantity: 0,
  completedQuantity: 0,
  rejectedQuantity: 0,
  delayedOrders: 0,
  qualityFailures: 0,
  materialShortages: 0,
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
  const [scanOpen, setScanOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderLink = safeProductionReturnPath(`/production?${searchParams.toString()}`);
  const selectedOrderId = orderLink ? searchParams.get("orderId") ?? undefined : undefined;
  const visibleTab = selectedOrderId ? "orders" : tab;
  const invalidOrderLink = searchParams.has("orderId") && !orderLink;
  const selectOrder = (id?: string) => {
    setTab("orders");
    router.replace(id ? productionOrderPath(id) : "/production", { scroll: false });
  };

  if (!user || !opsRoles.includes(user.role)) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Access denied. Production orders and QR actions are available to owners, admins, and management only. Scanning a label does not grant access.
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
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setScanOpen(true)}><ScanLine className="mr-2 h-4 w-4" />Scan order QR</Button>
        <p className="text-sm text-muted-foreground">Scanning only opens an order. Review and confirm each production action separately.</p>
      </div>
      <OrderQrScanner open={scanOpen} onOpenChange={setScanOpen} onOrderDetected={selectOrder} />
      {invalidOrderLink ? <ErrorState title="Invalid order link" message="Use a Factory1 order QR, its exact link, or its order ID. No order has been opened." onRetry={() => router.replace("/production")} /> : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(["orders", "workflows", "boms", "workstations", "analytics"] as Tab[]).map((item) => (
          <Button
            key={item}
            variant={visibleTab === item ? "default" : "ghost"}
            onClick={() => {
              setTab(item);
              if (item !== "orders") router.replace("/production", { scroll: false });
            }}
            aria-pressed={visibleTab === item}
          >
            {item === "orders"
              ? "Production orders"
              : item === "workflows"
                ? "Workflow templates"
                : item === "boms"
                  ? "BOM definitions"
                  : item === "workstations"
                    ? "Workstations"
                  : "Analytics"}
          </Button>
        ))}
      </div>

      {visibleTab === "orders" ? (
        <Orders selectedOrderId={selectedOrderId} onSelect={selectOrder} />
      ) : null}
      {visibleTab === "workflows" ? <Workflows /> : null}
      {visibleTab === "boms" ? <Boms /> : null}
      {visibleTab === "workstations" ? <Workstations /> : null}
      {visibleTab === "analytics" ? <ProductionAnalytics /> : null}
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
  const [groupByWorkflowStep, setGroupByWorkflowStep] = useState(false);
  const [orderPage, setOrderPage] = useState(0);
  const [boardPage, setBoardPage] = useState(0);

  const ordersQuery = useGetOrdersQuery({ page: orderPage, size: 50, scope: "ROOTS" });
  const { data: productsPage } = useGetProductsQuery({ page: 0, size: 300 });
  const dashboardQuery = useGetProductionDashboardQuery();
  const workstationsQuery = useGetWorkstationsQuery({ page: 0, size: 200 });
  const boardQuery = useGetProductionKanbanQuery({
    page: boardPage,
    size: 50,
    scope: "LEAVES",
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const orders = useMemo(
    () => ordersQuery.data?.content ?? [],
    [ordersQuery.data]
  );
  const productsById = useMemo(
    () => new Map((productsPage?.content ?? []).map((product) => [product.id, product])),
    [productsPage]
  );
  const displayOrders = useMemo<DisplayOrder[]>(
    () => orders.map((order) => {
      const product = productsById.get(order.productId);
      return { ...order, productCode: product?.productCode, productName: product?.name };
    }),
    [orders, productsById]
  );
  const stations = useMemo(
    () => workstationsQuery.data?.content ?? [],
    [workstationsQuery.data]
  );

  const filteredOrders = useMemo(
    () =>
      filterOrders({
        orders: displayOrders,
        search,
        statusFilter,
        stationFilter,
      }),
    [displayOrders, search, statusFilter, stationFilter]
  );

  const board = useMemo(
    () =>
      buildBoardColumns(
        boardQuery.data?.content ?? [],
        displayOrders,
        search,
        stationFilter
      ),
    [boardQuery.data, displayOrders, search, stationFilter]
  );

  const ordersById = useMemo(
    () => new Map(displayOrders.map((order) => [order.id, order])),
    [displayOrders]
  );
  const boardItems = useMemo(
    () => board.flatMap((column) => column.items),
    [board]
  );

  const dashboard = dashboardQuery.data ?? emptyDashboard;
  // Orders that have moved past planning and are not yet finished.
  const activeOrderCount =
    dashboard.released + dashboard.inProgress + dashboard.onHold + dashboard.blocked;
  const queuedOrderCount = dashboard.planned + dashboard.released;
  // No pass-rate field exists on the backend; derive one from the accepted
  // vs. rejected output quantities it does report.
  const qualityOutcomeTotal = dashboard.completedQuantity + dashboard.rejectedQuantity;
  const qualityPassRate =
    qualityOutcomeTotal > 0 ? (dashboard.completedQuantity / qualityOutcomeTotal) * 100 : 100;

  const refreshAll = () => {
    void ordersQuery.refetch();
    void dashboardQuery.refetch();
    void workstationsQuery.refetch();
    void boardQuery.refetch();
  };

  const requestAdvance = (orderId: string) => {
    onSelect(orderId);
    toast.info("Review the current step in batch details. Split recorded ready pieces to advance independently, or confirm ordinary advancement when the step is resolved.");
  };


  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          title="Active orders"
          value={String(activeOrderCount)}
          description={`${dashboard.inProgress} in progress · ${queuedOrderCount} queued`}
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
          value={`${formatPercent(qualityPassRate)}`}
          description={`${dashboard.onHold} orders on hold`}
          icon={BadgeCheck}
          module="production"
        />
        <StatCard
          title="Shortage alerts"
          value={String(dashboard.materialShortages)}
          description={dashboard.materialShortages ? "Items below reorder threshold" : "No shortages detected"}
          icon={Boxes}
          module="production"
        />
      </div>

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

              {viewMode === "board" ? (
                <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
                  <Switch
                    id="group-by-workflow-step"
                    checked={groupByWorkflowStep}
                    onCheckedChange={setGroupByWorkflowStep}
                  />
                  <Label htmlFor="group-by-workflow-step" className="text-sm">
                    Group columns by each order&apos;s current workflow step
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {groupByWorkflowStep
                      ? "Showing real workflow step columns"
                      : "Showing To Do / In Progress / Done"}
                  </span>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2" aria-label="Production status filters">
                <Button
                  type="button"
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  onClick={() => { setStatusFilter("ALL"); setBoardPage(0); setOrderPage(0); }}
                  aria-pressed={statusFilter === "ALL"}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  All
                </Button>
                {orderStatuses.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => { setStatusFilter(status); setBoardPage(0); setOrderPage(0); }}
                    aria-pressed={statusFilter === status}
                  >
                    {humanize(status)}
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
                  : "Original requests only. Open an order for its linked child batches and consolidated quantities."}
                {" Search and station filters apply to the current page."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(viewMode === "board" ? boardQuery.isFetching : ordersQuery.isFetching) ? (
                <Loading text="Loading production orders..." />
              ) : (viewMode === "board" ? boardQuery.isError : ordersQuery.isError) ? (
                <ErrorState
                  title="Production orders could not be loaded"
                  message="Order APIs are unavailable right now."
                  onRetry={() => viewMode === "board" ? void boardQuery.refetch() : void ordersQuery.refetch()}
                />
              ) : !(viewMode === "board" ? boardItems.length : filteredOrders.length) ? (
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
                <KanbanBoard
                  items={boardItems}
                  ordersById={ordersById}
                  viewMode={groupByWorkflowStep ? "step" : "fixed"}
                  selectedOrderId={selectedOrderId}
                  onSelect={onSelect}
                  onRequestAdvance={(orderId) => void requestAdvance(orderId)}
                />
              ) : (
                <OrderListView
                  orders={filteredOrders}
                  selectedOrderId={selectedOrderId}
                  onSelect={onSelect}
                />
              )}
              <CatalogPagination
                page={viewMode === "board" ? boardPage : orderPage}
                totalPages={(viewMode === "board" ? boardQuery.data : ordersQuery.data)?.totalPages ?? 0}
                loading={viewMode === "board" ? boardQuery.isFetching : ordersQuery.isFetching}
                onChange={viewMode === "board" ? setBoardPage : setOrderPage}
              />
            </CardContent>
          </Card>
      </div>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
      {selectedOrderId ? (
        <OrderDetail
          key={selectedOrderId}
          orderId={selectedOrderId}
          onClose={() => onSelect(undefined)}
          onSelect={onSelect}
        />
      ) : null}
    </div>
  );
}

function OrderListView({
  orders,
  selectedOrderId,
  onSelect,
}: {
  orders: DisplayOrder[];
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
              <TableCell>{order.productName || order.productCode || order.productId}</TableCell>
              <TableCell>
                {order.quantities ? <ProductionQuantitySummary quantities={order.quantities} compact /> : <>{formatNumber(order.completedQuantity)} / {formatNumber(order.plannedQuantity)}</>}
              </TableCell>
              <TableCell>{currentStep?.name || "Awaiting workflow step"}</TableCell>
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
  const [productPage, setProductPage] = useState(0);
  const [workflowPage, setWorkflowPage] = useState(0);
  const productsQuery = useGetProductsQuery({ page: productPage, size: 50 });
  const { data: customers = [] } = useGetActiveCustomersQuery();
  const workflowsQuery = useGetWorkflowsQuery({ page: workflowPage, size: 50 });
  const userAccountsQuery = useGetUserAccountsQuery();
  const assignableUsers = useMemo(
    () => (userAccountsQuery.data ?? []).filter((user) => user.status === "ACTIVE"),
    [userAccountsQuery.data]
  );
  const products = productsQuery.currentData?.content ?? [];
  const workflows = (workflowsQuery.currentData?.content ?? []).filter((workflow) => workflow.active);

  const [workflowId, setWorkflowId] = useState("");
  const versionsQuery = useGetWorkflowVersionsQuery(workflowId, {
    skip: !workflowId,
  });
  const [form, setForm] = useState<ProductionOrderRequest>(emptyOrder());
  const bomsQuery = useGetBomsQuery({ productId: form.productId }, { skip: !form.productId });
  const selectableBoms = (bomsQuery.currentData ?? []).filter((bom) => isSelectableBom(bom, form.productId));
  const [create, state] = useCreateOrderMutation();

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setWorkflowId("");
      setProductPage(0);
      setWorkflowPage(0);
      setForm(emptyOrder());
    });
  }, [open]);

  const publishedVersions = (versionsQuery.currentData ?? []).filter((version) => version.status === "PUBLISHED");
  const selectionsLoading = productsQuery.isFetching || workflowsQuery.isFetching || versionsQuery.isFetching || bomsQuery.isFetching;
  const selectionError = productsQuery.isError || workflowsQuery.isError || versionsQuery.isError || bomsQuery.isError;
  const validSelection = workflows.some((workflow) => workflow.id === workflowId) &&
    publishedVersions.some((version) => version.id === form.workflowVersionId) &&
    selectableBoms.some((bom) => bom.id === form.bomId);

  const update = (patch: Partial<ProductionOrderRequest>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !form.orderNumber.trim() ||
      !form.productId ||
      !form.workflowVersionId ||
      !validSelection || selectionsLoading || selectionError ||
      !form.responsibleUserId ||
      !Number.isFinite(form.plannedQuantity) || Number(form.plannedQuantity) <= 0
    ) {
      toast.error(
        "Order number, product, positive quantity, an active published workflow and BOM, and a responsible person are required."
      );
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
            The selected published workflow and BOM versions are saved with this order. Later revisions and archives do not replace them.
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
              onChange={(event) => update({ productId: event.target.value, bomId: "" })}
              required
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.productCode} · {product.name}
                </option>
              ))}
            </select>
            <CatalogPagination page={productPage} totalPages={productsQuery.currentData?.totalPages ?? 0} loading={productsQuery.isFetching} onChange={(page) => { setProductPage(page); update({ productId: "", bomId: "" }); }} />
          </Field>

          <Field label="Published BOM">
            <select className={selectClassName} required disabled={!form.productId || bomsQuery.isFetching} value={selectableBoms.some((bom) => bom.id === form.bomId) ? form.bomId : ""} onChange={(event) => update({ bomId: event.target.value })}>
              <option value="">Select published BOM</option>
              {selectableBoms.map((bom) => <option key={bom.id} value={bom.id}>{bom.name} · v{bom.versionNumber}</option>)}
            </select>
            {form.productId && !bomsQuery.isFetching && !bomsQuery.isError && !selectableBoms.length ? <p className="text-sm text-amber-600">Publish an active BOM for this product before creating an order.</p> : null}
          </Field>

          <Field label="Responsible person (notified if this order runs late)">
            <select
              className={selectClassName}
              value={form.responsibleUserId}
              onChange={(event) => update({ responsibleUserId: event.target.value })}
              required
            >
              <option value="">Select responsible person</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
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
              value={workflows.some((workflow) => workflow.id === workflowId) ? workflowId : ""}
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
            <CatalogPagination page={workflowPage} totalPages={workflowsQuery.currentData?.totalPages ?? 0} loading={workflowsQuery.isFetching} onChange={(page) => { setWorkflowPage(page); setWorkflowId(""); update({ workflowVersionId: "" }); }} />
          </Field>

          <Field label="Published version">
            <select
              className={selectClassName}
              value={publishedVersions.some((version) => version.id === form.workflowVersionId) ? form.workflowVersionId : ""}
              onChange={(event) => update({ workflowVersionId: event.target.value })}
              required
            >
              <option value="">Select version</option>
              {publishedVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name} · v{version.versionNumber}
                </option>
              ))}
            </select>
            {workflowId && !publishedVersions.length ? (
              <p className="text-xs text-amber-600">
                Publish a workflow version before creating an order.
              </p>
            ) : null}
          </Field>

          {selectionError ? <ErrorState title="Order choices unavailable" message="Reload the catalog before selecting workflow and BOM versions." onRetry={() => { void productsQuery.refetch(); void workflowsQuery.refetch(); if (workflowId) void versionsQuery.refetch(); if (form.productId) void bomsQuery.refetch(); }} /> : null}
          {selectionsLoading ? <Loading text="Loading order choices..." /> : null}
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
            <Button disabled={state.isLoading || selectionsLoading || selectionError || !validSelection} type="submit">
              {state.isLoading ? "Creating..." : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Workstations() {
  const workstationsQuery = useGetWorkstationsQuery({ page: 0, size: 200 });
  const workstationWorkloadsQuery = useGetDashboardStationsQuery();
  const stations = workstationsQuery.data?.content ?? [];

  const refresh = () => {
    void workstationsQuery.refetch();
    void workstationWorkloadsQuery.refetch();
  };

  return (
    <WorkstationManager
      stations={stations}
      workloads={workstationWorkloadsQuery.data ?? []}
      loading={workstationsQuery.isLoading && !stations.length}
      error={workstationsQuery.isError && !stations.length}
      onRefresh={refresh}
    />
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

  const workloadByWorkstationCode = useMemo(
    () => new Map(workloads.map((workload) => [workload.workstation, workload])),
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
              const workload = workloadByWorkstationCode.get(workstation.code);
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
                        <span>Planned: {formatNumber(workload?.plannedQuantity ?? 0)}</span>
                        <span>Completed: {formatNumber(workload?.completedQuantity ?? 0)}</span>
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
  onSelect,
}: {
  orderId: string;
  onClose: () => void;
  onSelect: (id?: string) => void;
}) {
  const orderQuery = useGetOrderQuery(orderId);
  const timelineQuery = useGetTimelineQuery(orderId);
  const assignmentsQuery = useGetOrderAssignmentsQuery(orderId);
  const executionBatchesQuery = useGetExecutionBatchesQuery(orderId);
  const materialConsumptionsQuery = useGetMaterialConsumptionsQuery(orderId);
  const userAccountsQuery = useGetUserAccountsQuery();
  const [auditPage, setAuditPage] = useState(0);
  const auditLogQuery = useGetAuditLogQuery({ orderId, page: auditPage, size: 20 });
  const actorsById = useMemo(
    () => new Map((userAccountsQuery.data ?? []).map((user) => [user.id, user.name])),
    [userAccountsQuery.data]
  );
  const assignableUsers = useMemo(
    () => (userAccountsQuery.data ?? []).filter((user) => user.status === "ACTIVE"),
    [userAccountsQuery.data]
  );
  const [cancelOrder, cancelState] = useCancelOrderMutation();
  const [createOrderAssignment, createOrderAssignmentState] = useCreateOrderAssignmentMutation();
  const [deleteAssignment, deleteAssignmentState] = useDeleteAssignmentMutation();
  const [stepAction, stepActionState] = useStepActionMutation();
  const [pendingAdvance, setPendingAdvance] = useState<(ProductionActionSnapshot & { stepName: string; completesOrder: boolean }) | null>(null);
  const advancingRef = useRef(false);
  const [auxiliaryReview, setAuxiliaryReview] = useState<AuxiliaryReview>();
  const auxiliarySaving = useRef(false);
  const [createQualityResult, createQualityResultState] = useCreateQualityResultMutation();
  const [createQualityTemplate, createQualityTemplateState] = useCreateQualityCheckTemplateMutation();

  const order = orderQuery.data;
  const { data: productsPage } = useGetProductsQuery({ page: 0, size: 300 });
  const product = productsPage?.content.find((candidate) => candidate.id === order?.productId);
  const orderSteps = order?.steps ?? [];
  const currentStep = order ? getCurrentOrderStep(order) : undefined;

  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);
  const orderAssignments = useMemo(
    () => assignments.filter((assignment) => !assignment.orderStepSnapshotId),
    [assignments]
  );
  const assigneeName = (userId: string) =>
    assignableUsers.find((user) => user.id === userId)?.name ?? userId;

  const { data: activeVendors = [] } = useGetActiveVendorsQuery();
  const vendorName = (vendorId: string) =>
    activeVendors.find((vendor: Vendor) => vendor.id === vendorId)?.name ?? vendorId;
  const isDeadlineOverdue = (assignment: OrderAssignment) =>
    Boolean(
      assignment.deadlineBreachNotifiedAt ||
        // eslint-disable-next-line react-hooks/purity -- overdue badges must compare against the current wall-clock time at render.
        (assignment.deadline && new Date(assignment.deadline).getTime() < Date.now())
    );

  const renderAssigneeLabel = (assignment: OrderAssignment) => (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusBadge tone="pending">{humanize(assignment.assignmentRole)}</StatusBadge>
      {assignment.vendorId ? (
        <span>Vendor: {vendorName(assignment.vendorId)}</span>
      ) : (
        <span>{assigneeName(assignment.assigneeUserId ?? "")}</span>
      )}
      {assignment.deadline ? (
        <Badge variant={isDeadlineOverdue(assignment) ? "destructive" : "outline"}>
          {isDeadlineOverdue(assignment) ? "Overdue " : "Due "}
          {new Date(assignment.deadline).toLocaleString()}
        </Badge>
      ) : null}
    </span>
  );

  const { data: inventoryPage } = useGetInventoryItemsQuery({ page: 0, size: 300 });
  const inventoryItems = useMemo(
    () => inventoryPage?.content ?? [],
    [inventoryPage]
  );
  const pinnedBomQuery = useGetProductionBomQuery(order?.bomId || "", {
    skip: !order?.bomId,
  });

  const activeBom = pinnedBomQuery.currentData;
  const materialRequirements = useMemo(
    () => buildPinnedMaterialRequirements(activeBom, inventoryItems, order),
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
    { skip: !order }
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

  // "Execution" is the most action-relevant section, so it's the default tab.
  const [detailTab, setDetailTab] = useState<DetailTab>("execution");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [orderAssignment, setOrderAssignment] = useState<AssignmentFormState>(emptyAssignment());
  const [stepAssignment, setStepAssignment] = useState<AssignmentFormState>(emptyAssignment());
  const [selectedAssignmentStepId, setSelectedAssignmentStepId] = useState("");
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
  const assignmentStepId =
    selectedAssignmentStepId || currentStep?.id || orderSteps[0]?.id || "";
  const assignmentStep = orderSteps.find((step) => step.id === assignmentStepId);
  const stepAssignments = assignments.filter(
    (assignment) => assignment.orderStepSnapshotId === assignmentStepId
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
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Production order details</DialogTitle>
            <DialogDescription>
              Review production progress, assignments, quality, materials, and history.
            </DialogDescription>
          </DialogHeader>
          {orderQuery.isError ? (
            <ErrorState
              title="Order details unavailable"
              message="The order could not be loaded. It may not exist, or your account may not have access to it."
              onRetry={() => void orderQuery.refetch()}
            />
          ) : (
            <Loading text="Loading order details..." />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  const orderIndicators = order.indicators ?? [];
  const shortageCount = materialRequirements.filter((item) => item.shortage).length;
  const latestQualityResult = qualityResults[0];
  const currentStepRecordedQuantity =
    (currentStep?.completedQuantity ?? 0) + (currentStep?.rejectedQuantity ?? 0);
  const currentStepRemainingQuantity =
    currentStep?.remainingQuantity ??
    (order.quantityModel === "FLOW_V1" ? NaN : Math.max(order.plannedQuantity - currentStepRecordedQuantity, 0));
  const hasNextStep = Boolean(
    currentStep &&
      orderSteps.some((step) => step.sequenceNumber > currentStep.sequenceNumber && step.active)
  );
  const actionContext = {
    orderId: order.id,
    stepId: currentStep?.id ?? "",
    remainingQuantity: currentStepRemainingQuantity,
    expectedOrderVersion: order.executionVersion,
    expectedStepVersion: currentStep?.expectedVersion,
    expectedFamilyVersion: order.batch?.familyVersion,
    quantityModel: order.quantityModel,
  };
  const executionBlocked = orderQuery.isFetching || orderQuery.isError ||
    productionIsTerminal(order) || order.batch?.nodeType === "SUMMARY" ||
    !currentStep?.active || currentStep.id !== order.currentStepId;
  const canAssign = !executionBlocked && canProductionAction(order, "ASSIGN");
  const canQuality = !executionBlocked && canProductionAction(order, "RECORD_QUALITY");
  const canConsume = !executionBlocked && canProductionAction(order, "CONSUME_MATERIAL");
  const staleAdvance = Boolean(pendingAdvance && !matchesProductionAction(pendingAdvance, actionContext));
  const staleAuxiliary = Boolean(auxiliaryReview && (auxiliaryReview.orderId !== order.id || !matchesProductionOrderGuard(auxiliaryReview.guard, order)));

  const refreshDetail = () => {
    void orderQuery.refetch();
    void timelineQuery.refetch();
    void qualityResultsQuery.refetch();
    void qualityTemplatesQuery.refetch();
    void assignmentsQuery.refetch();
    void executionBatchesQuery.refetch();
    void materialConsumptionsQuery.refetch();
    void auditLogQuery.refetch();
  };

  const submitOrderAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (orderAssignment.assigneeType === "USER" && !orderAssignment.assigneeUserId) {
      toast.error("Select an assignee before assigning the order.");
      return;
    }
    if (orderAssignment.assigneeType === "VENDOR" && !orderAssignment.vendorId) {
      toast.error("Select a vendor before assigning the order.");
      return;
    }

    const body: OrderAssignmentRequest = {
      productionOrderId: orderId,
      assignmentRole: orderAssignment.assignmentRole,
      assigneeUserId:
        orderAssignment.assigneeType === "USER" ? orderAssignment.assigneeUserId : undefined,
      vendorId: orderAssignment.assigneeType === "VENDOR" ? orderAssignment.vendorId : undefined,
      deadline: orderAssignment.deadline
        ? new Date(orderAssignment.deadline).toISOString()
        : undefined,
    };

    try {
      if (order.quantityModel === "FLOW_V1") {
        const guard = productionOrderGuard(order);
        setAuxiliaryReview({ kind: "ASSIGN", orderId, guard, body: { ...body, ...guard },
          description: `Assign ${body.assigneeUserId ? assigneeName(body.assigneeUserId) : vendorName(body.vendorId ?? "")} as ${body.assignmentRole} to this batch${body.deadline ? ` until ${body.deadline}` : ""}.` });
        return;
      }
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
    if (!assignmentStep) {
      toast.error("Select a workflow step before assigning work.");
      return;
    }
    if (stepAssignment.assigneeType === "USER" && !stepAssignment.assigneeUserId) {
      toast.error("Select an assignee before assigning the step.");
      return;
    }
    if (stepAssignment.assigneeType === "VENDOR" && !stepAssignment.vendorId) {
      toast.error("Select a vendor before assigning the step.");
      return;
    }

    const body: OrderAssignmentRequest = {
      productionOrderId: orderId,
      orderStepSnapshotId: assignmentStep.id,
      assignmentRole: stepAssignment.assignmentRole,
      assigneeUserId:
        stepAssignment.assigneeType === "USER" ? stepAssignment.assigneeUserId : undefined,
      vendorId: stepAssignment.assigneeType === "VENDOR" ? stepAssignment.vendorId : undefined,
      deadline: stepAssignment.deadline
        ? new Date(stepAssignment.deadline).toISOString()
        : undefined,
    };

    try {
      if (order.quantityModel === "FLOW_V1") {
        const guard = productionOrderGuard(order);
        setAuxiliaryReview({ kind: "ASSIGN", orderId, guard, body: { ...body, ...guard },
          description: `Assign ${body.assigneeUserId ? assigneeName(body.assigneeUserId) : vendorName(body.vendorId ?? "")} as ${body.assignmentRole} to ${assignmentStep.name}${body.deadline ? ` until ${body.deadline}` : ""}.` });
        return;
      }
      await createOrderAssignment({ orderId, body }).unwrap();
      toast.success(`${assignmentStep.name} assigned`);
      setStepAssignment(emptyAssignment());
      refreshDetail();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not assign current step");
    }
  };

  const removeAssignment = async (id: string) => {
    try {
      if (order.quantityModel === "FLOW_V1") {
        setAuxiliaryReview({ kind: "UNASSIGN", orderId, guard: productionOrderGuard(order), assignmentId: id,
          description: `Remove assignment ${id} from this batch. This does not reassign another child or workflow step.` });
        return;
      }
      await deleteAssignment(id).unwrap();
      toast.success("Assignment removed");
      refreshDetail();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not remove assignment");
    }
  };

  const submitQualityResults = async (definitionId?: string) => {
    if (!currentStep || !selectedTemplate) return;
    const checks = selectedTemplate.checks;
    if (!checks.length) {
      toast.error("The selected template has no checks to record.");
      return;
    }

    try {
      if (order.quantityModel === "FLOW_V1") {
        const check = checks.find((candidate) => candidate.id === definitionId);
        if (!check) throw new Error("Review one quality check at a time; each result changes the family version.");
        const draft = qualityChecks[check.id] ?? { passed: true, value: "", notes: "" };
        const guard = productionOrderGuard(order);
        setAuxiliaryReview({ kind: "QUALITY", orderId, guard,
          description: `Record ${draft.passed ? "PASS" : "FAIL"} for ${check.name} at ${currentStep.name}. Value: ${draft.value.trim() || "(none)"}. Notes: ${draft.notes.trim() || "(none)"}.`,
          body: { ...guard, orderStepSnapshotId: currentStep.id, templateId: selectedTemplate.id,
            definitionId: check.id, passed: draft.passed, value: draft.value.trim() || undefined, notes: draft.notes.trim() || undefined } });
        return;
      }
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

  const confirmAuxiliary = async () => {
    if (!auxiliaryReview || auxiliarySaving.current) return;
    const action = auxiliaryReview.kind === "QUALITY" ? "RECORD_QUALITY" : "ASSIGN";
    if (staleAuxiliary || executionBlocked || !canProductionAction(order, action)) {
      toast.error("The batch changed or this action is unavailable. Refresh and review again.");
      return;
    }
    auxiliarySaving.current = true;
    try {
      if (auxiliaryReview.kind === "ASSIGN") {
        await createOrderAssignment({ orderId: auxiliaryReview.orderId, body: auxiliaryReview.body }).unwrap();
        setOrderAssignment(emptyAssignment()); setStepAssignment(emptyAssignment());
      } else if (auxiliaryReview.kind === "UNASSIGN") {
        await deleteAssignment({ id: auxiliaryReview.assignmentId, ...auxiliaryReview.guard }).unwrap();
      } else {
        await createQualityResult({ orderId: auxiliaryReview.orderId, body: auxiliaryReview.body }).unwrap();
      }
      toast.success("Reviewed batch change saved");
      setAuxiliaryReview(undefined);
      refreshDetail();
    } catch (error) {
      setAuxiliaryReview(undefined);
      toast.error(apiErrorMessage(error) ?? "Outcome not confirmed. Refresh and inspect the batch before another reviewed action. No automatic retry was made.");
      refreshDetail();
    } finally { auxiliarySaving.current = false; }
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

  const advanceCurrentStep = async () => {
    if (!pendingAdvance || advancingRef.current || staleAdvance || executionBlocked || !canProductionAction(order, "ADVANCE")) return;
    advancingRef.current = true;

    try {
      setExecutionConflict(null);
      await stepAction({
        orderId: pendingAdvance.orderId, stepId: pendingAdvance.stepId, action: "complete",
        body: productionActionBody(pendingAdvance),
      }).unwrap();
      toast.success(
        pendingAdvance.completesOrder ? "Production order completed" : "Moved to next workflow step"
      );
      setPendingAdvance(null);
      refreshDetail();
    } catch (error) {
      setPendingAdvance(null);
      if (getErrorStatus(error) === 409) {
        setExecutionConflict({
          message:
            apiErrorMessage(error) ??
            "Another operator updated this order. Refresh and review the latest state.",
        });
        toast.warning("Execution conflict detected. Reloading the order; review it before trying again.");
        refreshDetail();
        return;
      }

      const message = apiErrorMessage(error) ?? "Advancement could not be confirmed. Refresh and review the order before trying again.";
      setExecutionConflict({ message });
      toast.error(message);
      refreshDetail();
    } finally {
      advancingRef.current = false;
    }
  };

  const handleCancelOrder = async () => {
    if (order.quantityModel === "FLOW_V1" || productionIsTerminal(order) || !canProductionAction(order, "CANCEL")) {
      toast.error("This order cannot use legacy cancellation. Open an executable batch and review reasoned short closure.");
      setConfirmCancelOpen(false);
      return;
    }
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
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-6xl">
          <DialogHeader className="pr-10">
            <DialogTitle>{order.batch?.batchLabel ?? order.orderNumber}</DialogTitle>
            <DialogDescription>
              {product?.name || product?.productCode || order.productId} · workflow v{order.workflowVersionNumber}
              {order.quantityModel !== "FLOW_V1" ? <> · {formatNumber(order.completedQuantity)} complete · {formatNumber(order.rejectedQuantity)} legacy rejected</> : " · Final output and current-step good are shown separately."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
          <OrderQrLabel orderId={order.id} orderNumber={order.orderNumber} rootOrderId={order.batch?.rootOrderId} batchLabel={order.batch?.batchLabel} nodeType={order.batch?.nodeType} allocatedQuantity={order.quantities?.allocatedQuantity} />
          {order.batch ? <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{order.batch.nodeType === "SUMMARY" ? "Family overview - read only" : order.batch.parentOrderId ? `Child ${order.batch.childSequence}` : "Original request"}</Badge>
            {order.batch.rootOrderId !== order.id ? <Button size="sm" variant="link" onClick={() => onSelect(order.batch?.rootOrderId)}>Open original request</Button> : null}
            {order.batch.parentOrderId && order.batch.parentOrderId !== order.batch.rootOrderId ? <Button size="sm" variant="link" onClick={() => onSelect(order.batch?.parentOrderId ?? undefined)}>Open parent batch</Button> : null}
          </div> : null}
          {order.quantities ? <ProductionQuantitySummary quantities={order.quantities} /> : null}
          {order.batch?.parentOrderId ? <p className="text-sm text-muted-foreground">Child progress can include inherited opening balances. Original executions, quality evidence and material issues remain on their source parent; this batch&apos;s recorded-output history lists its own new records, not replayed production.</p> : null}
          <ProductionFamilyOverview key={`${order.id}:${order.batch?.familyVersion}`} order={order} onSelect={onSelect} onRefresh={refreshDetail} />
          {orderQuery.isError ? <ErrorState title="Order refresh failed" message="Displayed information may be stale. Production actions are disabled until a successful refresh." onRetry={() => void orderQuery.refetch()} /> : null}
          <OrderBomBinding key={order.id} order={order} />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone(order.status)}>{humanize(order.status)}</StatusBadge>
            <span className="text-xs text-muted-foreground">
              Remaining {formatNumber(order.remainingQuantity)}
            </span>
            <span className="text-xs text-muted-foreground">
              Due {formatDate(order.dueDate)}
            </span>
            {!productionIsTerminal(order) && order.quantityModel !== "FLOW_V1" && canProductionAction(order, "CANCEL") ? (
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
            <MiniStat label={order.quantityModel === "FLOW_V1" ? "Final good" : "Completed"} value={order.quantityModel === "FLOW_V1" ? order.quantities ? formatNumber(order.quantities.finalGoodQuantity) : "Unavailable" : formatNumber(order.completedQuantity)} />
            <MiniStat label={order.quantityModel === "FLOW_V1" ? "Scrap pieces" : "Legacy rejected"} value={order.quantityModel === "FLOW_V1" ? order.quantities ? formatNumber(order.quantities.scrapQuantity) : "Unavailable" : formatNumber(order.rejectedQuantity)} />
            <MiniStat label="Active step" value={order.batch?.nodeType === "SUMMARY" ? "See child batches" : currentStep?.name || "Awaiting workflow step"} />
            <MiniStat label="Shortages" value={order.batch?.nodeType === "SUMMARY" ? "See child batches" : String(shortageCount)} />
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

          <div className="flex flex-wrap gap-1.5 border-b pb-2" aria-label="Order detail sections">
            {(["execution", "assignments", "quality", "materials", "timeline", "audit"] as DetailTab[]).map(
              (item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={detailTab === item ? "default" : "ghost"}
                  onClick={() => setDetailTab(item)}
                  aria-pressed={detailTab === item}
                >
                  {detailTabLabel[item]}
                </Button>
              )
            )}
          </div>

          {detailTab === "assignments" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Order assignment</CardTitle>
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
                        {renderAssigneeLabel(assignment)}
                        {canAssign ? <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteAssignmentState.isLoading}
                          onClick={() => void removeAssignment(assignment.id)}
                        >
                          <Ban className="mr-2 h-3.5 w-3.5" />
                          Remove
                        </Button> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty text="No one is assigned to this order yet." />
                )}

                {canAssign ? <form className="space-y-3" onSubmit={submitOrderAssignment}>
                  {userAccountsQuery.isError ? (
                    <InlineNotice tone="warning" title="Users unavailable">
                      Organization users could not be loaded. You can still try again shortly.
                    </InlineNotice>
                  ) : !userAccountsQuery.isLoading && assignableUsers.length === 0 ? (
                    <InlineNotice tone="warning" title="No eligible users">
                      This organization has no active user accounts. Create or activate a user
                      before assigning work.
                    </InlineNotice>
                  ) : null}
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
                    <Field label="Deadline (optional)">
                      <Input
                        type="datetime-local"
                        value={orderAssignment.deadline}
                        onChange={(event) =>
                          setOrderAssignment((current) => ({
                            ...current,
                            deadline: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Assignee type">
                    <RadioGroup
                      className="grid grid-cols-2"
                      value={orderAssignment.assigneeType}
                      onValueChange={(value) =>
                        setOrderAssignment((current) => ({
                          ...current,
                          assigneeType: value as "USER" | "VENDOR",
                          assigneeUserId: value === "USER" ? current.assigneeUserId : "",
                          vendorId: value === "VENDOR" ? current.vendorId : "",
                        }))
                      }
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="USER" id="order-assignee-user" />
                        <Label htmlFor="order-assignee-user" className="text-sm font-normal">
                          Internal worker
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="VENDOR" id="order-assignee-vendor" />
                        <Label htmlFor="order-assignee-vendor" className="text-sm font-normal">
                          Third-party vendor
                        </Label>
                      </div>
                    </RadioGroup>
                  </Field>
                  {orderAssignment.assigneeType === "USER" ? (
                    <Field label="Assignee">
                      <select
                        className={selectClassName}
                        value={orderAssignment.assigneeUserId}
                        disabled={assignableUsers.length === 0}
                        onChange={(event) =>
                          setOrderAssignment((current) => ({
                            ...current,
                            assigneeUserId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select assignee</option>
                        {assignableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <Field label="Vendor">
                      <select
                        className={selectClassName}
                        value={orderAssignment.vendorId}
                        disabled={activeVendors.length === 0}
                        onChange={(event) =>
                          setOrderAssignment((current) => ({
                            ...current,
                            vendorId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select vendor</option>
                        {activeVendors.map((vendor: Vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </option>
                        ))}
                      </select>
                      {activeVendors.length === 0 ? (
                        <p className="mt-1 text-xs text-amber-600">
                          No active vendors yet — add one in the Vendors page.
                        </p>
                      ) : null}
                    </Field>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={
                        createOrderAssignmentState.isLoading ||
                        (orderAssignment.assigneeType === "USER" && assignableUsers.length === 0) ||
                        (orderAssignment.assigneeType === "VENDOR" && activeVendors.length === 0)
                      }
                    >
                      {createOrderAssignmentState.isLoading ? "Saving..." : "Assign order"}
                    </Button>
                  </div>
                </form> : null}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Workflow step assignments</CardTitle>
                <CardDescription>
                  Review and assign a worker or vendor for any step in this order&apos;s workflow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!orderSteps.length ? (
                  <Empty text="This order has no workflow steps." />
                ) : (
                  <div className="space-y-3">
                    <Field label="Workflow step">
                      <select
                        className={selectClassName}
                        value={assignmentStepId}
                        onChange={(event) => {
                          setSelectedAssignmentStepId(event.target.value);
                          setStepAssignment(emptyAssignment());
                        }}
                      >
                        {orderSteps.map((step) => (
                          <option key={step.id} value={step.id}>
                            {step.sequenceNumber}. {step.name}
                            {step.id === currentStep?.id ? " (current)" : ""}
                          </option>
                        ))}
                      </select>
                    </Field>

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
                            {renderAssigneeLabel(assignment)}
                            {canAssign ? <Button
                              variant="ghost"
                              size="sm"
                              disabled={deleteAssignmentState.isLoading}
                              onClick={() => void removeAssignment(assignment.id)}
                            >
                              <Ban className="mr-2 h-3.5 w-3.5" />
                              Remove
                            </Button> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty text={`No one is assigned to ${assignmentStep?.name ?? "this step"} yet.`} />
                    )}

                    {canAssign ? <form className="space-y-3" onSubmit={submitStepAssignment}>
                      {userAccountsQuery.isError ? (
                        <InlineNotice tone="warning" title="Users unavailable">
                          Organization users could not be loaded. You can still try again shortly.
                        </InlineNotice>
                      ) : !userAccountsQuery.isLoading && assignableUsers.length === 0 ? (
                        <InlineNotice tone="warning" title="No eligible users">
                          This organization has no active user accounts. Create or activate a user
                          before assigning work.
                        </InlineNotice>
                      ) : null}
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
                        <Field label="Deadline (optional)">
                          <Input
                            type="datetime-local"
                            value={stepAssignment.deadline}
                            onChange={(event) =>
                              setStepAssignment((current) => ({
                                ...current,
                                deadline: event.target.value,
                              }))
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Assignee type">
                        <RadioGroup
                          className="grid grid-cols-2"
                          value={stepAssignment.assigneeType}
                          onValueChange={(value) =>
                            setStepAssignment((current) => ({
                              ...current,
                              assigneeType: value as "USER" | "VENDOR",
                              assigneeUserId: value === "USER" ? current.assigneeUserId : "",
                              vendorId: value === "VENDOR" ? current.vendorId : "",
                            }))
                          }
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="USER" id="step-assignee-user" />
                            <Label htmlFor="step-assignee-user" className="text-sm font-normal">
                              Internal worker
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="VENDOR" id="step-assignee-vendor" />
                            <Label htmlFor="step-assignee-vendor" className="text-sm font-normal">
                              Third-party vendor
                            </Label>
                          </div>
                        </RadioGroup>
                      </Field>
                      {stepAssignment.assigneeType === "USER" ? (
                        <Field label="Assignee">
                          <select
                            className={selectClassName}
                            value={stepAssignment.assigneeUserId}
                            disabled={assignableUsers.length === 0}
                            onChange={(event) =>
                              setStepAssignment((current) => ({
                                ...current,
                                assigneeUserId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select assignee</option>
                            {assignableUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : (
                        <Field label="Vendor">
                          <select
                            className={selectClassName}
                            value={stepAssignment.vendorId}
                            disabled={activeVendors.length === 0}
                            onChange={(event) =>
                              setStepAssignment((current) => ({
                                ...current,
                                vendorId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select vendor</option>
                            {activeVendors.map((vendor: Vendor) => (
                              <option key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </option>
                            ))}
                          </select>
                          {activeVendors.length === 0 ? (
                            <p className="mt-1 text-xs text-amber-600">
                              No active vendors yet — add one in the Vendors page.
                            </p>
                          ) : null}
                        </Field>
                      )}
                      <IndicatorRow indicators={assignmentStep?.indicators ?? []} className="mt-1" />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={
                            createOrderAssignmentState.isLoading ||
                            !assignmentStep ||
                            (stepAssignment.assigneeType === "USER" && assignableUsers.length === 0) ||
                            (stepAssignment.assigneeType === "VENDOR" && activeVendors.length === 0)
                          }
                        >
                          {createOrderAssignmentState.isLoading
                            ? "Saving..."
                            : `Assign ${assignmentStep?.name ?? "step"}`}
                        </Button>
                      </div>
                    </form> : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          ) : null}

          {detailTab === "quality" ? (
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Quality checklist</CardTitle>
                  <CardDescription>
                    Use quality-check templates to record PASS/FAIL outcomes per check, with an optional value and notes.
                  </CardDescription>
                </div>
                {canQuality ? <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTemplateCreateOpen(true)}
                    disabled={!currentStep}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Template
                  </Button>
                </div> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {qualityTemplatesQuery.isError ? (
                <InlineNotice tone="warning" title="Quality templates unavailable">
                  Quality-check templates could not be loaded from <code>/api/production/quality-check-templates</code>.
                </InlineNotice>
              ) : null}

              {currentStep && canQuality ? (
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
                            {order.quantityModel === "FLOW_V1" ? <Button type="button" className="mt-3" size="sm" variant="outline" disabled={!canQuality || createQualityResultState.isLoading} onClick={() => void submitQualityResults(check.id)}>Review this quality result</Button> : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty text="Select or create a quality template for this step." />
                  )}

                  {order.quantityModel !== "FLOW_V1" ? <div className="flex justify-end">
                    <Button
                      onClick={() => void submitQualityResults()}
                      disabled={createQualityResultState.isLoading || !selectedTemplate}
                    >
                      {createQualityResultState.isLoading ? "Saving..." : "Record quality results"}
                    </Button>
                  </div> : <p className="text-xs text-muted-foreground">Confirm each check separately. Every result changes the family version; a template is not silently replayed with new versions.</p>}
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
          ) : null}

          {detailTab === "materials" ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Material lots & shortages</CardTitle>
              <CardDescription>
                Record inventory lot consumption against the order&apos;s BOM and track shortage risk.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.batch?.nodeType === "SUMMARY" ? (
                <p className="text-sm text-muted-foreground">This overview retains historical material evidence. Review an executable child for its remaining requirements; inherited consumption is not charged again.</p>
              ) : pinnedBomQuery.isFetching ? (
                <Loading text="Loading the order's saved BOM version..." />
              ) : pinnedBomQuery.isError ? (
                <ErrorState title="Saved BOM unavailable" message="Material estimates cannot be shown until the saved BOM is loaded." onRetry={() => void pinnedBomQuery.refetch()} />
              ) : !activeBom ? (
                <Empty text="The original BOM is unknown. No current product BOM has been substituted." />
              ) : !materialRequirements.length ? (
                <Empty text="The selected BOM has no consumable material lines." />
              ) : (
                <>
                <p className="text-sm">Saved BOM: {activeBom.name} · v{activeBom.versionNumber}{!activeBom.active ? " · Archived (retained for this order)" : ""}. Estimates cover remaining output and include waste.</p>
                {materialRequirements.map((requirement) => (
                  <div key={requirement.inventoryItemId} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium">
                          {requirement.itemName || requirement.itemCode || requirement.inventoryItemId}
                          {requirement.itemName && requirement.itemCode ? ` · ${requirement.itemCode}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Need ~{formatNumber(requirement.estimatedRequiredQuantity ?? 0)} {requirement.unit}
                          {" · "}
                          Available {requirement.availableQuantity === undefined ? "unknown" : formatNumber(requirement.availableQuantity)} {requirement.unit}
                        </div>
                      </div>
                      {requirement.shortage === undefined ? (
                        <StatusBadge tone="warning">Stock unavailable</StatusBadge>
                      ) : requirement.shortage ? (
                        <StatusBadge tone="warning">Shortage risk</StatusBadge>
                      ) : (
                        <StatusBadge tone="success">Stock available</StatusBadge>
                      )}
                    </div>
                    {canConsume ? <MaterialConsumptionForm
                      order={order}
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
                      onRefresh={refreshDetail}
                    /> : null}
                  </div>
                ))}
                </>
              )}
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium">Recorded material consumption (actuals)</h4>
                {materialConsumptionsQuery.isError ? (
                  <ErrorState title="Consumption history unavailable" message="Could not load recorded material consumption." onRetry={() => void materialConsumptionsQuery.refetch()} />
                ) : materialConsumptionsQuery.isFetching ? <Loading text="Loading consumption history..." /> : materialConsumptions.length ? materialConsumptions.map((item) => (
                  <p key={item.id} className="text-sm text-muted-foreground">{item.inventoryItemId} · Lot {item.lotNumber} · {formatNumber(item.quantity)} {item.unit}</p>
                )) : <Empty text="No material consumption recorded." />}
              </div>
            </CardContent>
          </Card>
          ) : null}

          {detailTab === "execution" ? (
          <>
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Step execution</CardTitle>
              <CardDescription>
                Record output for the current step. Ready pieces can split and advance independently; reasoned losses reduce downstream work, never the original target.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentStep || order.batch?.nodeType === "SUMMARY" ? (
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
                      <span>Good at this step: {formatNumber(currentStep.goodQuantity ?? currentStep.completedQuantity ?? 0)}</span>
                      <span>Rejected: {formatNumber(currentStep.rejectedQuantity ?? 0)}</span>
                    </div>
                  </div>

                  {!Number.isFinite(currentStepRemainingQuantity) ? (
                    <InlineNotice tone="warning" title="Step quantities unavailable">Refresh the batch before recording or advancing. Original planned quantity cannot substitute for missing step input.</InlineNotice>
                  ) : currentStepRemainingQuantity > 0 ? (
                    order.quantityModel === "FLOW_V1" && !hasNextStep ? <ProductionFinalGoodForm
                      order={order} step={currentStep}
                      disabled={executionBlocked || order.bomBindingStatus === "LEGACY_UNRESOLVED" || !canProductionAction(order, "RECORD_GOOD")}
                      onDone={refreshDetail} onRefresh={refreshDetail}
                    /> :
                    <PartialCompletionForm
                      key={currentStep.id}
                      orderId={orderId}
                      stepId={currentStep.id}
                      remainingQuantity={currentStepRemainingQuantity}
                      expectedOrderVersion={order.executionVersion}
                      expectedStepVersion={currentStep.expectedVersion}
                      expectedFamilyVersion={order.batch?.familyVersion}
                      quantityModel={order.quantityModel}
                      onDone={refreshDetail}
                      onRefresh={refreshDetail}
                      disabled={executionBlocked || order.bomBindingStatus === "LEGACY_UNRESOLVED" || !canProductionAction(order, "RECORD_GOOD")}
                    />
                  ) : (
                    <InlineNotice tone="info" title="Current step production recorded">
                      The current step input is accounted for. Move this batch forward when the
                      next step is ready.
                    </InlineNotice>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <span
                      title={
                        currentStepRemainingQuantity > 0
                          ? `Record the remaining ${formatNumber(currentStepRemainingQuantity)} units before advancing`
                          : undefined
                      }
                    >
                      <Button
                        type="button"
                        disabled={stepActionState.isLoading || currentStepRemainingQuantity !== 0 || executionBlocked || !hasExecutionVersions(actionContext) || !canProductionAction(order, "ADVANCE")}
                        onClick={() => {
                          try {
                            setPendingAdvance({ ...reviewProductionAction(actionContext, "complete", 0, 0), stepName: currentStep.name, completesOrder: !hasNextStep });
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Refresh and review this step before advancing.");
                          }
                        }}
                      >
                      <Check className="mr-2 h-4 w-4" />
                        {hasNextStep ? "Move to next step" : "Complete order"}
                      </Button>
                    </span>
                    {currentStepRemainingQuantity > 0 ? (
                      <span className="self-center text-xs text-muted-foreground">
                        Record the remaining {formatNumber(currentStepRemainingQuantity)} units
                        before advancing.
                      </span>
                    ) : null}
                  </div>
                  {!hasExecutionVersions(actionContext) ? <InlineNotice tone="warning" title="Refresh required">Order and step concurrency versions must be available before saving output or advancing.</InlineNotice> : null}
                  {productionActionBlock(order, "ADVANCE") ? <p role="status" className="text-sm text-muted-foreground">{productionActionBlock(order, "ADVANCE")}</p> : null}
                  {order.capabilities && !productionIsTerminal(order) ? <ProductionSplit order={order} step={currentStep} disabled={executionBlocked} onSelect={onSelect} onRefresh={refreshDetail} /> : null}
                  {order.capabilities && !productionIsTerminal(order) ? <ProductionShortClose
                    order={order} step={currentStep} disabled={executionBlocked} onDone={refreshDetail} onRefresh={refreshDetail}
                    rejectionSources={[
                      ...(timelineQuery.data ?? []).filter((event) => event.stepId === currentStep.id && event.rejectedQuantity > 0).map((event) => ({ sourceType: "STEP_EXECUTION" as const, sourceId: event.id, quantity: event.rejectedQuantity })),
                      ...executionBatches.filter((batch) => batch.orderStepSnapshotId === currentStep.id && batch.rejectedQuantity > 0).map((batch) => ({ sourceType: "EXECUTION_BATCH" as const, sourceId: batch.id, quantity: batch.rejectedQuantity })),
                    ]}
                  /> : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Recorded output history</CardTitle>
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
                        <span className="font-medium">Output record {batch.batchNumber}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(batch.createdAt)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Completed {formatNumber(batch.completedQuantity)} · Rejected {formatNumber(batch.rejectedQuantity)}
                      </div>
                      {batch.notes ? <p className="mt-1 text-xs text-muted-foreground">{batch.notes}</p> : null}
                      <p className="mt-1 break-all text-xs text-muted-foreground">Rejection evidence source: EXECUTION_BATCH / {batch.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </>
          ) : null}

          {detailTab === "timeline" ? (
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
          ) : null}

          {detailTab === "audit" ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Audit trail
              </CardTitle>
              <CardDescription>
                Every create, edit, assignment, execution, and completion event recorded for this order, newest first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogQuery.isLoading ? (
                <Loading text="Loading audit trail..." />
              ) : auditLogQuery.isError ? (
                <ErrorState
                  title="Audit trail unavailable"
                  message="The audit log could not be loaded for this order."
                  onRetry={() => void auditLogQuery.refetch()}
                />
              ) : !auditLogQuery.data?.content.length ? (
                <Empty text="No audit events recorded yet." />
              ) : (
                <div className="space-y-3">
                  {auditLogQuery.data.content.map((event) => (
                    <AuditLogRow key={event.id} event={event} actorName={actorsById.get(event.actorUserId ?? "")} />
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={auditPage === 0}
                      onClick={() => setAuditPage((page) => Math.max(0, page - 1))}
                    >
                      Newer
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {auditPage + 1} of {Math.max(1, auditLogQuery.data.totalPages ?? 1)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={auditPage + 1 >= (auditLogQuery.data.totalPages ?? 1)}
                      onClick={() => setAuditPage((page) => page + 1)}
                    >
                      Load more
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(auxiliaryReview)}
        onOpenChange={(open) => { if (!open && !auxiliarySaving.current) setAuxiliaryReview(undefined); }}
        title="Confirm batch change"
        description={staleAuxiliary ? "The order or family changed after review. Cancel, refresh and review again." : auxiliaryReview?.description ?? ""}
        confirmLabel="Confirm reviewed change"
        loading={createOrderAssignmentState.isLoading || deleteAssignmentState.isLoading || createQualityResultState.isLoading}
        disabled={staleAuxiliary || executionBlocked || Boolean(auxiliaryReview && !canProductionAction(order, auxiliaryReview.kind === "QUALITY" ? "RECORD_QUALITY" : "ASSIGN"))}
        onConfirm={() => void confirmAuxiliary()}
      />
      <ConfirmDialog
        open={Boolean(pendingAdvance)}
        onOpenChange={(open) => { if (!open && !advancingRef.current) setPendingAdvance(null); }}
        title={pendingAdvance?.completesOrder ? "Complete this production order?" : "Move to the next workflow step?"}
        description={staleAdvance
          ? "The order or step changed after your review. Cancel, refresh, and review again before advancing."
          : `Finish ${pendingAdvance?.stepName ?? "this step"}${pendingAdvance?.completesOrder ? " and complete this order" : " and move to the next active step"}? This action records no quantities. Recorded production is not changed.`}
        confirmLabel={stepActionState.isLoading ? "Advancing..." : "Confirm advancement"}
        loading={stepActionState.isLoading}
        disabled={staleAdvance || executionBlocked}
        onConfirm={() => void advanceCurrentStep()}
      />
      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel this production order?"
        description="This preserves immutable history but prevents further execution on the order."
        confirmLabel={cancelState.isLoading ? "Cancelling..." : "Cancel order"}
        disabled={order.quantityModel === "FLOW_V1" || productionIsTerminal(order) || !canProductionAction(order, "CANCEL") || orderQuery.isFetching || orderQuery.isError}
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
  const [page, setPage] = useState(0);
  const [includeArchived, setIncludeArchived] = useState(false);
  const workflowsQuery = useGetWorkflowsQuery({ page, size: 50, includeArchived });
  const [selectedId, setSelectedId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);

  const selectedTemplate = workflowsQuery.currentData?.content.find(
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
          <label className="mb-3 flex items-center gap-2 text-sm">
            <Switch checked={includeArchived} onCheckedChange={(checked) => { setIncludeArchived(checked); setPage(0); setSelectedId(undefined); }} />
            Include archived templates
          </label>
          {workflowsQuery.isFetching ? (
            <Loading text="Loading workflow templates..." />
          ) : workflowsQuery.isError ? (
            <ErrorState
              title="Workflow templates unavailable"
              message="Workflow APIs could not be loaded."
              onRetry={() => void workflowsQuery.refetch()}
            />
          ) : !workflowsQuery.currentData?.content.length ? (
            <EmptyState
              icon={Factory}
              title="No workflow templates"
              description="Create a production workflow template to version your execution steps."
            />
          ) : (
            <div className="space-y-2">
              {workflowsQuery.currentData.content.map((workflow) => (
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
                    {!workflow.active ? <StatusBadge tone="draft">Archived</StatusBadge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {workflow.description || "No description"}
                  </p>
                </button>
              ))}
            </div>
          )}
          <CatalogPagination page={page} totalPages={workflowsQuery.currentData?.totalPages ?? 0} loading={workflowsQuery.isFetching} onChange={(next) => { setPage(next); setSelectedId(undefined); }} />
        </CardContent>
      </Card>

      {selectedTemplate ? (
        <WorkflowVersions key={selectedTemplate.id} template={selectedTemplate} />
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
  template: WorkflowTemplate;
}) {
  const versionsQuery = useGetWorkflowVersionsQuery(template.id);
  const [publishWorkflow, publishState] = usePublishWorkflowMutation();
  const [archiveWorkflow, archiveState] = useArchiveWorkflowMutation();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [revision, setRevision] = useState<{ template: WorkflowTemplate; version: WorkflowVersion }>();
  const [pendingPublishId, setPendingPublishId] = useState<string>();

  const archive = async () => {
    try {
      await archiveWorkflow(template.id).unwrap();
      setArchiveOpen(false);
      toast.success("Workflow archived. Existing orders are unchanged.");
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not archive workflow");
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
                {template.active ? "Edit any version into a new draft. Publishing is a separate action; existing orders keep their saved version." : "Archived template. Versions remain available for history; this workflow cannot be selected for new orders."}
              </CardDescription>
            </div>
            {template.active ? <Button variant="outline" onClick={() => setArchiveOpen(true)}>Archive template</Button> : <StatusBadge tone="draft">Archived</StatusBadge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {versionsQuery.isFetching ? (
            <Loading text="Loading workflow versions..." />
          ) : versionsQuery.isError ? (
            <ErrorState title="Workflow versions unavailable" message="Could not load workflow history." onRetry={() => void versionsQuery.refetch()} />
          ) : !versionsQuery.data?.length ? (
            <Empty text="No workflow versions yet." />
          ) : (
            [...versionsQuery.data].sort((a, b) => b.versionNumber - a.versionNumber).map((version) => (
              <div key={version.id} className="rounded-lg border p-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="font-medium">{version.name} · Version {version.versionNumber}</div>
                    {version.description ? <p className="text-sm text-muted-foreground">{version.description}</p> : null}
                    <div className="text-xs text-muted-foreground">
                      {version.publishedAt
                        ? `Published ${formatDateTime(version.publishedAt)}`
                        : "Draft version"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(version.status)}>
                      {version.status}
                    </StatusBadge>
                    {template.active ? <Button size="sm" variant="outline" onClick={() => setRevision({ template, version })}>Edit as new version</Button> : null}
                    {template.active && version.status === "DRAFT" ? (
                      <Button size="sm" onClick={() => setPendingPublishId(version.id)}>
                        Publish
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...version.steps].sort((a, b) => a.sequenceNumber - b.sequenceNumber).map((step) => (
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

      <WorkflowDialog open={Boolean(revision)} onOpenChange={(open) => !open && setRevision(undefined)} template={revision?.template} sourceVersion={revision?.version} />
      <ConfirmDialog open={archiveOpen} onOpenChange={setArchiveOpen} title={`Archive ${template.name}?`} description="All versions will be unavailable for future orders. Existing orders, their saved steps, and version history are preserved. Nothing is permanently deleted." confirmLabel="Archive template" loading={archiveState.isLoading} onConfirm={() => void archive()} />
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
  template,
  sourceVersion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: WorkflowTemplate;
  sourceVersion?: WorkflowVersion;
}) {
  const [form, setForm] = useState<WorkflowRequest>({
    code: "",
    name: "",
    description: "",
    steps: [emptyStep()],
  });
  const [createWorkflow, state] = useCreateWorkflowMutation();
  const [createDraft, draftState] = useCreateWorkflowDraftMutation();
  const saving = state.isLoading || draftState.isLoading;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setForm(template && sourceVersion ? workflowRevision(template, sourceVersion) : { code: "", name: "", description: "", steps: [emptyStep()] });
    });
  }, [open, template, sourceVersion]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.steps.length || !form.steps.some((step) => step.active !== false) || form.steps.some((step) => !step.name.trim() || !step.code.trim()) || new Set(form.steps.map((step) => step.code.trim())).size !== form.steps.length) {
      toast.error("Template code, name, at least one active step, and unique step codes with names are required.");
      return;
    }

    try {
      const body: WorkflowRequest = {
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
      };
      if (template && sourceVersion) {
        await createDraft({ templateId: template.id, body }).unwrap();
      } else {
        await createWorkflow(body).unwrap();
      }
      toast.success("Workflow draft created. Publish it separately when ready.");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not create workflow");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sourceVersion ? `Edit workflow v${sourceVersion.versionNumber} as a new version` : "New workflow template"}</DialogTitle>
          <DialogDescription>
            Create a draft template, then publish immutable versions for production orders.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code}
                disabled={Boolean(template)}
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
                  <label className="mr-auto flex items-center gap-2 text-sm"><Switch checked={step.active !== false} onCheckedChange={(active) => setForm((current) => ({ ...current, steps: current.steps.map((item, itemIndex) => itemIndex === index ? { ...item, active } : item) }))} />Active step</label>
                  <Button type="button" variant="ghost" disabled={index === 0} onClick={() => setForm((current) => {
                    const steps = [...current.steps];
                    [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
                    return { ...current, steps: steps.map((item, stepIndex) => ({ ...item, sequenceNumber: stepIndex + 1 })) };
                  })}>Move up</Button>
                  <Button type="button" variant="ghost" disabled={index === form.steps.length - 1} onClick={() => setForm((current) => {
                    const steps = [...current.steps];
                    [steps[index], steps[index + 1]] = [steps[index + 1], steps[index]];
                    return { ...current, steps: steps.map((item, stepIndex) => ({ ...item, sequenceNumber: stepIndex + 1 })) };
                  })}>Move down</Button>
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
            <Button disabled={saving || (template && !template.active)} type="submit">
              {saving ? "Creating..." : "Save new draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Boms() {
  const [productPage, setProductPage] = useState(0);
  const [inventoryPageNumber, setInventoryPageNumber] = useState(0);
  const [includeArchived, setIncludeArchived] = useState(false);
  const productsQuery = useGetProductsQuery({ page: productPage, size: 50 });
  const products = productsQuery.currentData?.content ?? [];
  const [productId, setProductId] = useState("");
  const bomsQuery = useGetBomsQuery({ productId, includeArchived }, { skip: !productId });
  const inventoryQuery = useGetInventoryItemsQuery({
    page: inventoryPageNumber,
    size: 50,
    itemType: "RAW_MATERIAL",
  });
  const inventoryItems = inventoryQuery.currentData?.content ?? [];
  const [createBom, createState] = useCreateBomMutation();
  const [createDraft, draftState] = useCreateBomDraftMutation();
  const [archiveBom, archiveState] = useArchiveBomMutation();
  const [publishBom, publishState] = usePublishBomMutation();
  const [sourceBom, setSourceBom] = useState<Bom>();
  const [archiveTarget, setArchiveTarget] = useState<Bom>();
  const [name, setName] = useState("Default BOM");
  const [items, setItems] = useState<BomItemRequest[]>([
    { inventoryItemId: "", quantityPerUnit: 1, unit: "", wastePercentage: 0 },
  ]);
  const [pendingPublishId, setPendingPublishId] = useState<string>();

  useEffect(() => {
    queueMicrotask(() => {
      setName("Default BOM");
      setSourceBom(undefined);
      setPendingPublishId(undefined);
      setArchiveTarget(undefined);
      setItems([{ inventoryItemId: "", quantityPerUnit: 1, unit: "", wastePercentage: 0 }]);
    });
  }, [productId]);

  const editRevision = (bom: Bom) => {
    const draft = bomRevision(bom);
    setSourceBom(bom);
    setName(draft.name);
    setItems(draft.items);
  };

  const resetDraft = () => {
    setSourceBom(undefined);
    setName("Default BOM");
    setItems([{ inventoryItemId: "", quantityPerUnit: 1, unit: "", wastePercentage: 0 }]);
  };

  const archive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveBom(archiveTarget.id).unwrap();
      toast.success("BOM version archived. Existing orders keep their saved BOM.");
      setArchiveTarget(undefined);
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? "Could not archive BOM");
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validBomRequest({ productId, name, items })) {
      toast.error("Select a product, name, and unique materials with positive quantities, units, and non-negative waste.");
      return;
    }

    try {
      const body = {
        productId,
        name: name.trim(),
        items: items.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          quantityPerUnit: Number(item.quantityPerUnit),
          unit: item.unit.trim(),
          wastePercentage: Number(item.wastePercentage || 0),
        })),
      };
      if (sourceBom) {
        await createDraft({ id: sourceBom.id, body }).unwrap();
      } else {
        await createBom(body).unwrap();
      }
      toast.success("New BOM draft created. Publish it separately when ready.");
      resetDraft();
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
            <CardTitle>{sourceBom ? `Edit BOM v${sourceBom.versionNumber} as a new version` : "New product BOM"}</CardTitle>
            <CardDescription>
              {sourceBom ? "Saving creates a new draft. The source version and existing orders remain unchanged." : "Link raw materials to finished goods so execution can forecast shortages."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="Product">
              <select
                className={selectClassName}
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                disabled={createState.isLoading || draftState.isLoading}
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productCode} · {product.name}
                  </option>
                ))}
              </select>
              <CatalogPagination page={productPage} totalPages={productsQuery.currentData?.totalPages ?? 0} loading={productsQuery.isFetching || createState.isLoading || draftState.isLoading} onChange={(page) => { setProductPage(page); setProductId(""); }} />
            </Field>
            {productsQuery.isError ? <ErrorState title="Products unavailable" message="Could not load products." onRetry={() => void productsQuery.refetch()} /> : null}

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
                        {item.inventoryItemId && !inventoryItems.some((candidate) => candidate.id === item.inventoryItemId) ? <option value={item.inventoryItemId}>{sourceBom?.items.find((candidate) => candidate.inventoryItemId === item.inventoryItemId)?.itemName ?? item.inventoryItemId} (selected)</option> : null}
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
                    <Button type="button" size="sm" variant="ghost" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove item</Button>
                  </div>
                ))}
                <CatalogPagination page={inventoryPageNumber} totalPages={inventoryQuery.currentData?.totalPages ?? 0} loading={inventoryQuery.isFetching} onChange={setInventoryPageNumber} />
                {inventoryQuery.isError ? <ErrorState title="Materials unavailable" message="Could not load the material catalog. Saved revision items are preserved." onRetry={() => void inventoryQuery.refetch()} /> : null}
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
                  <Button disabled={createState.isLoading || draftState.isLoading} type="submit">
                    {createState.isLoading || draftState.isLoading ? "Saving..." : "Save new draft"}
                  </Button>
                  {sourceBom ? <Button type="button" variant="outline" disabled={draftState.isLoading} onClick={resetDraft}>Cancel revision</Button> : null}
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
            <label className="mb-3 flex items-center gap-2 text-sm"><Switch checked={includeArchived} onCheckedChange={setIncludeArchived} />Include archived BOM versions</label>
            {bomsQuery.isFetching ? (
              <Loading text="Loading BOM versions..." />
            ) : bomsQuery.isError ? (
              <ErrorState
                title="BOMs unavailable"
                message="The BOM API is not responding right now."
                onRetry={() => void bomsQuery.refetch()}
              />
            ) : !productId ? (
              <Empty text="BOMs are scoped to a product." />
            ) : !bomsQuery.currentData?.length ? (
              <Empty text="No BOM versions yet." />
            ) : (
              <div className="space-y-2">
                {[...bomsQuery.currentData].sort((a, b) => b.versionNumber - a.versionNumber).map((bom) => (
                  <div key={bom.id} className="rounded-lg border p-3">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="font-medium">
                          {bom.name} · v{bom.versionNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {bom.items.length} material lines
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={statusTone(bom.status)}>{humanize(bom.status)}</StatusBadge>
                        {!bom.active ? <StatusBadge tone="draft">Archived</StatusBadge> : null}
                        {bom.active ? <Button size="sm" variant="outline" disabled={draftState.isLoading || createState.isLoading} onClick={() => editRevision(bom)}>Edit as new version</Button> : null}
                        {bom.active ? <Button size="sm" variant="outline" onClick={() => setArchiveTarget(bom)}>Archive</Button> : null}
                        {bom.active && bom.status === "DRAFT" ? (
                          <Button size="sm" onClick={() => setPendingPublishId(bom.id)}>
                            Publish
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {bom.items.map((item) => <p key={item.id}>{item.itemName ?? item.itemCode ?? item.inventoryItemId} · {formatNumber(item.quantityPerUnit)} {item.unit} per unit · {formatNumber(item.wastePercentage ?? 0)}% waste</p>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog open={Boolean(archiveTarget)} onOpenChange={(open) => !open && setArchiveTarget(undefined)} title={`Archive ${archiveTarget?.name ?? "BOM"} v${archiveTarget?.versionNumber ?? ""}?`} description="This version will be unavailable for new orders. Existing orders retain it, including material assumptions and history. Nothing is permanently deleted." confirmLabel="Archive version" loading={archiveState.isLoading} onConfirm={() => void archive()} />
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
    queueMicrotask(() => {
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
    });
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
    queueMicrotask(() => {
      setForm({
        ...emptyQualityTemplate(),
        stepCode: defaultStepCode,
        productId: defaultProductId,
        workflowVersionId: defaultWorkflowVersionId,
      });
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
  order,
  orderId,
  stepId,
  requirement,
  draft,
  onDraftChange,
  onRecorded,
  onRefresh,
}: {
  order: ProductionOrder;
  orderId: string;
  stepId?: string;
  requirement: MaterialRequirement;
  draft?: MaterialConsumptionDraft;
  onDraftChange: (value: MaterialConsumptionDraft) => void;
  onRecorded: () => void;
  onRefresh: () => void;
}) {
  const [createMaterialConsumption, createMaterialConsumptionState] = useCreateMaterialConsumptionMutation();
  const [review, setReview] = useState<MaterialConsumptionRequest>();
  const saving = useRef(false);
  const lotNumber = draft?.lotNumber || "";
  const quantity = draft?.quantity || "";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!lotNumber.trim()) throw new Error("Enter a lot number before recording consumption.");
      setReview({
        productionOrderId: orderId, orderStepSnapshotId: stepId,
        inventoryItemId: requirement.inventoryItemId, lotNumber: lotNumber.trim(),
        quantity: parseProductionQuantity(quantity, { positive: true }), unit: requirement.unit,
        ...productionOrderGuard(order),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review the material quantity and batch versions.");
    }
  };
  const stale = Boolean(review && (review.productionOrderId !== order.id || !matchesProductionOrderGuard(review, order)));
  const confirm = async () => {
    if (!review || saving.current || stale || !canProductionAction(order, "CONSUME_MATERIAL")) return;
    saving.current = true;
    try {
      await createMaterialConsumption(review).unwrap();
      toast.success("Material consumption recorded");
      setReview(undefined);
      onRecorded();
      onRefresh();
    } catch (error) {
      setReview(undefined);
      toast.error(apiErrorMessage(error) ?? "Consumption outcome not confirmed. Refresh and inspect material history before recording again. No automatic retry was made.");
      onRefresh();
    } finally { saving.current = false; }
  };

  return (
    <>
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
          {createMaterialConsumptionState.isLoading ? "Recording..." : "Review consumption"}
        </Button>
      </div>
    </form>
    <ConfirmDialog
      open={Boolean(review)} onOpenChange={(open) => { if (!open && !saving.current) setReview(undefined); }}
      title="Confirm actual material consumption"
      description={stale ? "The batch or family changed. Cancel, refresh and review again." : `Consume ${review?.quantity ?? ""} ${review?.unit ?? ""} of ${requirement.itemName ?? requirement.inventoryItemId} from lot ${review?.lotNumber ?? ""}? This deducts new stock. Already-consumed issues must not be recorded again for scrap or final-good coverage.`}
      confirmLabel="Confirm stock deduction" loading={createMaterialConsumptionState.isLoading}
      disabled={stale || !canProductionAction(order, "CONSUME_MATERIAL")} onConfirm={() => void confirm()}
    />
    </>
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
      {event.rejectedQuantity > 0 ? <p className="mt-1 break-all text-xs text-muted-foreground">Rejection evidence source: STEP_EXECUTION / {event.id}</p> : null}
    </div>
  );
}

const auditEventTone: Record<AuditEventType, "success" | "error" | "warning" | "info" | "pending"> = {
  CREATED: "info",
  EDITED: "pending",
  CANCELLED: "error",
  ASSIGNED: "info",
  REASSIGNED: "warning",
  UNASSIGNED: "warning",
  VENDOR_HANDOFF: "info",
  STEP_STARTED: "pending",
  STEP_PAUSED: "warning",
  PARTIAL_COMPLETE: "pending",
  STEP_COMPLETED: "success",
  EXECUTION_BATCH_RECORDED: "pending",
  QUALITY_RECORDED: "info",
  MATERIAL_CONSUMED: "pending",
  ORDER_COMPLETED: "success",
  DEADLINE_BREACHED: "error",
};

const auditEventIcon: Record<AuditEventType, typeof History> = {
  CREATED: Plus,
  EDITED: Pencil,
  CANCELLED: Ban,
  ASSIGNED: UserPlus,
  REASSIGNED: RefreshCw,
  UNASSIGNED: UserMinus,
  VENDOR_HANDOFF: Truck,
  STEP_STARTED: Play,
  STEP_PAUSED: Pause,
  PARTIAL_COMPLETE: Check,
  STEP_COMPLETED: BadgeCheck,
  EXECUTION_BATCH_RECORDED: PackageCheck,
  QUALITY_RECORDED: ShieldCheck,
  MATERIAL_CONSUMED: Boxes,
  ORDER_COMPLETED: ClipboardCheck,
  DEADLINE_BREACHED: AlertTriangle,
};

function auditEventSummary(event: AuditLogResponse): string {
  const base = humanize(event.eventType);
  return event.details ? `${base} — ${event.details}` : base;
}

function AuditLogRow({ event, actorName }: { event: AuditLogResponse; actorName?: string }) {
  const Icon = auditEventIcon[event.eventType] ?? History;
  return (
    <div className="flex gap-3 border-l-2 border-primary/30 pl-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={auditEventTone[event.eventType] ?? "pending"}>
            {humanize(event.eventType)}
          </StatusBadge>
          <span className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</span>
          {actorName ? (
            <span className="text-xs text-muted-foreground">by {actorName}</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{auditEventSummary(event)}</p>
      </div>
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
  disabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
  disabled?: boolean;
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
            disabled={loading || disabled}
            variant={destructive ? "destructive" : "default"}
            onClick={(event) => { event.preventDefault(); onConfirm(); }}
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
  orders: DisplayOrder[];
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
        order.productName,
        order.productCode,
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

// New leaf cards are self-contained; root-page enrichment is legacy-only.
function buildBoardColumns(
  cards: KanbanCard[],
  orders: DisplayOrder[],
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
      card.remainingQuantity ?? card.quantities?.pendingQuantity ?? order?.remainingQuantity ??
      Math.max(card.plannedQuantity - card.completedQuantity - card.rejectedQuantity, 0);

    return {
      orderId: card.orderId,
      orderNumber: card.orderNumber,
      productId: card.productId ?? order?.productId ?? "",
      productCode: card.productCode ?? order?.productCode,
      productName: card.productName ?? order?.productName,
      priority: card.priority ?? order?.priority ?? "NORMAL",
      status: card.status,
      dueDate: card.dueDate ?? order?.dueDate,
      plannedQuantity: card.plannedQuantity,
      completedQuantity: card.completedQuantity,
      rejectedQuantity: card.rejectedQuantity,
      remainingQuantity,
      currentStepId,
      currentStepName: card.currentStepName ?? step?.name,
      stationId: card.stationId ?? order?.assignedStationId ?? step?.stationId ?? null,
      stationName: card.stationName ?? order?.assignedStationName ?? step?.stationName ?? null,
      workstationId: card.workstationId ?? order?.assignedWorkstationId ?? step?.workstationId ?? null,
      workstationName: card.workstationName ?? order?.assignedWorkstationName ?? step?.workstationName ?? null,
      hasActiveAssignment: card.hasActiveAssignment ?? order?.hasActiveAssignment,
      indicators: order?.indicators,
      quantityModel: card.quantityModel,
      batch: card.batch,
      quantities: card.quantities,
      capabilities: card.capabilities,
    };
  });

  const filtered = items.filter((item) => {
    const matchesSearch =
      !needle ||
      [item.orderNumber, item.batch?.batchLabel, item.batch?.rootOrderId, item.productName, item.productCode, item.productId, item.currentStepName]
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
  if (workload.activeOrders >= 5) {
    indicators.push({
      type: "WORKLOAD",
      severity: "warning",
      label: "High workload",
    });
  }
  if (workload.plannedQuantity > 0 && workload.completedQuantity <= 0) {
    indicators.push({
      type: "INFO",
      severity: "info",
      label: "No output recorded yet",
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

function getCurrentOrderStep(order: ProductionOrder) {
  if (order.batch?.nodeType === "SUMMARY") return undefined;
  const current = order.steps.find((step) => step.id === order.currentStepId);
  if (current || productionIsTerminal(order) || order.quantityModel === "FLOW_V1") {
    return current;
  }
  return order.steps.find((step) => step.active);
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

const humanize = humanizeEnum;

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
