"use client";

import { useEffect, useState } from "react";
import { Clock3, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/hook";
import {
  useConvertSandboxMutation,
  useGetSandboxStatusQuery,
} from "../api/organizationApi";

export function SandboxBanner() {
  const user = useAppSelector((state) => state.auth.user);
  const { data, refetch } = useGetSandboxStatusQuery(undefined, {
    skip: Boolean(user?.platformAdmin),
  });
  const [convertSandbox, { isLoading }] = useConvertSandboxMutation();
  const [dismissed, setDismissed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const status = data?.data;
  const canConvert = user?.role === "OWNER" || user?.role === "ADMIN";

  useEffect(() => {
    if (!status?.isSandbox) return;

    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [status?.isSandbox]);

  if (!status?.isSandbox || dismissed) {
    return null;
  }

  async function handleConvert() {
    try {
      await convertSandbox().unwrap();
      toast.success("Your organization was submitted for approval.");
      setConfirmOpen(false);
      await refetch();
    } catch {
      toast.error("Could not activate the real account");
    }
  }

  return (
    <>
      <div className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-blue-950 sm:px-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3 text-sm">
          <Clock3 className="h-4 w-4 shrink-0 text-blue-700" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Sandbox trial</span>
            {" — "}
            {formatRemaining(status.expiresAt, now)}
          </p>
          {canConvert ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 border-blue-300 bg-white"
              onClick={() => setConfirmOpen(true)}
            >
              Activate real account
            </Button>
          ) : null}
          <button
            type="button"
            className="rounded p-1 text-blue-700 hover:bg-blue-100"
            aria-label="Dismiss sandbox trial banner"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate your real account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will submit your organization for real approval. Your
              sandbox demo and sample data will remain in place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isLoading} onClick={handleConvert}>
              {isLoading ? "Submitting..." : "Submit for approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatRemaining(expiresAt: string | null, now: number) {
  if (!expiresAt) return "Your trial is active";

  const remainingMs = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return "Your trial expires soon";
  }

  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (totalHours < 24) {
    return `expires in ${totalHours} hour${totalHours === 1 ? "" : "s"}`;
  }

  const days = Math.ceil(totalHours / 24);
  return `expires in ${days} day${days === 1 ? "" : "s"}`;
}
