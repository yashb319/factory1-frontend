"use client";

import { useId, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppSelector } from "@/lib/hook";
import { useBindOrderBomMutation, useGetBomsQuery, useGetOrderQuery } from "../api/productionApi";
import type { ProductionOrder } from "../types/production.types";
import { canProductionAction, productionIsTerminal, productionOrderGuard } from "../utils/productionFlow";

export function OrderBomBinding({ order }: { order: ProductionOrder }) {
  const user = useAppSelector((state) => state.auth.user);
  const canBind = !!user && ["OWNER", "ADMIN", "MANAGEMENT"].includes(user.role) && canProductionAction(order, "BIND_BOM");

  if (order.bomBindingStatus === "PINNED") return null;

  const selected = order.bomBindingStatus === "LEGACY_SELECTED";
  const terminal = productionIsTerminal(order) || order.batch?.nodeType === "SUMMARY";

  return (
    <section className="space-y-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
      <div role="alert" className="space-y-2 text-sm">
        <h3 className="flex items-center gap-2 font-semibold">
          <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
          {selected ? "Legacy BOM selected for future output only" : "Historical BOM is unknown"}
        </h3>
        <p>
          {selected
            ? "The BOM for earlier output remains unknown. The selected BOM applies only to output recorded after selection; it does not resolve historical estimates."
            : "This legacy order has no known historical BOM. Earlier output cannot be attributed to a BOM or treated as a complete material estimate."}
        </p>
        <p>Actual material consumption history is unaffected.</p>
        {!selected && terminal && <p>This order is {order.status.toLowerCase().replaceAll("_", " ")}; a BOM cannot be selected.</p>}
      </div>
      {order.bomBindingStatus === "LEGACY_UNRESOLVED" && !terminal && (
        canBind ? (
          <LegacyBomSelection
            key={`${order.id}:${order.productId}`}
            order={order}
          />
        ) : <p className="text-sm">Only owners, admins, and management can select a BOM for future output.</p>
      )}
    </section>
  );
}

