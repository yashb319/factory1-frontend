"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRecordStepProductionMutation } from "../api/productionApi";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { hasExecutionVersions, matchesProductionAction, productionActionBody, reviewProductionAction, type ProductionActionSnapshot } from "../utils/productionAction";

type Props = {
  orderId: string;
  stepId: string;
  remainingQuantity: number;
  expectedOrderVersion?: number;
  expectedStepVersion?: number;
  onDone?: () => void;
  onCancel?: () => void;
  onRefresh?: () => void;
  disabled?: boolean;
};

/**
 * Inline partial/full completion recorder for a production order step.
 * Shared by the Kanban card popover and the employee "My Assignments" view so
 * the logic only lives in one place.
 */
export function PartialCompletionForm({
  orderId,
  stepId,
  remainingQuantity,
  expectedOrderVersion,
  expectedStepVersion,
  onDone,
  onCancel,
  onRefresh,
  disabled = false,
}: Props) {
  const [completedQuantity, setCompletedQuantity] = useState("");
  const [rejectedQuantity, setRejectedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [recordProduction, recordProductionState] = useRecordStepProductionMutation();
  const [review, setReview] = useState<ProductionActionSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const savingRef = useRef(false);
  const context = { orderId, stepId, remainingQuantity, expectedOrderVersion, expectedStepVersion };
  const versionsAvailable = hasExecutionVersions(context);
  const staleReview = Boolean(review && !matchesProductionAction(review, context));

  const requestReview = () => {
    try {
      setErrorMessage("");
      setReview(reviewProductionAction(context, "record", Number(completedQuantity), Number(rejectedQuantity), notes));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Review the output quantities.";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const submit = async () => {
    if (!review || savingRef.current || disabled || staleReview) return;
    savingRef.current = true;

    try {
      await recordProduction({
        orderId: review.orderId,
        stepId: review.stepId,
        body: productionActionBody(review),
      }).unwrap();
      toast.success("Production recorded");
      setReview(null);
      setCompletedQuantity("");
      setRejectedQuantity("");
      setNotes("");
      onDone?.();
    } catch (error) {
      const data = error && typeof error === "object" && "data" in error ? error.data : undefined;
      const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : undefined;
      const detail = message ?? "Could not record production. Refresh the order and review before trying again.";
      setErrorMessage(detail);
      toast.error(detail);
      setReview(null);
      onRefresh?.();
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-2" onClick={(event) => event.stopPropagation()}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-muted-foreground">Completed</label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={completedQuantity}
            disabled={recordProductionState.isLoading}
            onChange={(event) => setCompletedQuantity(event.target.value)}
            placeholder={`of ${remainingQuantity}`}
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Rejected</label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={rejectedQuantity}
            disabled={recordProductionState.isLoading}
            onChange={(event) => setRejectedQuantity(event.target.value)}
          />
        </div>
      </div>
      <Textarea
        value={notes}
        disabled={recordProductionState.isLoading}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes (optional)"
        className="min-h-[48px] text-xs"
      />
      {!versionsAvailable ? <p role="alert" className="text-sm text-amber-700">Refresh this order before recording: concurrency versions are unavailable.</p> : null}
      {errorMessage ? <p role="alert" className="text-sm text-destructive">{errorMessage}</p> : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={recordProductionState.isLoading || disabled || !versionsAvailable}
          onClick={requestReview}
        >
          {recordProductionState.isLoading ? "Saving..." : "Record production"}
        </Button>
      </div>
      <AlertDialog open={Boolean(review)} onOpenChange={(open) => { if (!open && !savingRef.current) setReview(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm recorded production</AlertDialogTitle>
            <AlertDialogDescription>
              Record {review?.completedQuantity ?? 0} completed and {review?.rejectedQuantity ?? 0} rejected units for this step. This saves output only; it does not move to the next step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="break-all text-xs text-muted-foreground">Order ID: {review?.orderId}<br />Step ID: {review?.stepId}</p>
          {review?.notes ? <p className="text-sm">Notes: {review.notes}</p> : null}
          {staleReview ? <p role="alert" className="text-sm text-destructive">The order or step changed. Cancel and review the refreshed quantities before confirming again.</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={recordProductionState.isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={recordProductionState.isLoading || staleReview || disabled} onClick={(event) => { event.preventDefault(); void submit(); }}>
              {recordProductionState.isLoading ? "Saving..." : "Confirm and save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
