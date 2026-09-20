import type { ProductionOrder } from "./production.types";

export type ProductionFlowAction =
  | "START" | "PAUSE" | "RECORD_GOOD" | "ADVANCE" | "SPLIT_ADVANCE" | "SHORT_CLOSE"
  | "EDIT" | "ASSIGN" | "RECORD_QUALITY" | "CONSUME_MATERIAL" | "BIND_BOM" | "CANCEL";

export type ProductionActionBlock = {
  action: ProductionFlowAction;
  code: string;
  message: string;
  remediation?: string;
};

export type ProductionBatchIdentity = {
  rootOrderId: string;
  parentOrderId: string | null;
  childSequence: number | null;
  batchLabel: string;
  nodeType: "LEAF" | "SUMMARY";
  isExecutable: boolean;
  isTerminal: boolean;
  closureOutcome: "NONE" | "FULL" | "SHORT" | "CANCELLED";
  familyVersion: number;
};

export type ProductionQuantities = {
  originalPlannedQuantity: number;
  targetBasis: "CREATED" | "CAPTURED_AT_ADOPTION" | "LEGACY_CURRENT";
  allocatedQuantity: number;
  finalGoodQuantity: number;
  scrapQuantity: number;
  cancelledQuantity: number;
  pendingQuantity: number | null;
  legacyUnclassifiedQuantity: number;
  reconciliationComplete: boolean;
};

export type ProductionCapabilities = {
  allowedActions: ProductionFlowAction[];
  blockedActions: ProductionActionBlock[];
};

export type ProductionFlowMetadata = {
  quantityModel?: "LEGACY" | "FLOW_V1";
  batch?: ProductionBatchIdentity;
  quantities?: ProductionQuantities;
  capabilities?: ProductionCapabilities;
};

export type FlowVersions = {
  expectedOrderVersion: number;
  expectedStepVersion: number;
  expectedFamilyVersion: number;
};
export type ProductionOrderGuard = {
  expectedOrderVersion?: number;
  expectedFamilyVersion?: number;
};

export type MaterialCoverage = {
  consumptionId: string;
  inventoryItemId: string;
  quantity: number;
  unit: string;
};

export type ProductionDisposition = {
  type: "SCRAP" | "CANCEL_UNPRODUCED";
  quantity: number;
  reason: string;
  source: { kind: "NEW_UNRECORDED" } | {
    kind: "EXISTING_REJECTION";
    sourceType: "STEP_EXECUTION" | "EXECUTION_BATCH";
    sourceId: string;
  };
  materialWaste?: MaterialWaste[];
  noMaterialWasteReason?: string;
  neverProducedAttestation?: boolean;
};

export type MaterialWaste =
  | { source: "NEW_STOCK"; inventoryItemId: string; quantity: number; unit: string; lotNumber: string }
  | { source: "EXISTING_CONSUMPTION"; consumptionId: string; inventoryItemId: string; quantity: number; unit: string };

export type SplitPreviewRequest = FlowVersions & {
  readyQuantity: number;
  reason: string;
  acknowledgeInheritedEvidence: true;
};
export type SplitRequest = SplitPreviewRequest & {
  requestId: string;
  previewToken: string;
  reason: string;
  acknowledgeInheritedEvidence: true;
};
export type ShortClosePreviewRequest = FlowVersions & {
  reason: string;
  dispositions: ProductionDisposition[];
};
export type ShortCloseRequest = ShortClosePreviewRequest & { requestId: string; previewToken: string };
export type RecordPreviewRequest = FlowVersions & {
  completedQuantity: number;
  rejectedQuantity: 0;
  materialCoverage: MaterialCoverage[];
  source: { type: "STEP_EXECUTION" } | { type: "EXECUTION_BATCH"; batchNumber: string };
  action?: string;
  notes?: string;
};

export type MaterialAvailabilityItem = {
  consumptionId: string;
  rootOrderId: string;
  productionOrderId: string;
  sourceOrderId: string;
  source: "MANUAL" | "AUTOMATIC";
  inventoryItemId: string;
  lotNumber: string | null;
  unit: string;
  originalQuantity: number;
  goodCoveredQuantity: number;
  scrapAllocatedQuantity: number;
  remainingAllocatableQuantity: number;
};

