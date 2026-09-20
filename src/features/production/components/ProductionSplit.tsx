"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePreviewProductionSplitMutation, useSplitProductionOrderMutation } from "../api/productionFlowApi";
import type { OrderStep, ProductionOrder } from "../types/production.types";
import type { ChildAllocation, SplitPreview, SplitPreviewRequest, SplitResult } from "../types/productionFlow.types";
import { canProductionAction, productionActionBlock, productionFailure, productionFlowVersions } from "../utils/productionFlow";
import { formatProductionQuantity, parseProductionQuantity, productionQuantityUnits } from "../utils/productionQuantity";
import { useProductionReview } from "../utils/useProductionReview";
import { ProductionReviewDialog } from "./ProductionReviewDialog";
import { ProductionPreviewBlockers } from "./ProductionPreviewBlockers";

export function ProductionSplit({ order, step, disabled, onSelect, onRefresh }: {
  order: ProductionOrder; step: OrderStep; disabled: boolean;
  onSelect: (id: string) => void; onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [preview] = usePreviewProductionSplitMutation();
  const [split] = useSplitProductionOrderMutation();
  const control = useProductionReview<SplitPreviewRequest, SplitPreview, SplitResult>({
    order, step, action: "SPLIT_ADVANCE", draftKey: JSON.stringify({ quantity, reason }), disabled,
    preview: (body) => preview({ orderId: order.id, body }).unwrap(),
    commit: (body, source) => split({ orderId: source.orderId, body }).unwrap(),
    onRefresh,
    onDone: (result) => {
      toast.success(`Split saved. ${result.readyChild.batch?.batchLabel ?? result.readyChild.orderNumber} advanced; ${result.waitingChild.batch?.batchLabel ?? result.waitingChild.orderNumber} remains at this step.`);
      setOpen(false);
      onRefresh();
      onSelect(result.readyChild.id);
    },
  });
  async function review() {
    try {
      const readyQuantity = parseProductionQuantity(quantity, { positive: true });
      const good = step.goodQuantity ?? step.completedQuantity;
      if (good === undefined || productionQuantityUnits(readyQuantity) > productionQuantityUnits(good)) {
        throw new Error("Ready quantity cannot exceed good output already recorded at this step.");
      }
      if (!reason.trim()) throw new Error("Explain why the ready pieces should split and advance.");
      setAcknowledged(false);
      await control.requestReview({ ...productionFlowVersions(order, step), readyQuantity, reason: reason.trim(), acknowledgeInheritedEvidence: true });
    } catch (error) { control.setError(productionFailure(error)); }
  }
  const result = control.review?.preview;
  const completeProjection = Boolean(result?.ready && result.waiting && result.assignmentEffects && result.qualityEvidence);
  const eligible = canProductionAction(order, "SPLIT_ADVANCE");
  return <>
    <div className="space-y-1">
      <Button type="button" variant="outline" disabled={disabled || !eligible} onClick={() => setOpen(true)}>Split ready pieces and advance</Button>
      {!eligible ? <p className="text-xs text-muted-foreground">{productionActionBlock(order, "SPLIT_ADVANCE")}</p> : null}
    </div>
    <Dialog open={open} onOpenChange={(next) => { if (!control.busy) { setOpen(next); if (!next) control.cancel(); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Split ready pieces and advance</DialogTitle><DialogDescription>One confirmed action creates ready and waiting child batches. Only already-recorded good moves forward; scanning or previewing does not change production.</DialogDescription></DialogHeader>
        <p className="text-sm">{order.batch?.batchLabel ?? order.orderNumber} / {step.name}. Recorded good: {formatProductionQuantity(step.goodQuantity ?? step.completedQuantity)}.</p>
        <p className="text-sm">Original target remains {formatProductionQuantity(order.quantities?.originalPlannedQuantity ?? order.plannedQuantity)}.</p>
        {order.quantityModel === "LEGACY" ? <p role="status" className="text-sm text-amber-700">This explicitly adopts eligible legacy progress into quantity flow. The target is captured at adoption; earlier unknown history is not rewritten.</p> : null}
        <fieldset disabled={control.busy} className="space-y-3">
          <label className="block text-sm">Ready quantity<Input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label className="block text-sm">Reason (required)<Textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <p className="text-xs text-muted-foreground">The waiting child keeps its current step. The ready child advances to the next active step, or completes if already at the final step. No stock is posted again.</p>
          {control.error && !control.review ? <p role="alert" className="text-sm text-destructive">{control.error}</p> : null}
          <Button type="button" disabled={!control.allowed || control.busy} onClick={() => void review()}>{control.busy ? "Preparing review..." : "Review split allocation"}</Button>
        </fieldset>
      </DialogContent>
    </Dialog>
    <ProductionReviewDialog
      open={Boolean(result)} title="Confirm split and ready-child advancement"
      description="This is one atomic action, not a recording followed by a separate advance. Review both allocations and inherited evidence."
      busy={control.busy} stale={control.stale} uncertain={control.uncertain}
      disabled={!control.allowed || !acknowledged || !completeProjection || Boolean(result?.blockingReasons.length) || Boolean(result?.inventoryEffects.length)}
      error={control.error} onCancel={control.cancel} onConfirm={() => { if (acknowledged && completeProjection && !result?.inventoryEffects.length) void control.confirm(); }}
      onRetry={() => void control.confirm(true)} onRefresh={onRefresh}
    >
      {result ? <div className="space-y-3 text-sm">
        <p className="break-all">Source: {order.batch?.batchLabel ?? order.orderNumber} ({result.sourceOrderId}) / step {step.name}.</p>
        <p>Workflow v{order.workflowVersionNumber}; saved BOM {order.bomId ?? "unknown"}{order.bomVersionNumber == null ? "" : ` v${order.bomVersionNumber}`}. Existing pins and historical uncertainty are retained.</p>
        <ProductionPreviewBlockers blockers={result.blockingReasons} />
        {!result.blockingReasons.length && !completeProjection ? <p role="alert" className="text-destructive">The preview is missing allocation or inherited evidence. This action is blocked; refresh and request a complete preview.</p> : null}
        {result.ready && result.waiting ? <div className="grid gap-3 sm:grid-cols-2"><Allocation allocation={result.ready} label="Ready child" /><Allocation allocation={result.waiting} label="Waiting child" /></div> : null}
        <p className="font-medium">Original target: {formatProductionQuantity(order.quantities?.originalPlannedQuantity ?? order.plannedQuantity)}. New output / stock changes: none.</p>
        {result.assignmentEffects ? <div><h4 className="font-medium">Assignment changes</h4>{result.assignmentEffects.length ? result.assignmentEffects.map((effect, index) => <p key={`${effect.assignmentId}:${index}`} className="break-all">{effect.effect} / {effect.targetRole ?? "source history"}: {effect.assigneeUserId ?? effect.vendorId ?? effect.assignmentId}{effect.deadline ? ` / deadline ${effect.deadline}` : ""}</p>) : <p>No inherited current-step assignments.</p>}
          <p className="text-xs text-muted-foreground">Ready next-step work requires explicit assignment. Order-wide and future assignments are not duplicated.</p>
        </div> : null}
        {result.qualityEvidence ? <div><h4 className="font-medium">Inherited quality evidence</h4>{result.qualityEvidence.length ? result.qualityEvidence.map((evidence) => <p key={evidence.resultId} className="break-all">{evidence.passed ? "PASS" : "FAIL"} / {evidence.scope} / source {evidence.sourceOrderId} / result {evidence.resultId}</p>) : <p>No inherited quality results reported.</p>}</div> : null}
        {result.inventoryEffects.length ? <p role="alert" className="text-destructive">Unexpected stock effects in split preview. This action is blocked; refresh and contact a production lead.</p> : null}
        <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledged} disabled={control.busy || !completeProjection || Boolean(result.blockingReasons.length)} onChange={(event) => setAcknowledged(event.target.checked)} /><span>I reviewed both allocations, retained definitions, assignment changes and the applicability of inherited quality evidence to the ready pieces.</span></label>
      </div> : null}
    </ProductionReviewDialog>
  </>;
}

function Allocation({ allocation, label }: { allocation: ChildAllocation; label: string }) {
  return <div className="space-y-1 rounded-md border p-3">
    <h4 className="font-semibold">{label}: {formatProductionQuantity(allocation.allocatedQuantity)}</h4>
    <p>{allocation.isTerminal ? "Completes with existing final-good credit" : allocation.role === "READY" ? `Advances to ${allocation.nextStep?.name ?? "server-selected next active step"}` : `Remains at ${allocation.currentStep?.name ?? "current step"}`}</p>
    <p>Good: {formatProductionQuantity(allocation.goodQuantity)} / remaining: {formatProductionQuantity(allocation.remainingQuantity)}</p>
    <p>Inherited scrap: {formatProductionQuantity(allocation.scrapQuantity)} / cancelled: {formatProductionQuantity(allocation.cancelledQuantity)}</p>
    <p>Existing final-good credit: {formatProductionQuantity(allocation.finalGoodQuantity)}</p>
    <p className="text-xs text-muted-foreground">Stable child ID and label are assigned only after confirmation.</p>
  </div>;
}
