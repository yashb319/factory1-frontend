export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type WorkflowStatus = "DRAFT" | "PUBLISHED";
export type OrderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type OrderStatus =
  | "PLANNED"
  | "RELEASED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "CANCELLED";
export type StepExecutionStatus =
  | "PENDING"
  | "READY"
  | "IN_PROGRESS"
  | "PAUSED"
  | "HOLD"
  | "COMPLETED"
  | "BLOCKED";
export type StepAction = "start" | "pause" | "complete";
export type ProductionIndicatorType =
  | "DELAYED"
  | "WORKLOAD"
  | "QUALITY_FAILURE"
  | "SHORTAGE"
  | "CONFLICT"
  | "INFO";
export type ProductionIndicatorSeverity = "info" | "warning" | "critical";
export type QualityResultStatus = "PASS" | "FAIL" | "HOLD";
export type AuditEventType =
  | "CREATED"
  | "EDITED"
  | "CANCELLED"
  | "ASSIGNED"
  | "REASSIGNED"
  | "UNASSIGNED"
  | "VENDOR_HANDOFF"
  | "STEP_STARTED"
  | "STEP_PAUSED"
  | "PARTIAL_COMPLETE"
  | "STEP_COMPLETED"
  | "EXECUTION_BATCH_RECORDED"
  | "QUALITY_RECORDED"
  | "MATERIAL_CONSUMED"
  | "ORDER_COMPLETED"
  | "DEADLINE_BREACHED";

export type WorkflowStepRequest = {
  name: string;
  code: string;
  sequenceNumber: number;
  description?: string;
  workstation?: string;
  roleMetadata?: string;
  active?: boolean;
};

export type WorkflowRequest = {
  code: string;
  name: string;
  description?: string;
  steps: WorkflowStepRequest[];
};

export type WorkflowTemplate = {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
};

export type WorkflowStep = WorkflowStepRequest & { id: string };

export type WorkflowVersion = {
  id: string;
  templateId: string;
  versionNumber: number;
  status: WorkflowStatus;
  publishedAt?: string;
  steps: WorkflowStep[];
};

export type BomItemRequest = {
  inventoryItemId: string;
  quantityPerUnit: number;
  unit: string;
  wastePercentage?: number;
};

export type BomRequest = {
  productId: string;
  name: string;
  items: BomItemRequest[];
};

export type BomItem = BomItemRequest & {
  id: string;
};

export type Bom = {
  id: string;
  productId: string;
  versionNumber: number;
  name: string;
  status: WorkflowStatus;
  publishedAt?: string;
  items: BomItem[];
};

export type ProductionIndicator = {
  id?: string;
  type: ProductionIndicatorType;
  severity: ProductionIndicatorSeverity;
  label: string;
  description?: string;
  createdAt?: string;
};

export type ProductionAssignment = {
  id?: string;
  stationId?: string;
  workstationId?: string;
  assigneeLabel?: string;
  notes?: string;
  batchSize?: number;
  stationName?: string;
  workstationName?: string;
  assignedAt?: string;
  assignedByUserId?: string;
};

export type ProductionOrderRequest = {
  orderNumber: string;
  customerId?: string;
  sourceOrderId?: string;
  productId: string;
  plannedQuantity: number;
  priority: OrderPriority;
  dueDate?: string;
  workflowVersionId: string;
  notes?: string;
  responsibleUserId: string;
};

export type OrderStep = {
  id: string;
  name: string;
  code: string;
  sequenceNumber: number;
  description?: string;
  workstation?: string;
  roleMetadata?: string;
  active: boolean;
  status?: StepExecutionStatus;
  expectedVersion?: number;
  completedQuantity?: number;
  rejectedQuantity?: number;
  holdQuantity?: number;
  remainingQuantity?: number;
  stationId?: string | null;
  stationName?: string | null;
  workstationId?: string | null;
  workstationName?: string | null;
  assigneeLabel?: string | null;
  indicators?: ProductionIndicator[];
};

