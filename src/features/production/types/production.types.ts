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
