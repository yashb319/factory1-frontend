import { z } from "zod";

const version = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const quantity = z.number().nonnegative().max(999_999_999_999.999).refine(
  (value) => /^\d+(?:\.\d{1,3})?$/.test(String(value)),
  "Quantity must have at most three decimal places",
);
const batchNumber = z.string().refine((value) => value.trim().length > 0, "Batch number is required");
const materialCoverage = z.array(z.object({
  consumptionId: z.uuid(), inventoryItemId: z.uuid(), quantity, unit: z.string().min(1),
}).strict());
const common = {
  completedQuantity: quantity.refine((value) => value > 0),
  rejectedQuantity: z.literal(0), materialCoverage, notes: z.string().optional(),
  expectedStepVersion: version, expectedFamilyVersion: version,
};

export const contextualBatchPreviewSchema = z.object({
  ...common, expectedOrderVersion: version,
  source: z.object({ type: z.literal("EXECUTION_BATCH"), batchNumber }).strict(),
  action: z.literal("RECORD_GOOD"),
}).strict();

export const contextualExecutionBatchSchema = z.object({
  ...common, orderStepSnapshotId: z.uuid(), batchNumber, expectedVersion: version,
  requestId: z.uuid(), previewToken: z.string().min(1),
}).strict();

const materialLabel = { itemCode: z.string().nullable().optional(), itemName: z.string().nullable().optional() };
export const contextualBatchPreviewResultSchema = z.object({
  previewToken: z.string(), action: z.literal("RECORD_GOOD"), sourceOrderId: z.uuid(), sourceStepId: z.uuid(),
  expectedOrderVersion: version, expectedStepVersion: version, expectedFamilyVersion: version,
  blockingReasons: z.array(z.object({ code: z.string(), message: z.string(), remediation: z.string().nullable() })),
  finishedGoodCredit: quantity, stockWarnings: z.array(z.string()),
  items: z.array(z.object({
    ...materialLabel, inventoryItemId: z.uuid(), requiredQuantity: quantity, coveredQuantity: quantity,
    newStockDebitQuantity: quantity, unit: z.string(),
    coverageSources: z.array(z.object({
      ...materialLabel, consumptionId: z.uuid(), inventoryItemId: z.uuid(), quantity, unit: z.string(),
    })),
  })),
});

export const contextualExecutionBatchResultSchema = z.object({
  id: z.uuid(), productionOrderId: z.uuid(), orderStepSnapshotId: z.uuid(), batchNumber,
  completedQuantity: quantity, rejectedQuantity: quantity, notes: z.string().nullable().optional(),
  occurredAt: z.string().optional(), createdAt: z.string().optional(),
});
export const contextualExecutionBatchHistorySchema = z.array(contextualExecutionBatchResultSchema);
