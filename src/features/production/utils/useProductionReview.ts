"use client";

import { useRef, useState } from "react";
import type { OrderStep, ProductionOrder } from "../types/production.types";
import type { FlowPreview, FlowVersions, ProductionFlowAction } from "../types/productionFlow.types";
import { canProductionAction, productionFailure } from "./productionFlow";
import { captureProductionReview, productionReviewIsCurrent, type ConfirmedProductionRequest, type ProductionReview } from "./productionReview";

export function useProductionReview<T extends FlowVersions, P extends FlowPreview, R>({
  order, step, action, draftKey, disabled, preview, commit, onDone, onRefresh,
}: {
  order: ProductionOrder;
  step: OrderStep;
  action: ProductionFlowAction;
  draftKey: string;
  disabled: boolean;
  preview: (body: T) => Promise<P>;
  commit: (body: ConfirmedProductionRequest<T>, source: { orderId: string; stepId: string }) => Promise<R>;
  onDone: (result: R) => void;
  onRefresh: () => void;
}) {
  const [review, setReview] = useState<ProductionReview<T, P>>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const inFlight = useRef(false);
  const stale = Boolean(review && !productionReviewIsCurrent(review, order, step, draftKey));
  const allowed = !disabled && canProductionAction(order, action);

  async function requestReview(body: T) {
    if (inFlight.current) return;
    if (!allowed) {
      setError("This action is unavailable. Refresh and review the current batch.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setUncertain(false);
    setReview(undefined);
    const captured = structuredClone(body);
    try {
      const result = await preview(captured);
      setReview(captureProductionReview(order.id, step.id, action, draftKey, captured, result));
    } catch (failure) {
      setError(productionFailure(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function confirm(retryOriginal = false) {
    if (inFlight.current || !review) return;
    if ((!retryOriginal && (!allowed || stale || uncertain || !review.body.previewToken || review.preview.blockingReasons.length > 0)) || (retryOriginal && !uncertain)) {
      setError("This confirmation is no longer current. Refresh and review again.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await commit(review.body, { orderId: review.orderId, stepId: review.stepId });
      setReview(undefined);
      setUncertain(false);
      onDone(result);
    } catch (failure) {
      const status = failure && typeof failure === "object" && "status" in failure ? failure.status : undefined;
      const outcomeUnknown = typeof status !== "number";
      setError(outcomeUnknown
        ? "Outcome not confirmed. Refresh to inspect the family, or explicitly retry this identical confirmed request. No automatic retry was made."
        : productionFailure(failure));
      setUncertain(outcomeUnknown);
      if (!outcomeUnknown) setReview(undefined);
      onRefresh();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return {
    review, error, busy, uncertain, stale, allowed,
    requestReview, confirm,
    setError,
    cancel: () => { if (!inFlight.current) { setReview(undefined); setUncertain(false); } },
  };
}
