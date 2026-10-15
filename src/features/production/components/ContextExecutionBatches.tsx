"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRuntimePermissions } from "@/features/partner-saas/runtime/permissions";
import { contextualBatchPreviewResultSchema, contextualExecutionBatchResultSchema,
  contextualExecutionBatchHistorySchema } from "@/features/partner-saas/runtime/executionBatchContracts";
import { useCreateExecutionBatchMutation, useGetExecutionBatchesQuery } from "../api/productionApi";
import { usePreviewProductionRecordMutation } from "../api/productionFlowApi";
import type { OrderStep, ProductionOrder } from "../types/production.types";
import type { RecordPreview, RecordPreviewRequest } from "../types/productionFlow.types";
import { productionActionBlock, productionFailure, productionFlowVersions } from "../utils/productionFlow";
import { parseProductionQuantity, productionQuantityUnits } from "../utils/productionQuantity";
import { useProductionReview } from "../utils/useProductionReview";
import { ExecutionBatchHistory } from "./ExecutionBatchHistory";
import { ProductionMaterialPreview } from "./ProductionMaterialPreview";
import { ProductionPreviewBlockers } from "./ProductionPreviewBlockers";
import { ProductionReviewDialog } from "./ProductionReviewDialog";

export function ContextExecutionBatches({ order, refreshing, failed, onRefresh }: {
  order: ProductionOrder; refreshing: boolean; failed: boolean; onRefresh: () => void;
}) {
  const { can } = useRuntimePermissions();
  const path = `/api/production/orders/${order.id}/execution-batches`;
  const readable = can("GET", path);
  const history = useGetExecutionBatchesQuery(order.id, { skip: !readable });
  const validHistory = contextualExecutionBatchHistorySchema.safeParse(history.currentData);
  const historyVerified = validHistory.success && validHistory.data.every((batch) => batch.productionOrderId === order.id);
  const step = order.steps.find((item) => item.id === order.currentStepId);
  const finalStep = step && !order.steps.some((item) => item.active && item.sequenceNumber > step.sequenceNumber);
  const writable = Boolean(step?.active && order.quantityModel === "FLOW_V1" &&
    can("POST", path) && can("POST", `/api/production/orders/${order.id}/steps/${step.id}/record-preview`));
  if (!readable) return null;
  const refresh = () => { onRefresh(); void history.refetch(); };
  return <section className="space-y-4 rounded border p-4" aria-label="Contextual execution batches">
    <h2 className="font-semibold">Recorded output history</h2>
    <p className="text-sm">Only reviewed execution-batch recording is supported. No workflow advance, rejection disposition, manual material issue, assignment or order creation is enabled.</p>
    {history.isError || (!history.isFetching && history.currentData && !historyVerified) ? <p role="alert">Execution batches could not be verified. Refresh before recording output.</p> :
      history.isFetching ? <p role="status">Loading execution batches...</p> :
        validHistory.success && historyVerified ? <ExecutionBatchHistory batches={validHistory.data} /> : null}
    <Button type="button" variant="outline" disabled={refreshing || history.isFetching} onClick={refresh}>Refresh order and output history</Button>
    {writable && step ? <ExecutionBatchForm key={step.id} order={order} step={step}
      finalStep={Boolean(finalStep)}
      disabled={refreshing || failed || history.isFetching || history.isError || !historyVerified}
      onRefresh={refresh} /> :
      <p className="text-sm">Recording requires an active current FLOW_V1 step and explicit preview, create and history permissions. Other production operations remain unavailable.</p>}
  </section>;
}

