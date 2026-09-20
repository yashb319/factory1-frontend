"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAppSelector } from "@/lib/hook";
import {
  usePreviewProductionShortCloseMutation, useShortCloseProductionOrderMutation,
} from "../api/productionFlowApi";
import type { OrderStep, ProductionOrder } from "../types/production.types";
import type {
  ShortClosePreview, ShortClosePreviewRequest, ShortCloseResult, StepOutcome,
} from "../types/productionFlow.types";
import { productionDispositions, type DispositionDraft } from "../utils/materialAllocation";
import { canProductionAction, productionActionBlock, productionFailure, productionFlowVersions, sameFlowVersions } from "../utils/productionFlow";
import { formatProductionQuantity } from "../utils/productionQuantity";
import { useMaterialSources } from "../utils/useMaterialSources";
import { useProductionReview } from "../utils/useProductionReview";
import { MaterialAllocationEditor } from "./MaterialAllocationEditor";
import { ProductionWasteEffects } from "./ProductionMaterialPreview";
import { ProductionPreviewBlockers } from "./ProductionPreviewBlockers";
import { ProductionQuantitySummary } from "./ProductionQuantitySummary";
import { ProductionReviewDialog } from "./ProductionReviewDialog";

type Props = {
  order: ProductionOrder;
  step: OrderStep;
  disabled: boolean;
  onDone: () => void;
  onRefresh: () => void;
  rejectionSources?: { sourceType: "STEP_EXECUTION" | "EXECUTION_BATCH"; sourceId: string; quantity: number }[];
};

function newDisposition(): DispositionDraft {
  return {
    key: crypto.randomUUID(), type: "SCRAP", quantity: "", reason: "",
    sourceKind: "NEW_UNRECORDED", sourceType: "STEP_EXECUTION", sourceId: "",
    neverProducedAttestation: false, noMaterialWasteReason: "", materials: [],
  };
}

function AdoptionNotice({ order }: { order: ProductionOrder }) {
  return <div className="space-y-1 rounded-md border p-3 text-sm">
    {order.quantityModel !== "FLOW_V1" ? <p>
      This legacy batch will adopt quantity flow for future work. Its current target will be
      captured at adoption ({formatProductionQuantity(order.plannedQuantity)} pieces), not reconstructed as an original historical target. Existing
      rejections require explicit classification; earlier material use is not inferred.
    </p> : null}
    {order.quantities?.targetBasis === "CAPTURED_AT_ADOPTION" ? <p>
      This batch uses the target captured at adoption, not a reconstructed historical target.
    </p> : null}
    <p>Existing workflow and BOM pins are inherited, including archived pinned versions.
      This action does not select a new workflow or BOM.</p>
  </div>;
}

function Outcome({ title, outcome }: { title: string; outcome: StepOutcome }) {
  return <section className="space-y-2 rounded-md border p-3 text-sm" aria-label={title}>
    <h3 className="font-medium">{title}</h3>
    <dl className="grid grid-cols-2 gap-2">
      {([
        ["Step input", outcome.inputQuantity],
        ["Recorded good", outcome.goodQuantity],
        ["Scrap", outcome.scrapQuantity],
        ["Never-produced cancellation", outcome.cancelledQuantity],
        ["Unclassified legacy quantity", outcome.legacyUnclassifiedQuantity],
        ["Remaining", outcome.remainingQuantity],
        ["Next-step input", outcome.nextStepInputQuantity],
      ] as const).map(([label, value]) => <div key={label}>
        <dt className="text-muted-foreground">{label}</dt>
        <dd>{formatProductionQuantity(value)}</dd>
      </div>)}
    </dl>
    <p>Next step: {outcome.nextStep ? `${outcome.nextStep.name} (${outcome.nextStep.code})` : "None"}</p>
    <p>Terminal batch: {outcome.isTerminal ? "Yes" : "No"} · Closure outcome: {outcome.closureOutcome}</p>
  </section>;
}

export function ProductionShortClose(props: Props) {
  const user = useAppSelector((state) => state.auth.user);
  // Keep material queries out of employee renders, not merely hidden in the UI.
  if (!user || !["OWNER", "ADMIN", "MANAGEMENT"].includes(user.role)) return null;
  return <ManagerShortClose key={`${props.order.id}:${props.step.id}`} {...props} />;
}