export type ProductionOrder = ProductionOrderRequest & {
  id: string;
  version?: number;
  executionVersion?: number;
  completedQuantity: number;
  rejectedQuantity: number;
  remainingQuantity: number;
  workflowVersionNumber: number;
  currentStepId?: string;
  status: OrderStatus;
  assignedStationId?: string | null;
  assignedStationName?: string | null;
  assignedWorkstationId?: string | null;
  assignedWorkstationName?: string | null;
  hasActiveAssignment?: boolean;
  indicators?: ProductionIndicator[];
  steps: OrderStep[];
};

export type StepActionRequest = {
  completedQuantity?: number;
  rejectedQuantity?: number;
  notes?: string;
  expectedOrderVersion?: number;
  expectedStepVersion?: number;
};

export type TimelineEvent = {
  id: string;
  stepId: string;
  action:
    | "STARTED"
    | "PAUSED"
    | "COMPLETED"
    | "HELD"
    | "RESUMED"
    | "ASSIGNED"
    | "QUALITY_RECORDED"
    | "MATERIAL_CONSUMED";
  completedQuantity: number;
  rejectedQuantity: number;
  notes?: string;
  actorUserId: string;
  occurredAt: string;
};

// Mirrors com.factory1.production.dto.ProductionPhase2Dtos.WorkstationWorkload —
// keyed by the workstation code string, not a station id/name pair.
export type ProductionStationWorkload = {
  workstation: string;
  activeOrders: number;
  plannedQuantity: number;
  completedQuantity: number;
};

// Mirrors com.factory1.production.dto.ProductionPhase2Dtos.DashboardResponse
// returned by GET /api/production/dashboard.
export type ProductionDashboard = {
  planned: number;
  released: number;
  inProgress: number;
  onHold: number;
  completed: number;
  blocked: number;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  delayedOrders: number;
  qualityFailures: number;
  materialShortages: number;
};

export type ProductionBoardItem = {
  orderId: string;
  orderNumber: string;
  productId: string;
  priority: OrderPriority;
  status: OrderStatus;
  dueDate?: string;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  remainingQuantity: number;
  currentStepId?: string;
  currentStepName?: string;
  stationId?: string | null;
  stationName?: string | null;
  workstationId?: string | null;
  workstationName?: string | null;
  hasActiveAssignment?: boolean;
  indicators?: ProductionIndicator[];
};

export type ProductionBoardColumn = {
  key: string;
  label: string;
  items: ProductionBoardItem[];
};

export type ProductionBoardQuery = {
  status?: OrderStatus;
  page?: number;
  size?: number;
};

// Flat card shape returned by GET /api/production/kanban (PageResponse<KanbanCard>).
// The backend does not group cards into columns, so the frontend groups them
// client-side and enriches them with data already loaded from the orders API.
export type KanbanCard = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  currentStepId?: string;
  updatedAt?: string;
};

export type MaterialRequirement = {
  inventoryItemId: string;
  itemCode?: string;
  itemName?: string;
  unit: string;
  quantityPerUnit: number;
  estimatedRequiredQuantity?: number;
  availableQuantity?: number;
  shortage?: boolean;
};

export type ProductionExecutionConflict = {
  code?: string;
  message: string;
  currentOrderVersion?: number;
  currentStepVersion?: number;
  latestOrder?: ProductionOrder;
};

export type Workstation = {
  id: string;
  code: string;
  name: string;
  description?: string;
  location?: string;
  metadata?: Record<string, unknown>;
  active: boolean;
};

export type WorkstationRequest = Omit<Workstation, "id">;

export type AssignmentRole = "USER" | "OPERATOR" | "SUPERVISOR";

export type OrderAssignmentRequest = {
  productionOrderId: string;
  orderStepSnapshotId?: string;
  assignmentRole: AssignmentRole;
  assigneeUserId?: string;
  vendorId?: string;
  deadline?: string;
};

export type OrderAssignment = OrderAssignmentRequest & {
  id: string;
  createdAt?: string;
  deadlineBreachNotifiedAt?: string;
};

