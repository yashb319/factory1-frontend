"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProductionReviewDialog({
  open, title, description, busy, stale, uncertain, disabled, error, children,
  onCancel, onConfirm, onRetry, onRefresh,
}: {
  open: boolean;
  title: string;
  description: string;
  busy: boolean;
  stale: boolean;
  uncertain: boolean;
  disabled: boolean;
  error: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  return <AlertDialog open={open} onOpenChange={(next) => { if (!next && !busy) onCancel(); }}>
    <AlertDialogContent className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      {children}
      {stale && !uncertain ? <p role="alert" className="text-sm text-destructive">The order, family or entered details changed after review. Cancel, refresh and request a new preview. This confirmation cannot follow new versions automatically.</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <AlertDialogFooter className="flex-wrap">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>{uncertain ? "Close and inspect batch" : "Cancel"}</Button>
        {uncertain ? <>
          <Button type="button" variant="outline" disabled={busy} onClick={onRefresh}>Refresh current state</Button>
          <Button type="button" disabled={busy} onClick={onRetry}>{busy ? "Checking..." : "Retry identical confirmed request"}</Button>
        </> : <Button type="button" disabled={busy || stale || disabled} onClick={onConfirm}>{busy ? "Saving..." : "Confirm reviewed action"}</Button>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