function ManagerShortClose({ order, step, disabled, onDone, onRefresh, rejectionSources = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [drafts, setDrafts] = useState<DispositionDraft[]>([]);
  const material = useMaterialSources(order);
  const [previewMutation] = usePreviewProductionShortCloseMutation();
  const [commitMutation] = useShortCloseProductionOrderMutation();
  const nextStep = order.steps.filter((candidate) => candidate.active && candidate.sequenceNumber > step.sequenceNumber)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)[0];
  const title = nextStep ? "Close step short" : "Complete batch short";
  let versionsReady = true;
  try { productionFlowVersions(order, step); } catch { versionsReady = false; }
  const refresh = () => {
    onRefresh();
    void material.query.refetch();
  };
  const flow = useProductionReview<ShortClosePreviewRequest, ShortClosePreview, ShortCloseResult>({
    order, step, action: "SHORT_CLOSE",
    draftKey: JSON.stringify({ reason, drafts, evidence: material.query.currentData }),
    disabled: disabled || !versionsReady || !material.ready,
    preview: async (body) => {
      const result = await previewMutation({ orderId: order.id, stepId: step.id, body }).unwrap();
      if (result.action !== "SHORT_CLOSE" || result.sourceOrderId !== order.id || result.sourceStepId !== step.id ||
          !sameFlowVersions(result, order, step) ||
          result.expectedOrderVersion !== body.expectedOrderVersion ||
          result.expectedStepVersion !== body.expectedStepVersion ||
          result.expectedFamilyVersion !== body.expectedFamilyVersion) {
        throw new Error("Preview does not match this batch, step or captured versions. Refresh and review again.");
      }
      return result;
    },
    commit: (body, source) => commitMutation({ orderId: source.orderId, stepId: source.stepId, body }).unwrap(),
    onDone: () => {
      setOpen(false);
      setDrafts([]);
      setReason("");
      onDone();
    },
    onRefresh: refresh,
  });
  const patch = (key: string, change: Partial<DispositionDraft>) =>
    setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, ...change } : draft));
  const preview = flow.review?.preview;
  const blockers = preview?.blockingReasons ?? [];
  const completeProjection = Boolean(preview?.before && preview.after && preview.totals &&
    preview.dispositions && preview.inventoryEffects && preview.materialIssueWarnings);
  const confirmDisabled = !flow.allowed || !completeProjection || blockers.length > 0 || !material.ready || !versionsReady;

  function requestPreview() {
    try {
      if (!material.ready) throw new Error("Refresh the order and material sources before previewing.");
      if (!reason.trim()) throw new Error("Enter an overall short-closure reason.");
      void flow.requestReview({
        ...productionFlowVersions(order, step),
        reason: reason.trim(),
        dispositions: productionDispositions(drafts, material.sources),
      });
    } catch (error) {
      flow.setError(productionFailure(error));
    }
  }

  const evidenceStatus = <div className="space-y-2 text-sm">
    {!versionsReady ? <p role="alert">Current order, step and family versions are required. Refresh before previewing.</p> : null}
    {!material.ready ? <p role="alert" className="text-amber-700">
      {material.query.isFetching ? "Loading authoritative material evidence…" :
        material.query.isError ? "Material evidence could not be loaded." :
          "Material evidence does not match the current family version."}
      {" "}Preview and confirmation are blocked; your drafts are retained.
    </p> : <p className="text-muted-foreground">Material evidence matches family version {material.query.currentData?.familyVersion}.</p>}
    <Button type="button" size="sm" variant="outline" disabled={flow.busy || material.query.isFetching}
      onClick={refresh}>Refresh order and material sources</Button>
  </div>;

  return <>
    <Button type="button" variant="outline" disabled={disabled || flow.busy || !canProductionAction(order, "SHORT_CLOSE")} onClick={() => {
      if (!drafts.length) setDrafts([newDisposition()]);
      flow.setError("");
      setOpen(true);
    }}>{title}</Button>
    {!canProductionAction(order, "SHORT_CLOSE") ? <p className="text-xs text-muted-foreground">{productionActionBlock(order, "SHORT_CLOSE")}</p> : null}
    <Dialog open={open && !flow.review} onOpenChange={(value) => { if (!flow.busy) setOpen(value); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Classify remaining or historical rejected pieces with reasons.
            Record any new good output separately before closing short; closure never records new good output.</DialogDescription>
        </DialogHeader>
        <p className="text-sm">{nextStep
          ? `Recorded good continues to ${nextStep.name}. Closing this step does not complete the root order.`
          : "This is the last active step. The server preview determines the batch outcome and root totals; other batches may remain open."}</p>
        <AdoptionNotice order={order} />
        {evidenceStatus}
        <fieldset disabled={flow.busy} className="space-y-4">
          <label className="block text-sm">Overall closure reason
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {drafts.map((draft, index) => <section key={draft.key} className="space-y-3 rounded-md border p-3">
            <h3 className="text-sm font-medium">Disposition {index + 1}</h3>
            <label className="block text-sm">Classification
              <select className="mt-1 w-full rounded-md border p-2" value={draft.type} onChange={(event) => patch(draft.key, {
                type: event.target.value === "SCRAP" ? "SCRAP" : "CANCEL_UNPRODUCED",
                materials: [], noMaterialWasteReason: "", neverProducedAttestation: false,
              })}>
                <option value="SCRAP">Scrap — physically produced or processed loss</option>
                <option value="CANCEL_UNPRODUCED">Cancel — never physically produced or processed</option>
              </select>
            </label>
            <label className="block text-sm">Piece quantity (up to 3 decimal places)
              <Input inputMode="decimal" value={draft.quantity} onChange={(event) => patch(draft.key, { quantity: event.target.value })} />
            </label>
            <label className="block text-sm">Reason for this disposition
              <Textarea value={draft.reason} onChange={(event) => patch(draft.key, { reason: event.target.value })} />
            </label>
            <label className="block text-sm">Piece source
              <select className="mt-1 w-full rounded-md border p-2" value={draft.sourceKind}
                onChange={(event) => patch(draft.key, { sourceKind: event.target.value === "EXISTING_REJECTION" ? "EXISTING_REJECTION" : "NEW_UNRECORDED" })}>
                <option value="NEW_UNRECORDED">New, unrecorded disposition</option>
                <option value="EXISTING_REJECTION">Classify an existing rejection — do not record it twice</option>
              </select>
            </label>
            {draft.sourceKind === "EXISTING_REJECTION" ? <>
              <label className="block text-sm">Recorded rejection source
                <select className="mt-1 w-full rounded-md border p-2" value={`${draft.sourceType}:${draft.sourceId}`} onChange={(event) => {
                  const source = rejectionSources.find((candidate) => `${candidate.sourceType}:${candidate.sourceId}` === event.target.value);
                  patch(draft.key, { sourceType: source?.sourceType ?? "STEP_EXECUTION", sourceId: source?.sourceId ?? "" });
                }}>
                  <option value={`${draft.sourceType}:`}>Select a current-step record, or enter its UUID below</option>
                  {rejectionSources.map((source) => <option key={`${source.sourceType}:${source.sourceId}`} value={`${source.sourceType}:${source.sourceId}`}>{source.sourceType} / {formatProductionQuantity(source.quantity)} originally rejected / {source.sourceId}</option>)}
                </select>
              </label>
              <label className="block text-sm">Original rejection record type
                <select className="mt-1 w-full rounded-md border p-2" value={draft.sourceType}
                  onChange={(event) => patch(draft.key, { sourceType: event.target.value === "EXECUTION_BATCH" ? "EXECUTION_BATCH" : "STEP_EXECUTION", sourceId: "" })}>
                  <option value="STEP_EXECUTION">Step execution</option>
                  <option value="EXECUTION_BATCH">Execution batch</option>
                </select>
              </label>
              <label className="block text-sm">Original rejection source UUID
                <Input value={draft.sourceId} onChange={(event) => patch(draft.key, { sourceId: event.target.value })} />
              </label>
              <p className="text-xs text-muted-foreground">Copy the actual source record ID from existing execution history,
                not the order ID or step ID. Displayed quantities are historical, not a promise of remaining unclassified balance; the server checks availability across all dispositions.</p>
            </> : null}
            {draft.type === "CANCEL_UNPRODUCED" ? <>
              <p className="text-sm">Proven upstream work in progress cannot be cancelled as never produced.
                Cancellation forbids material waste and never returns stock.</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={draft.neverProducedAttestation}
                  onChange={(event) => patch(draft.key, { neverProducedAttestation: event.target.checked })} />
                I attest that these pieces were never physically produced or processed, including at upstream steps.
              </label>
            </> : <>
              <p className="text-sm">Declare actual material waste independently of piece counts.
                Existing issue evidence allocates already-consumed material without a second deduction.
                NEW_STOCK explicitly deducts new stock for actual waste.</p>
              <MaterialAllocationEditor drafts={draft.materials} sources={material.ready ? material.sources : []}
                allowNewStock disabled={flow.busy || !material.ready}
                onChange={(materials) => patch(draft.key, { materials })} />
              {!draft.materials.length ? <label className="block text-sm">Required explanation if there is no material waste
                <Textarea value={draft.noMaterialWasteReason}
                  onChange={(event) => patch(draft.key, { noMaterialWasteReason: event.target.value })} />
              </label> : null}
            </>}
            <Button type="button" size="sm" variant="ghost" onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}>
              Remove disposition {index + 1}
            </Button>
          </section>)}
          <Button type="button" variant="outline" onClick={() => setDrafts((current) => [...current, newDisposition()])}>Add disposition</Button>
        </fieldset>
        {flow.error ? <p role="alert" className="text-sm text-destructive">{flow.error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={flow.busy} onClick={() => setOpen(false)}>Keep draft and close</Button>
          <Button type="button" disabled={flow.busy || !flow.allowed || !drafts.length} onClick={requestPreview}>
            {flow.busy ? "Reviewing…" : "Preview short closure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ProductionReviewDialog open={Boolean(flow.review)}
      title={preview?.after?.nextStep ? "Close step short" : "Complete batch short"}
      description="Review the server-calculated outcome, original source classifications and actual inventory effects. No new good output is recorded."
      busy={flow.busy} stale={flow.stale} uncertain={flow.uncertain} disabled={confirmDisabled} error={flow.error}
      onCancel={flow.cancel} onRefresh={refresh}
      onConfirm={() => { if (!confirmDisabled) void flow.confirm(); }}
      onRetry={() => { if (!blockers.length) void flow.confirm(true); }}>
      <ProductionPreviewBlockers blockers={blockers} />
      {preview && !blockers.length && !completeProjection ? <p role="alert" className="text-sm text-destructive">The preview is missing closure outcomes or inventory evidence. Confirmation is blocked; refresh and request a complete preview.</p> : null}
      {preview?.before && preview.after && preview.totals && preview.dispositions && preview.inventoryEffects && preview.materialIssueWarnings ? <>
        <AdoptionNotice order={order} />
        {evidenceStatus}
        <Outcome title="Before closure" outcome={preview.before} />
        <Outcome title="After closure" outcome={preview.after} />
        <p className="text-sm font-medium">{preview.after.nextStep
          ? `Good output continues to ${preview.after.nextStep.name}; this is not root-order completion.`
          : "This batch outcome does not imply the root family is complete. Review all root totals below."}</p>
        <section className="space-y-2" aria-label="Root family totals">
          <h3 className="text-sm font-medium">Root family totals after closure</h3>
          <ProductionQuantitySummary quantities={preview.totals} />
        </section>
        <section className="space-y-2 text-sm" aria-label="Reviewed disposition classifications">
          <h3 className="font-medium">Reviewed classifications ({preview.dispositions.length})</h3>
          <p>Overall reason: {flow.review?.body.reason}</p>
          {preview.dispositions.map((disposition, index) => <div key={index} className="space-y-1 rounded-md border p-3">
            <p>{disposition.type}: {formatProductionQuantity(disposition.quantity)} pieces</p>
            <p>Reason: {disposition.reason}</p>
            <p className="break-all">{disposition.source.kind === "EXISTING_REJECTION"
              ? `Original rejection: ${disposition.source.sourceType} / ${disposition.source.sourceId}`
              : "Source: new unrecorded disposition"}</p>
            {disposition.materialWaste?.map((waste, materialIndex) => <p className="break-all text-xs" key={materialIndex}>
              Material {waste.inventoryItemId}: {formatProductionQuantity(waste.quantity)} {waste.unit}
              {waste.source === "EXISTING_CONSUMPTION"
                ? ` — existing issue ${waste.consumptionId}, no second stock deduction`
                : ` — NEW_STOCK deduction, lot ${waste.lotNumber}`}
            </p>)}
            {disposition.noMaterialWasteReason ? <p>No material waste: {disposition.noMaterialWasteReason}</p> : null}
            {disposition.neverProducedAttestation ? <p>Attested never physically produced or processed; no stock is returned.</p> : null}
          </div>)}
        </section>
        <ProductionWasteEffects effects={preview.inventoryEffects} />
        {preview.inventoryEffects.map((effect, index) => <p className="text-xs" key={index}>
          Material {effect.inventoryItemId}: stock {formatProductionQuantity(effect.stockBefore)} → {formatProductionQuantity(effect.stockAfter)};
          {" "}finished-good credit {formatProductionQuantity(effect.finishedGoodCredit)}; purpose {effect.purpose}.
        </p>)}
        {preview.materialIssueWarnings.map((warning, index) =>
          <p role="alert" className="text-sm text-amber-700" key={index}>{warning}</p>)}
        <p className="text-xs text-muted-foreground">Stock is not reserved. The server rechecks balances and all three versions at confirmation.</p>
      </> : null}
    </ProductionReviewDialog>
  </>;
}
