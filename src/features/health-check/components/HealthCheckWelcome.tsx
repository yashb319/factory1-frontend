"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dismissWelcome, shouldShowWelcome } from "../storage";

export function HealthCheckWelcome() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // The popup decision depends on browser-only persisted visit state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(shouldShowWelcome());
  }, []);

  function dismiss() {
    dismissWelcome();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
        onEscapeKeyDown={dismiss}
        aria-describedby="health-check-welcome-description"
      >
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <ClipboardCheck aria-hidden="true" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl leading-tight">
              Welcome to Factory1
            </DialogTitle>
            <DialogDescription
              id="health-check-welcome-description"
              className="text-base text-blue-50"
            >
              Take a short operations health check to uncover the area where
              better visibility could make the biggest difference.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <Clock3 className="mt-0.5 shrink-0 text-blue-600" size={18} aria-hidden="true" />
            <p>
              About five minutes. Your answers and contact details are only
              submitted if you finish and send the health check.
            </p>
          </div>
          <DialogFooter className="m-0 border-0 bg-transparent p-0 sm:justify-between">
            <Button type="button" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
            <Button asChild>
              <Link href="/health-check">
                Start health check
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
