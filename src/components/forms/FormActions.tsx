"use client";

import { Button } from "@/components/ui/button";

type FormActionsProps = {
  submitLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onCancel?: () => void;
  align?: "left" | "right" | "between";
};

export function FormActions({
  submitLabel,
  cancelLabel = "Cancel",
  loading = false,
  disabled = false,
  onCancel,
  align = "right",
}: FormActionsProps) {
  const alignment =
    align === "left"
      ? "justify-start"
      : align === "between"
        ? "justify-between"
        : "justify-end";

  return (
    <div className={`flex items-center gap-3 pt-4 ${alignment}`}>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}

      <Button type="submit" disabled={loading || disabled}>
        {loading ? "Please wait..." : submitLabel}
      </Button>
    </div>
  );
}