"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRuntimePermissions } from "@/features/partner-saas/runtime/permissions";
import { useCreateExecutionBatchMutation, useGetExecutionBatchesQuery } from "../api/productionApi";
import { usePreviewProductionRecordMutation } from "../api/productionFlowApi";
import type { OrderStep, ProductionOrder } from "../types/production.types";
import type { RecordPreview, RecordPreviewRequest } from "../types/productionFlow.types";
import { productionFailure, productionFlowVersions } from "../utils/productionFlow";
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
  const step = order.steps.find((item) => item.id === order.currentStepId);
  const finalStep = step && !order.steps.some((item) => item.active && item.sequenceNumber > step.sequenceNumber);
  const writable = Boolean(step?.active && finalStep && order.quantityModel === "FLOW_V1" &&
    can("POST", path) && can("POST", `/api/production/orders/${order.id}/steps/${step.id}/record-preview`));
  if (!readable) return null;
  const refresh = () => { onRefresh(); void history.refetch(); };
  return <section className="space-y-4 rounded border p-4" aria-label="Contextual execution batches">
    <h2 className="font-semibold">Recorded output history</h2>
    <p className="text-sm">Only reviewed execution-batch recording is supported. No workflow advance, rejection disposition, manual material issue, assignment or order creation is enabled.</p>
    {history.isError ? <p role="alert">Execution batches could not be loaded. Refresh before recording output.</p> :
      history.isFetching ? <p role="status">Loading execution batches...</p> :
        history.currentData ? <ExecutionBatchHistory batches={history.currentData} /> : null}
    <Button variant="outline" disabled={refreshing || history.isFetching} onClick={refresh}>Refresh order and output history</Button>
    {writable && step ? <ExecutionBatchForm key={step.id} order={order} step={step}
      disabled={refreshing || failed || history.isFetching || history.isError || !history.currentData}
      onRefresh={refresh} /> :
      <p className="text-sm">Recording requires a current FLOW_V1 final step and explicit preview, create and history permissions. Other production operations remain unavailable.</p>}
  </section>;
}

function ExecutionBatchForm({ order, step, disabled, onRefresh }: {
  order: ProductionOrder; step: OrderStep; disabled: boolean; onRefresh: () => void;
}) {
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [preview] = usePreviewProductionRecordMutation();
  const [create] = useCreateExecutionBatchMutation();
  const control = useProductionReview<RecordPreviewRequest, RecordPreview, unknown>({
    order, step, action: "RECORD_GOOD", disabled,
    draftKey: JSON.stringify({ batchNumber, quantity, notes }),
    preview: (body) => preview({ orderId: order.id, stepId: step.id, body }).unwrap(),
    commit: (body, source) => {
      if (body.source.type !== "EXECUTION_BATCH") throw new Error("Execution-batch source is required.");
      return create({ orderId: source.orderId, body: {
        orderStepSnapshotId: source.stepId, batchNumber: body.source.batchNumber,
        completedQuantity: body.completedQuantity, rejectedQuantity: 0, notes: body.notes,
        expectedVersion: body.expectedOrderVersion, expectedStepVersion: body.expectedStepVersion,
        expectedFamilyVersion: body.expectedFamilyVersion, requestId: body.requestId,
        previewToken: body.previewToken, materialCoverage: body.materialCoverage,
      } }).unwrap();
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
  const creditMatches = Boolean(result && control.review && result.finishedGoodCredit === control.review.body.completedQuantity);
  return <section className="space-y-3" aria-label="Record contextual execution batch">
    <h3 className="font-medium">Record reviewed final-good batch</h3>
    <p className="text-sm">The server previews automatic deductions from the pinned BOM. Existing manual material coverage cannot be selected here; if it is required, resolve it through an authorized workflow instead of guessing inventory identifiers. Rejected quantity is fixed to zero.</p>
    <fieldset disabled={control.busy || control.uncertain} className="space-y-3">
      <label className="block">Batch number<Input value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} /></label>
      <label className="block">New good quantity<Input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <label className="block">Batch notes<Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {control.error && !control.review ? <p role="alert">{control.error}</p> : null}
      <Button disabled={!control.allowed || control.busy} onClick={() => void review()}>Review execution batch</Button>
    </fieldset>
    <ProductionReviewDialog open={Boolean(result)} title="Confirm reviewed execution batch"
      description="Review the exact final-good credit and material deductions. Saving does not advance or close this step."
      busy={control.busy} stale={control.stale} uncertain={control.uncertain}
      disabled={!control.allowed || !creditMatches || Boolean(result?.blockingReasons.length) || Boolean(result?.stockWarnings.length)}
      error={control.error} onCancel={control.cancel} onConfirm={() => { if (creditMatches) void control.confirm(); }}
      onRetry={() => void control.confirm(true)} onRefresh={onRefresh}>
      {result ? <div className="space-y-3">
        <p>{order.orderNumber} / {step.name} / batch {control.review?.body.source.type === "EXECUTION_BATCH" ? control.review.body.source.batchNumber : ""}</p>
        {control.review?.body.notes ? <p>Notes: {control.review.body.notes}</p> : null}
        <ProductionMaterialPreview preview={result} />
        <ProductionPreviewBlockers blockers={result.blockingReasons} />
        {result.stockWarnings.length ? <p role="alert">Resolve all stock warnings, refresh and request a new preview before recording this batch.</p> : null}
        {!creditMatches ? <p role="alert">Finished-good credit does not match the reviewed quantity. Cancel, refresh and request a new preview.</p> : null}
      </div> : null}
    </ProductionReviewDialog>
  </section>;
}
