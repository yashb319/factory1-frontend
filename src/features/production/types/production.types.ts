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
export type StepExecutionAction = "START" | "PAUSE" | "COMPLETE" | "HOLD";
export type ProductionIndicatorType =
  | "DELAYED"
  | "WORKLOAD"
  | "QUALITY_FAILURE"
  | "SHORTAGE"
  | "CONFLICT"
  | "INFO";
export type ProductionIndicatorSeverity = "info" | "warning" | "critical";
export type StationStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type QualityResultStatus = "PASS" | "FAIL" | "HOLD";
export type QualityChecklistItemDisposition =
  | "PASS"
  | "FAIL"
  | "HOLD"
  | "NOT_APPLICABLE";
export type QualityChecklistItemInputType = "BOOLEAN" | "TEXT" | "NUMBER";

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

export type ProductionAssignmentRequest = {
  stationId?: string;
  workstationId?: string;
  assigneeLabel?: string;
  notes?: string;
  batchSize?: number;
};

export type ProductionAssignment = ProductionAssignmentRequest & {
  id?: string;
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

export type ProductionStationWorkload = {
  stationId: string;
  stationName: string;
  queuedOrders: number;
  activeOrders: number;
  delayedOrders: number;
  qualityHolds: number;
  capacityUtilization?: number;
};

export type ProductionWorkstation = {
  id: string;
  stationId: string;
  code: string;
  name: string;
  description?: string;
  status?: StationStatus;
  active: boolean;
  capacityPerHour?: number;
  queueLimit?: number;
  currentOrderId?: string;
  currentStepId?: string;
  indicators?: ProductionIndicator[];
};

export type ProductionStation = {
  id: string;
  code: string;
  name: string;
  description?: string;
  status?: StationStatus;
  active: boolean;
  capacityPerShift?: number;
  workload?: ProductionStationWorkload;
  indicators?: ProductionIndicator[];
  workstations: ProductionWorkstation[];
};

export type ProductionStationRequest = {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  status?: StationStatus;
  capacityPerShift?: number;
};

export type ProductionWorkstationRequest = {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
  status?: StationStatus;
  capacityPerHour?: number;
  queueLimit?: number;
};

export type ProductionDashboard = {
  activeOrders: number;
  plannedOrders: number;
  inProgressOrders: number;
  onHoldOrders: number;
  completedToday: number;
  delayedOrders: number;
  qualityPassRate: number;
  shortageAlerts: number;
  averageCompletionPercent?: number;
  stationUtilizationPercent?: number;
  workloadByStation?: ProductionStationWorkload[];
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
  indicators?: ProductionIndicator[];
};

export type ProductionBoardColumn = {
  key: string;
  label: string;
  items: ProductionBoardItem[];
};

export type ProductionBoardQuery = {
  search?: string;
  status?: OrderStatus;
  stationId?: string;
  workstationId?: string;
  page?: number;
  size?: number;
};

export type ProductionExecutionBoard = {
  columns: ProductionBoardColumn[];
  generatedAt?: string;
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

export type MaterialLot = {
  id: string;
  inventoryItemId: string;
  lotCode: string;
  itemCode?: string;
  itemName?: string;
  availableQuantity: number;
  reservedQuantity?: number;
  unit: string;
  expiryDate?: string;
  receivedAt?: string;
  supplierName?: string;
};

export type MaterialLotQuery = {
  inventoryItemId: string;
  stationId?: string;
  search?: string;
};

export type MaterialLotConsumptionRequest = {
  inventoryItemId: string;
  lotId: string;
  quantity: number;
  unit?: string;
  notes?: string;
};

export type QualityChecklistItemRequest = {
  label: string;
  description?: string;
  sequenceNumber: number;
  required?: boolean;
  inputType?: QualityChecklistItemInputType;
  targetValue?: string;
};

export type QualityChecklistItem = QualityChecklistItemRequest & {
  id: string;
};

export type QualityChecklistTemplateRequest = {
  name: string;
  description?: string;
  workflowStepCode?: string;
  stationId?: string;
  active?: boolean;
  items: QualityChecklistItemRequest[];
};

export type QualityChecklistTemplate = Omit<
  QualityChecklistTemplateRequest,
  "items"
> & {
  id: string;
  versionNumber?: number;
  items: QualityChecklistItem[];
};

export type QualityChecklistResultItemRequest = {
  checklistItemId?: string;
  label: string;
  disposition: QualityChecklistItemDisposition;
  measuredValue?: string;
  notes?: string;
};

export type QualityChecklistResultItem = QualityChecklistResultItemRequest & {
  id?: string;
};

export type QualityChecklistResultRequest = {
  templateId?: string;
  overallStatus: QualityResultStatus;
  notes?: string;
  items: QualityChecklistResultItemRequest[];
};

export type QualityChecklistResult = QualityChecklistResultRequest & {
  id: string;
  orderId: string;
  stepId: string;
  createdAt: string;
  actorUserId: string;
};

export type OrderExecutionStep = {
  stepId: string;
  stepName: string;
  stepCode: string;
  sequenceNumber: number;
  status: StepExecutionStatus;
  expectedVersion?: number;
  startedAt?: string;
  updatedAt?: string;
  completedQuantity: number;
  rejectedQuantity: number;
  holdQuantity: number;
  availableQuantity?: number;
  inProgressQuantity?: number;
  assignment?: ProductionAssignment;
  indicators?: ProductionIndicator[];
  requiredMaterials?: MaterialRequirement[];
  latestQualityResult?: QualityChecklistResult;
};

export type OrderExecutionDetails = {
  orderId: string;
  orderVersion?: number;
  executionVersion?: number;
  activeStepId?: string;
  orderIndicators?: ProductionIndicator[];
  steps: OrderExecutionStep[];
};

export type StepExecutionRequest = {
  action: StepExecutionAction;
  completedQuantity?: number;
  rejectedQuantity?: number;
  holdQuantity?: number;
  notes?: string;
  expectedOrderVersion?: number;
  expectedStepVersion?: number;
  stationId?: string;
  workstationId?: string;
  assigneeLabel?: string;
  materialLots?: MaterialLotConsumptionRequest[];
  qualityResult?: QualityChecklistResultRequest;
};

export type ProductionExecutionConflict = {
  code?: string;
  message: string;
  currentOrderVersion?: number;
  currentStepVersion?: number;
  latestOrder?: ProductionOrder;
  latestExecution?: OrderExecutionDetails;
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
  assigneeUserId: string;
};

export type OrderAssignment = OrderAssignmentRequest & {
  id: string;
  createdAt?: string;
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

export type QualityTemplateRequest = {
  code: string;
  name: string;
  description?: string;
  workflowVersionId?: string;
  productId?: string;
  stepCode?: string;
  checks: QualityTemplateCheckRequest[];
};

export type QualityTemplate = QualityTemplateRequest & {
  id: string;
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

export type StepExecutionResponse = {
  order?: ProductionOrder;
  execution?: OrderExecutionDetails;
  conflict?: ProductionExecutionConflict;
  message?: string;
};
