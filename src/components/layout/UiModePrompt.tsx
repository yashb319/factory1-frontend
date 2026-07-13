"use client";

import { Keyboard, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuthUser } from "@/features/auth/types";
import {
  type FactoryUiMode,
  markFactoryUiModePromptSeen,
  setFactoryUiMode,
} from "@/lib/uiModePreference";

type UiModePromptProps = {
  open: boolean;
  user: AuthUser | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (mode: FactoryUiMode) => void;
};

export function UiModePrompt({
  open,
  user,
  onOpenChange,
  onSelect,
}: UiModePromptProps) {
  function choose(mode: FactoryUiMode) {
    setFactoryUiMode(mode, user);
    onSelect(mode);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      markFactoryUiModePromptSeen(user);
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl rounded-xl border-[var(--factory1-border)] bg-white p-0">
        <div className="border-b border-[var(--factory1-border)] bg-[var(--factory1-background)] px-5 py-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[var(--factory1-text-primary)]">
              Choose your Factory1 workspace
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--factory1-text-muted)]">
              Pick the experience that fits your team. You can change this anytime from Organization Settings.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("modern")}
            className="rounded-lg border border-[var(--factory1-border)] bg-white p-4 text-left transition hover:border-[var(--factory1-primary)] hover:bg-[var(--factory1-primary-extra-light)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--factory1-primary-light)] text-[var(--factory1-primary)]">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <span className="mt-4 block text-base font-semibold text-[var(--factory1-text-primary)]">
              New UI
            </span>
            <span className="mt-2 block text-sm leading-6 text-[var(--factory1-text-muted)]">
              Clean dashboard, left navigation, guided workflows and visual cards for new Factory1 users.
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose("tally")}
            className="rounded-lg border border-[var(--factory1-border)] bg-[#FFFDE7] p-4 text-left transition hover:border-[#0F766E] hover:bg-[#F0FDFA]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#D1FAE5] text-[#0F766E]">
              <Keyboard className="h-5 w-5" />
            </span>
            <span className="mt-4 block text-base font-semibold text-[var(--factory1-text-primary)]">
              Tally-like UI
            </span>
            <span className="mt-2 block text-sm leading-6 text-[var(--factory1-text-muted)]">
              Gateway screen, function-key shortcuts and keyboard-first entry for teams moving from Tally.
            </span>
          </button>
        </div>

        <div className="flex justify-end border-t border-[var(--factory1-border)] bg-[var(--factory1-background)] px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Keep current
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
