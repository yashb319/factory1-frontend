import type { OrderStep, ProductionOrder } from "../types/production.types";
import type { FlowPreview, FlowVersions, ProductionFlowAction } from "../types/productionFlow.types";
import { sameFlowVersions } from "./productionFlow.ts";

export type ConfirmedProductionRequest<T> = T & { requestId: string; previewToken: string };
export type ProductionReview<T, P> = {
  orderId: string;
  stepId: string;
  draftKey: string;
  body: ConfirmedProductionRequest<T>;
  preview: P;
};

export function captureProductionReview<T extends FlowVersions, P extends FlowPreview>(
  orderId: string, stepId: string, action: ProductionFlowAction, draftKey: string, body: T, preview: P,
): ProductionReview<T, P> {
  if (!preview.previewToken && !preview.blockingReasons?.length) {
    throw new Error("The server did not return a confirmation token. Refresh before acting.");
  }
  if (preview.action !== action || preview.sourceOrderId !== orderId || preview.sourceStepId !== stepId ||
      preview.expectedOrderVersion !== body.expectedOrderVersion ||
      preview.expectedStepVersion !== body.expectedStepVersion ||
      preview.expectedFamilyVersion !== body.expectedFamilyVersion || !Array.isArray(preview.blockingReasons)) {
    throw new Error("The preview does not match the reviewed order, step, action and versions. Refresh before acting.");
  }
  return {
    orderId, stepId, draftKey,
    body: { ...structuredClone(body), previewToken: preview.previewToken, requestId: crypto.randomUUID() },
    preview: structuredClone(preview),
  };
}

export function productionReviewIsCurrent<T extends FlowVersions, P>(
  review: ProductionReview<T, P>, order: ProductionOrder, step: OrderStep, draftKey: string,
): boolean {
  return review.orderId === order.id && review.stepId === step.id && review.draftKey === draftKey &&
    sameFlowVersions(review.body, order, step);
}