function LegacyBomSelection({ order }: { order: ProductionOrder }) {
  const id = useId();
  const [bomId, setBomId] = useState("");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState<{ bomId: string; reason: string; expectedOrderVersion: number; expectedFamilyVersion?: number }>();
  const [refreshing, setRefreshing] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string>();
  const [bindBom, binding] = useBindOrderBomMutation();
  const orderQuery = useGetOrderQuery(order.id);
  const boms = useGetBomsQuery(
    { productId: order.productId, includeArchived: false },
    { refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true },
  );
  const choices = (boms.currentData ?? []).filter(
    (bom) => bom.productId === order.productId && bom.active && bom.status === "PUBLISHED",
  );
  const chosen = choices.find((bom) => bom.id === bomId);
  const version = order.executionVersion;
  const hasVersion = typeof version === "number" && Number.isInteger(version) && version >= 0;
  const familyVersion = order.batch?.familyVersion;
  const hasFamilyVersion = order.quantityModel !== "FLOW_V1" ||
    (typeof familyVersion === "number" && Number.isSafeInteger(familyVersion) && familyVersion >= 0);
  const ready = !boms.isFetching && !boms.isError && !!boms.currentData;
  const canSubmit = ready && hasVersion && hasFamilyVersion && !!chosen && !!reason.trim()
    && !binding.isLoading && !binding.isSuccess && !conflict && !refreshing && !orderQuery.isFetching && !orderQuery.isError;
  const reviewIsCurrent = !!review && review.expectedOrderVersion === version
    && review.bomId === bomId && review.reason === reason.trim();
  const familyReviewIsCurrent = order.quantityModel !== "FLOW_V1" || review?.expectedFamilyVersion === familyVersion;

  async function refreshOrder() {
    setRefreshing(true);
    try {
      await Promise.all([orderQuery.refetch().unwrap(), boms.refetch().unwrap()]);
      setConflict(false);
      setError(undefined);
    } catch (failure: unknown) {
      setError(apiErrorMessage(failure) ?? "Could not refresh the order and eligible BOMs. Your inputs have been retained.");
    } finally {
      setRefreshing(false);
    }
  }

  async function confirmBinding() {
    if (!canSubmit || !reviewIsCurrent || !familyReviewIsCurrent || !review) return;
    setError(undefined);
    try {
      await bindBom({
        orderId: order.id,
        body: review,
      }).unwrap();
      setReview(undefined);
    } catch (failure: unknown) {
      const status = failure && typeof failure === "object" && "status" in failure ? failure.status : undefined;
      setConflict(status === 409 || status === 412);
      setError(apiErrorMessage(failure) ?? "Could not select the BOM. No selection has been confirmed.");
      setReview(undefined);
    }
  }

  if (binding.isSuccess) {
    return <p role="status" className="text-sm font-medium">BOM selection saved for future output only. The BOM for earlier output remains unknown. Refreshing order details…</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      <p>Select an active, published BOM for this product. This one-time selection cannot be changed and applies only to future output.</p>
      {(!hasVersion || !hasFamilyVersion) && <p role="alert">The order or required family version is unavailable. Reload before selecting a BOM; binding is disabled.</p>}
      {orderQuery.isFetching && <p role="status">Refreshing the order… Confirmation is disabled.</p>}
      {orderQuery.isError && <p role="alert">{apiErrorMessage(orderQuery.error) ?? "The latest order could not be loaded."} Refresh the order before confirming.</p>}
      {boms.isFetching && <p role="status">Refreshing eligible BOMs… Selection is disabled until fresh data is available.</p>}
      {boms.isError && (
        <div role="alert" className="space-y-2">
          <p>{apiErrorMessage(boms.error) ?? "Eligible BOMs could not be loaded."} Cached choices cannot be used.</p>
          <Button type="button" size="sm" variant="outline" disabled={boms.isFetching} onClick={() => void boms.refetch()}>Retry BOMs</Button>
        </div>
      )}
      {ready && choices.length === 0 && <p role="status">No active, published BOM is available for this product. Publish a BOM before selecting one.</p>}
      {ready && bomId && !chosen && <p role="alert">The selected BOM is no longer eligible. Choose another active, published BOM.</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {conflict && <p role="alert">The order changed or the BOM is no longer eligible. Refresh and review the latest state before trying again. Your inputs have been retained.</p>}
      {(!hasVersion || conflict || orderQuery.isError) && <Button type="button" size="sm" variant="outline" disabled={refreshing} onClick={() => void refreshOrder()}>{refreshing ? "Refreshing…" : "Refresh order and BOMs"}</Button>}
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (canSubmit && version !== undefined) setReview({ bomId, reason: reason.trim(), ...productionOrderGuard(order), expectedOrderVersion: version }); }}>
        <fieldset disabled={!ready || !hasVersion || binding.isLoading || conflict || refreshing} className="space-y-3 disabled:opacity-60">
          <div className="space-y-1">
            <label htmlFor={`${id}-bom`} className="font-medium">BOM for future output</label>
            <select id={`${id}-bom`} required value={bomId} onChange={(event) => setBomId(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select a published BOM</option>
              {bomId && !chosen && <option value={bomId} disabled>Previously selected BOM (currently unavailable)</option>}
              {choices.map((bom) => <option key={bom.id} value={bom.id}>{bom.name} · v{bom.versionNumber}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-reason`} className="font-medium">Reason for selection (required)</label>
            <Textarea id={`${id}-reason`} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this BOM is appropriate for future output." />
          </div>
          <Button type="submit" disabled={!canSubmit}>Review BOM selection</Button>
        </fieldset>
      </form>
      <AlertDialog open={!!review} onOpenChange={(open) => { if (!open) setReview(undefined); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm one-time BOM selection?</AlertDialogTitle>
            <AlertDialogDescription>
              Select {chosen?.name ?? "the chosen BOM"}{chosen ? ` · v${chosen.versionNumber}` : ""} for future output on order {order.orderNumber}.
              This cannot be changed. Earlier output remains BOM-unknown, historical estimates remain unresolved, and actual consumption history is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="break-words text-sm"><strong>Reason:</strong> {review?.reason}</p>
          {(!reviewIsCurrent || !familyReviewIsCurrent) && <p role="alert" className="text-sm">The order or family changed after review. Cancel and review the latest version before confirming. Your inputs are retained.</p>}
          {!canSubmit && !binding.isLoading && <p role="alert" className="text-sm">Selection is currently unavailable. Cancel and review the latest BOM and order information.</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={binding.isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!canSubmit || !reviewIsCurrent || !familyReviewIsCurrent} onClick={(event) => { event.preventDefault(); void confirmBinding(); }}>
              {binding.isLoading ? "Saving…" : "Confirm future-output BOM"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function apiErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("data" in error && error.data && typeof error.data === "object") {
    for (const key of ["message", "error", "detail"] as const) {
      if (key in error.data) {
        const value = (error.data as Record<string, unknown>)[key];
        if (typeof value === "string") return value;
      }
    }
  }
  if ("error" in error && typeof error.error === "string") return error.error;
  if ("message" in error && typeof error.message === "string") return error.message;
  return undefined;
}
