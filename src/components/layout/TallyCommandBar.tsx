"use client";

import { cn } from "@/lib/utils";

export function TallyCommandBar() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 hidden h-8 border-t border-[var(--factory1-border)] bg-white text-[11px] text-[var(--factory1-text-secondary)] lg:flex lg:pr-48">
      <div className="flex flex-1 divide-x divide-[var(--factory1-border)]">
        <Command label="Q: Quit" />
        <Command label="A: Accept" strong />
        <Command label="D: Delete" />
        <Command label="X: Cancel" />
        <Command label="Enter: Next Field" />
        <Command label="Esc: Previous Field" />
      </div>
      <div className="flex w-48 items-center justify-end px-2 text-[var(--factory1-text-secondary)]">
        Ctrl+M: Gateway
      </div>
    </footer>
  );
}

function Command({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <div className={cn("flex min-w-24 items-center px-2", strong && "font-bold")}>
      {label}
    </div>
  );
}
