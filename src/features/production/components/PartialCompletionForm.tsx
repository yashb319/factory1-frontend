"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStepActionMutation } from "../api/productionApi";

type Props = {
  orderId: string;
  stepId: string;
  remainingQuantity: number;
  expectedOrderVersion?: number;
  expectedStepVersion?: number;
  onDone?: () => void;
  onCancel?: () => void;
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
}: Props) {
  const [completedQuantity, setCompletedQuantity] = useState("");
  const [rejectedQuantity, setRejectedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [stepAction, stepActionState] = useStepActionMutation();

  const submit = async () => {
    const completed = Number(completedQuantity) || 0;
    const rejected = Number(rejectedQuantity) || 0;

    if (completed <= 0 && rejected <= 0) {
      toast.error("Enter a completed or rejected quantity before recording output.");
      return;
    }

    try {
      await stepAction({
        orderId,
        stepId,
        action: "complete",
        body: {
          completedQuantity: completed || undefined,
          rejectedQuantity: rejected || undefined,
          notes: notes.trim() || undefined,
          expectedOrderVersion,
          expectedStepVersion,
        },
      }).unwrap();
      toast.success("Output recorded");
      setCompletedQuantity("");
      setRejectedQuantity("");
      setNotes("");
      onDone?.();
    } catch (error) {
      const message =
        error && typeof error === "object" && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;
      toast.error(message ?? "Could not record output");
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
            onChange={(event) => setRejectedQuantity(event.target.value)}
          />
        </div>
      </div>
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes (optional)"
        className="min-h-[48px] text-xs"
      />
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" size="sm" disabled={stepActionState.isLoading} onClick={() => void submit()}>
          {stepActionState.isLoading ? "Saving..." : "Record output"}
        </Button>
      </div>
    </div>
  );
}