export type MaterialRequirementPreview = {
  inventoryItemId: string;
  requiredQuantity: number;
  coveredQuantity: number;
  newStockDebitQuantity: number;
  unit: string;
  coverageSources: MaterialCoverage[];
};
export type ProductionMaterialPreview = {
  items: MaterialRequirementPreview[];
  finishedGoodCredit: number;
  stockWarnings: string[];
};
export type WasteInventoryEffect = {
  source: "NEW_STOCK" | "EXISTING_CONSUMPTION";
  consumptionId: string | null;
  inventoryItemId: string;
  lotNumber: string | null;
  quantity: number;
  unit: string;
  purpose: "SCRAP";
  newStockDebitQuantity: number;
  stockBefore: number | null;
  stockAfter: number | null;
  finishedGoodCredit: number;
};

export type ProductionFamily = {
  rootOrderId: string;
  familyVersion: number;
  totals: ProductionQuantities;
  nodes: ProductionOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type MaterialAvailability = {
  rootOrderId: string;
  familyVersion: number;
  items: MaterialAvailabilityItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type MaterialAvailabilityEvidence = Pick<MaterialAvailability, "rootOrderId" | "familyVersion" | "items">;

export type FlowBlocker = { code: string; message: string; remediation: string | null };
export type StepReference = { sourceStepId: string; name: string; code: string; sequenceNumber: number };
export type ChildAllocation = {
  role: string;
  allocatedQuantity: number;
  goodQuantity: number;
  remainingQuantity: number;
  scrapQuantity: number;
  cancelledQuantity: number;
  finalGoodQuantity: number;
  currentStep: StepReference | null;
  nextStep: StepReference | null;
  isTerminal: boolean;
};
export type AssignmentEffect = {
  assignmentId: string;
  effect: string;
  targetRole: string | null;
  assigneeUserId: string | null;
  vendorId: string | null;
  sourceStepId: string | null;
  deadline: string | null;
};
export type QualityEvidence = {
  resultId: string;
  sourceOrderId: string;
  sourceStepId: string;
  definitionId: string;
  passed: boolean;
  scope: string;
};
export type InventoryEffect = Omit<WasteInventoryEffect, "source" | "purpose"> & { source: string; purpose: string };
export type FlowPreview = FlowVersions & {
  previewToken: string;
  action: string;
  sourceOrderId: string;
  sourceStepId: string;
  blockingReasons: FlowBlocker[];
};
export type SplitPreview = FlowPreview & {
  readyQuantity: number;
  waitingQuantity: number;
  ready?: ChildAllocation | null;
  waiting?: ChildAllocation | null;
  assignmentEffects?: AssignmentEffect[];
  qualityEvidence?: QualityEvidence[];
  requiresEvidenceAcknowledgement: boolean;
  inventoryEffects: InventoryEffect[];
};
export type SplitResult = {
  operationId: string;
  requestId: string;
  action: "SPLIT_ADVANCE";
  familyVersion: number;
  sourceOrder: ProductionOrder;
  readyChild: ProductionOrder;
  waitingChild: ProductionOrder;
  totals: ProductionQuantities;
  inventoryEffects: InventoryEffect[];
};
export type StepOutcome = {
  inputQuantity: number;
  goodQuantity: number;
  scrapQuantity: number;
  cancelledQuantity: number;
  legacyUnclassifiedQuantity: number;
  remainingQuantity: number;
  nextStep: StepReference | null;
  nextStepInputQuantity: number;
  isTerminal: boolean;
  closureOutcome: ProductionBatchIdentity["closureOutcome"];
};
export type ShortClosePreview = FlowPreview & {
  before?: StepOutcome | null;
  after?: StepOutcome | null;
  totals?: ProductionQuantities | null;
  dispositions?: ProductionDisposition[];
  inventoryEffects?: InventoryEffect[];
  materialIssueWarnings?: string[];
};
export type ShortCloseResult = {
  operationId: string;
  requestId: string;
  action: "SHORT_CLOSE";
  familyVersion: number;
  order: ProductionOrder;
  totals: ProductionQuantities;
  inventoryEffects: InventoryEffect[];
};
export type RecordPreview = FlowPreview & ProductionMaterialPreview;
