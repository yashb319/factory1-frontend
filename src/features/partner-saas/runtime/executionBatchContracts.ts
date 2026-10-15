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