function ExecutionBatchForm({ order, step, finalStep, disabled, onRefresh }: {
  order: ProductionOrder; step: OrderStep; finalStep: boolean; disabled: boolean; onRefresh: () => void;
}) {
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [preview] = usePreviewProductionRecordMutation();
  const [create] = useCreateExecutionBatchMutation();
  const control = useProductionReview<RecordPreviewRequest, RecordPreview, unknown>({
    order, step, action: "RECORD_GOOD", disabled,
    draftKey: JSON.stringify({ batchNumber, quantity, notes, finalStep }),
    preview: async (body) => {
      const result = await preview({ orderId: order.id, stepId: step.id, body }).unwrap();
      const parsed = contextualBatchPreviewResultSchema.safeParse(result);
      if (!parsed.success) throw new Error("The material preview could not be verified. Refresh before recording output.");
      return parsed.data;
    },
    commit: async (body, source) => {
      if (body.source.type !== "EXECUTION_BATCH") throw new Error("Execution-batch source is required.");
      const result = await create({ orderId: source.orderId, body: {
        orderStepSnapshotId: source.stepId, batchNumber: body.source.batchNumber,
        completedQuantity: body.completedQuantity, rejectedQuantity: 0, notes: body.notes,
        expectedVersion: body.expectedOrderVersion, expectedStepVersion: body.expectedStepVersion,
        expectedFamilyVersion: body.expectedFamilyVersion, requestId: body.requestId,
        previewToken: body.previewToken, materialCoverage: body.materialCoverage,
      } }).unwrap();
      const parsed = contextualExecutionBatchResultSchema.safeParse(result);
      if (!parsed.success || parsed.data.productionOrderId !== source.orderId || parsed.data.orderStepSnapshotId !== source.stepId ||
          parsed.data.batchNumber !== body.source.batchNumber || parsed.data.completedQuantity !== body.completedQuantity ||
          parsed.data.rejectedQuantity !== 0) {
        throw new Error("The execution-batch result could not be verified. Inspect history before trying again.");
      }
      return parsed.data;
    },
    onRefresh,
    onDone: () => {
      setBatchNumber(""); setQuantity(""); setNotes("");
      toast.success("Reviewed execution batch recorded. Workflow advancement is a separate operation.");
      onRefresh();
    },
  });
  async function review() {
    try {
      if (!batchNumber.trim()) throw new Error("Enter a batch number.");
      const completedQuantity = parseProductionQuantity(quantity, { positive: true });
      if (step.remainingQuantity === undefined ||
          productionQuantityUnits(completedQuantity) > productionQuantityUnits(step.remainingQuantity)) {
        throw new Error("Enter no more than the current step's unrecorded quantity.");
      }
      await control.requestReview({
        ...productionFlowVersions(order, step), completedQuantity, rejectedQuantity: 0, materialCoverage: [],
        source: { type: "EXECUTION_BATCH", batchNumber: batchNumber.trim() }, action: "RECORD_GOOD",
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    } catch (error) { control.setError(productionFailure(error)); }
  }
  const result = control.review?.preview;
  const effectsMatch = Boolean(result && control.review &&
    result.finishedGoodCredit === (finalStep ? control.review.body.completedQuantity : 0) &&
    (finalStep || result.items.length === 0));
  return <section className="space-y-3" aria-label="Record contextual execution batch">
    <h3 className="font-medium">Record reviewed execution batch</h3>
    <p className="text-sm">{finalStep
      ? "This final step previews finished-good credit and automatic deductions from the pinned BOM. Existing manual material coverage cannot be selected here; if required, resolve it through an authorized workflow instead of guessing inventory identifiers."
      : "This intermediate step records good quantity only, without material deductions or finished-good credit. Recording does not advance the step."} Rejected quantity is fixed to zero.</p>
    {!control.allowed && !disabled ? <p role="alert">{productionActionBlock(order, "RECORD_GOOD")}</p> : null}
    <fieldset disabled={control.busy || control.uncertain} className="space-y-3">
      <label className="block">Batch number<Input value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} /></label>
      <label className="block">New good quantity<Input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <label className="block">Batch notes<Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {control.error && !control.review ? <p role="alert">{control.error}</p> : null}
      <Button type="button" disabled={!control.allowed || control.busy || control.uncertain} onClick={() => void review()}>Review execution batch</Button>
    </fieldset>
    <ProductionReviewDialog open={Boolean(result)} title="Confirm reviewed execution batch"
      description={finalStep ? "Review the exact final-good credit and material deductions. Saving does not advance or close this step." :
        "Review intermediate-step good quantity with no inventory effects. Saving does not advance or close this step."}
      busy={control.busy} stale={control.stale} uncertain={control.uncertain}
      disabled={!control.allowed || !effectsMatch || Boolean(result?.blockingReasons.length) || Boolean(result?.stockWarnings.length)}
      error={control.error} onCancel={control.cancel} onConfirm={() => { if (effectsMatch) void control.confirm(); }}
      onRetry={() => void control.confirm(true)} onRefresh={onRefresh}>
      {result ? <div className="space-y-3">
        <p>{order.orderNumber} / {step.name} / batch {control.review?.body.source.type === "EXECUTION_BATCH" ? control.review.body.source.batchNumber : ""}</p>
        <p>New good quantity: {control.review?.body.completedQuantity}</p>
        {control.review?.body.notes ? <p>Notes: {control.review.body.notes}</p> : null}
        <ProductionMaterialPreview preview={result} />
        <ProductionPreviewBlockers blockers={result.blockingReasons} />
        {result.stockWarnings.length ? <p role="alert">Resolve all stock warnings, refresh and request a new preview before recording this batch.</p> : null}
        {!effectsMatch ? <p role="alert">Inventory effects do not match the reviewed current-step recording. Cancel, refresh and request a new preview.</p> : null}
      </div> : null}
    </ProductionReviewDialog>
  </section>;
}
