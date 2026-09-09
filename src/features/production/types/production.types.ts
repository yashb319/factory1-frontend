export type ApiResponse<T> = { success: boolean; message: string; data: T };
export type PageResponse<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number };

export type WorkflowStepRequest = {
  name: string; code: string; sequenceNumber: number; description?: string;
  workstation?: string; roleMetadata?: string; active?: boolean;
};
export type WorkflowRequest = { code: string; name: string; description?: string; steps: WorkflowStepRequest[] };
export type WorkflowTemplate = { id: string; code: string; name: string; description?: string; active: boolean };
export type WorkflowStep = WorkflowStepRequest & { id: string };
export type WorkflowVersion = {
  id: string; templateId: string; versionNumber: number;
  status: "DRAFT" | "PUBLISHED"; publishedAt?: string; steps: WorkflowStep[];
};

export type BomItemRequest = { inventoryItemId: string; quantityPerUnit: number; unit: string; wastePercentage?: number };
export type BomRequest = { productId: string; name: string; items: BomItemRequest[] };
export type Bom = {
  id: string; productId: string; versionNumber: number; name: string;
  status: "DRAFT" | "PUBLISHED"; publishedAt?: string;
  items: (BomItemRequest & { id: string })[];
};

export type OrderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type OrderStatus = "PLANNED" | "RELEASED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "PARTIALLY_COMPLETED" | "CANCELLED";
export type ProductionOrderRequest = {
  orderNumber: string; customerId?: string; sourceOrderId?: string; productId: string;
  plannedQuantity: number; priority: OrderPriority; dueDate?: string;
  workflowVersionId: string; notes?: string;
};
export type OrderStep = { id: string; name: string; code: string; sequenceNumber: number; workstation?: string; roleMetadata?: string; active: boolean };
export type ProductionOrder = ProductionOrderRequest & {
  id: string; completedQuantity: number; rejectedQuantity: number; remainingQuantity: number;
  workflowVersionNumber: number; currentStepId?: string; status: OrderStatus; steps: OrderStep[];
};
export type StepActionRequest = { completedQuantity?: number; rejectedQuantity?: number; notes?: string };
export type TimelineEvent = {
  id: string; stepId: string; action: "STARTED" | "PAUSED" | "COMPLETED";
  completedQuantity: number; rejectedQuantity: number; notes?: string; actorUserId: string; occurredAt: string;
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
