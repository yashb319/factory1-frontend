"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRecordStepProductionMutation } from "../api/productionApi";
import { usePreviewProductionRecordMutation } from "../api/productionFlowApi";
import type { OrderStep, ProductionOrder } from "../types/production.types";
import type { RecordPreview, RecordPreviewRequest } from "../types/productionFlow.types";
import { productionFailure, productionFlowVersions } from "../utils/productionFlow";
import { materialCoverageLines, type MaterialAllocationDraft } from "../utils/materialAllocation";
import { parseProductionQuantity, productionQuantityUnits } from "../utils/productionQuantity";
import { useProductionReview } from "../utils/useProductionReview";
import { useMaterialSources } from "../utils/useMaterialSources";
import { MaterialAllocationEditor } from "./MaterialAllocationEditor";
import { ProductionMaterialPreview } from "./ProductionMaterialPreview";
import { ProductionPreviewBlockers } from "./ProductionPreviewBlockers";
import { ProductionReviewDialog } from "./ProductionReviewDialog";

export function ProductionFinalGoodForm({ order, step, disabled, onDone, onRefresh }: {
  order: ProductionOrder; step: OrderStep; disabled: boolean; onDone: () => void; onRefresh: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [coverage, setCoverage] = useState<MaterialAllocationDraft[]>([]);
  const materials = useMaterialSources(order);
  const [preview] = usePreviewProductionRecordMutation();
  const [record] = useRecordStepProductionMutation();
  const refresh = () => { onRefresh(); void materials.query.refetch(); };
  const control = useProductionReview<RecordPreviewRequest, RecordPreview, ProductionOrder>({
    order, step, action: "RECORD_GOOD", disabled: disabled || !materials.ready,
    draftKey: JSON.stringify({ quantity, notes, coverage }),
    preview: (body) => preview({ orderId: order.id, stepId: step.id, body }).unwrap(),
    commit: (body, source) => record({
      orderId: source.orderId, stepId: source.stepId,
      body: {
        completedQuantity: body.completedQuantity, rejectedQuantity: 0, notes: body.notes,
        materialCoverage: body.materialCoverage, previewToken: body.previewToken, requestId: body.requestId,
        expectedOrderVersion: body.expectedOrderVersion, expectedStepVersion: body.expectedStepVersion,
        expectedFamilyVersion: body.expectedFamilyVersion,
      },
    }).unwrap(),
    onRefresh: refresh,
    onDone: () => {
      toast.success("Final good recorded with reviewed material coverage. Advance or short-close the step separately.");
      setQuantity(""); setNotes(""); setCoverage([]);
      onDone();
      void materials.query.refetch();
    },
  });
  async function review() {
    try {
      const completedQuantity = parseProductionQuantity(quantity, { positive: true });
      if (step.remainingQuantity === undefined || productionQuantityUnits(completedQuantity) > productionQuantityUnits(step.remainingQuantity)) {
        throw new Error("Enter no more than the current step's unrecorded quantity.");
      }
      await control.requestReview({
        ...productionFlowVersions(order, step), completedQuantity, rejectedQuantity: 0,
        materialCoverage: materialCoverageLines(coverage, materials.sources),
        source: { type: "STEP_EXECUTION" }, action: "RECORD_GOOD",
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
    } catch (error) { control.setError(productionFailure(error)); }
  }
  const result = control.review?.preview;
  const creditMatches = Boolean(result && control.review &&
    result.finishedGoodCredit === control.review.body.completedQuantity);
  return <section className="space-y-3 rounded-md border p-3" aria-label="Record final good with material review">
    <h4 className="font-medium">Record final good</h4>
    <p className="text-sm text-muted-foreground">Review finished-good credit and exact material deductions before saving. Previously issued manual material can cover this output; automatic consumption already committed to other good cannot be reused.</p>
    {!materials.ready ? <div role="alert" className="text-sm text-amber-700">
      {materials.query.isFetching ? "Refreshing family material evidence..." : materials.query.isError ? productionFailure(materials.query.error) : "Material evidence and order versions do not match."}
      <Button type="button" size="sm" variant="link" disabled={materials.query.isFetching} onClick={refresh}>Refresh order and material evidence</Button>
    </div> : null}
    <fieldset disabled={control.busy} className="space-y-3">
      <label className="block text-sm">New good quantity<Input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <label className="block text-sm">Notes<Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <MaterialAllocationEditor drafts={coverage} onChange={setCoverage} sources={materials.sources} allowNewStock={false} disabled={!materials.ready || control.busy} />
      <p className="text-xs text-muted-foreground">Do not enter new-stock lines here. The server previews only the uncovered requirements of the saved BOM. Unallocated issued materials may require explicit coverage before output can be recorded.</p>
      {control.error && !control.review ? <p role="alert" className="text-sm text-destructive">{control.error}</p> : null}
      <Button type="button" disabled={!control.allowed || control.busy} onClick={() => void review()}>{control.busy ? "Preparing review..." : "Review final-good recording"}</Button>
    </fieldset>
    <ProductionReviewDialog
      open={Boolean(result)} title="Confirm final-good output and material effects"
      description="This records good output only. It does not advance the workflow or close the original request."
      busy={control.busy} stale={control.stale} uncertain={control.uncertain}
      disabled={!control.allowed || !creditMatches || Boolean(result?.blockingReasons.length)}
      error={control.error} onCancel={control.cancel} onConfirm={() => { if (creditMatches) void control.confirm(); }}
      onRetry={() => void control.confirm(true)} onRefresh={refresh}
    >
      {result ? <div className="space-y-3">
        <p className="break-all text-sm">{order.batch?.batchLabel ?? order.orderNumber} / {step.name} / order {result.sourceOrderId}</p>
        {control.review?.body.notes ? <p className="text-sm">Notes: {control.review.body.notes}</p> : null}
        <ProductionMaterialPreview preview={result} />
        <ProductionPreviewBlockers blockers={result.blockingReasons} />
        {!creditMatches ? <p role="alert" className="text-sm text-destructive">Finished-good credit does not match the entered quantity. Refresh and request a new review.</p> : null}
      </div> : null}
    </ProductionReviewDialog>
  </section>;
}