export type ExecutionBatchRequest = {
  orderStepSnapshotId: string;
  batchNumber: number;
  completedQuantity: number;
  rejectedQuantity: number;
  notes?: string;
  expectedVersion?: number;
};

export type ExecutionBatch = ExecutionBatchRequest & {
  id: string;
  productionOrderId: string;
  createdAt?: string;
};

export type QualityTemplateCheckRequest = {
  code: string;
  name: string;
  sequenceNumber: number;
  required?: boolean;
};

export type QualityTemplateCheck = QualityTemplateCheckRequest & {
  id: string;
};

export type QualityTemplateRequest = {
  code: string;
  name: string;
  description?: string;
  workflowVersionId?: string;
  productId?: string;
  stepCode?: string;
  checks: QualityTemplateCheckRequest[];
};

export type QualityTemplate = Omit<QualityTemplateRequest, "checks"> & {
  id: string;
  checks: QualityTemplateCheck[];
};

export type QualityResultRequest = {
  orderStepSnapshotId: string;
  templateId: string;
  definitionId: string;
  passed: boolean;
  value?: string;
  notes?: string;
};

export type QualityResult = QualityResultRequest & {
  id: string;
  productionOrderId: string;
  createdAt?: string;
};

export type MaterialConsumptionRequest = {
  productionOrderId: string;
  orderStepSnapshotId?: string;
  inventoryItemId: string;
  lotNumber: string;
  quantity: number;
  unit: string;
};

export type MaterialConsumption = MaterialConsumptionRequest & {
  id: string;
  createdAt?: string;
};

export type ProductionAnalyticsFilters = {
  from?: string; to?: string; orderNumber?: string; productId?: string;
};

export type ProductionAnalytics = {
  averageCycleHours?: number;
  cycleHours?: number;
  completedQuantity?: number;
  rejectedQuantity?: number;
  throughput?: number;
  rejectionRate?: number;
  wastageQuantity?: number;
  wastageRate?: number;
  delayedOrderCount?: number;
  stepDurations?: ProductionStepDuration[];
  bottlenecks?: ProductionBottleneck[];
  materialConsumption?: ProductionMaterialConsumption[];
};

export type ProductionStepDuration = {
  stepId?: string; stepName?: string; durationHours?: number; averageDurationHours?: number;
};

export type ProductionBottleneck = {
  stepId?: string; stepName?: string; durationHours?: number; delayHours?: number;
};

export type ProductionMaterialConsumption = {
  inventoryItemId?: string; itemName?: string; quantity?: number; unit?: string; estimatedQuantity?: number;
};

export type ProductionOrderProgressFilters = {
  orderNumber?: string; customerId?: string; productId?: string;
};

export type ProductionOrderProgress = {
  orderId: string; orderNumber: string; customerId?: string; customerName?: string; productId: string;
  productName?: string; plannedQuantity: number; completedQuantity: number; rejectedQuantity: number;
  remainingQuantity: number; status: OrderStatus; dueDate?: string; delayed?: boolean;
};

export type ProductionNotificationEvent =
  | "ORDER_CREATED"
  | "STEP_STARTED"
  | "STEP_PAUSED"
  | "STEP_COMPLETED"
  | "QUALITY_FAILED"
  | "MATERIAL_SHORTAGE"
  | "MATERIAL_CONSUMPTION_FAILED"
  | "ORDER_DELAYED"
  | "ORDER_COMPLETED"
  | "ASSIGNMENT_CHANGED";

export type ProductionNotificationPreferences = {
  enabledEventTypes: ProductionNotificationEvent[];
};

export type AuditLogResponse = {
  id: string;
  productionOrderId: string;
  orderStepSnapshotId?: string;
  assignmentId?: string;
  eventType: AuditEventType;
  actorUserId?: string;
  occurredAt: string;
  details?: string;
};

export type MyAssignmentResponse = {
  assignmentId: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName?: string;
  stepId: string;
  stepName: string;
  deadline?: string;
  orderStatus: OrderStatus;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  remainingQuantity?: number;
  stepStatus?: StepExecutionStatus;
  executionVersion: number;
  stepExpectedVersion: number;
};
