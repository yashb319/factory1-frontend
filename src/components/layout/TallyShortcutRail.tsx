"use client";

import type { AuthUser } from "@/features/auth/types";
import {
  type AppShortcut,
  openShortcutsMenuEvent,
  visibleShortcuts,
} from "@/config/shortcuts";
import { moduleForHref, moduleTheme } from "@/config/theme";
import { cn } from "@/lib/utils";
import { gatewayMenuItems } from "./TallyGatewayHome";

export function TallyShortcutRail({
  user,
  currentHref,
  onNavigate,
}: {
  user: AuthUser | null;
  currentHref: string;
  onNavigate: (href: string) => void;
}) {
  const shortcuts = visibleShortcuts(user);
  const onGateway = currentHref.startsWith("/gateway");
  const voucherShortcuts = shortcuts.filter((shortcut) =>
    [
      "Contra Voucher",
      "Payment Voucher",
      "Receipt Voucher",
      "Journal Voucher",
      "Sales Voucher",
      "Purchase Voucher",
      "Credit Note",
      "Debit Note",
    ].includes(shortcut.title)
  );
  const sections: Array<{
    id: string;
    label: string;
    items: Array<AppShortcut | (typeof gatewayMenuItems)[number]>;
  }> = onGateway
    ? [
        {
          id: "gateway",
          label: "Gateway",
          items: gatewayMenuItems,
        },
        {
          id: "vouchers",
          label: "Vouchers",
          items: voucherShortcuts,
        },
      ]
    : [
        {
          id: "tally",
          label: "Tally Keys",
          items: shortcuts.filter((shortcut) => shortcut.section === "tally"),
        },
      ];
  const visibleSections = sections.filter((section) => section.items.length > 0);

  return (
    <aside className="fixed right-0 top-0 z-40 hidden h-[calc(100vh-2rem)] w-48 border-l border-[var(--factory1-border)] bg-white text-[11px] text-[var(--factory1-text-primary)] lg:block">
      <div className="border-b border-[var(--factory1-border)] bg-[var(--factory1-primary)] px-2 py-2 font-semibold text-white">
        Gateway
      </div>
      <div className="h-full overflow-y-auto pb-8">
        {visibleSections.map((section) => (
          <div
            key={section.id}
            className="border-b border-[var(--factory1-border)]"
          >
            <div className="bg-[var(--factory1-background)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--factory1-text-muted)]">
              {section.label}
            </div>
            {section.items.map((item) =>
              "title" in item ? (
                <GatewayShortcutButton
                  key={`${item.key}-${item.title}`}
                  shortcut={item}
                  currentHref={currentHref}
                  onNavigate={onNavigate}
                />
              ) : (
                <GatewayMenuRailButton
                  key={`${item.key ?? item.shortcut}-${item.label}`}
                  item={item}
                  currentHref={currentHref}
                  onNavigate={onNavigate}
                />
              )
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

function GatewayMenuRailButton({
  item,
  currentHref,
  onNavigate,
}: {
  item: (typeof gatewayMenuItems)[number];
  currentHref: string;
  onNavigate: (href: string) => void;
}) {
  const active = isShortcutActive(currentHref, item.href);

  return (
    <button
      type="button"
      title={item.label}
      onClick={() => onNavigate(item.href)}
      className={cn(
        "flex min-h-7 w-full items-center gap-1 border-l-4 px-2 py-1 text-left hover:bg-[var(--factory1-surface-muted)]",
        active
          ? "border-[#0F172A] bg-[#0F172A] font-semibold text-white"
          : "border-transparent"
      )}
    >
      <span
        className={cn(
          "w-12 shrink-0 font-bold",
          active ? "text-[#FCA5A5]" : "text-[#EF4444]"
        )}
      >
        {item.key ?? item.shortcut ?? ""}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </button>
  );
}

function GatewayShortcutButton({
  shortcut,
  currentHref,
  onNavigate,
}: {
  shortcut: AppShortcut;
  currentHref: string;
  onNavigate: (href: string) => void;
}) {
  const theme = moduleTheme[moduleForHref(shortcut.href)];
  const active = Boolean(
    shortcut.href && isShortcutActive(currentHref, shortcut.href)
  );

  return (
    <button
      type="button"
      title={shortcut.description}
      onClick={() => runShortcut(shortcut, onNavigate)}
      className={cn(
        "flex min-h-7 w-full items-center gap-1 border-l-4 px-2 py-1 text-left hover:bg-[var(--factory1-surface-muted)]",
        active ? "font-semibold" : "border-transparent"
      )}
      style={
        active
          ? {
              backgroundColor: theme.light,
              borderLeftColor: theme.color,
            }
          : undefined
      }
    >
      <span className="w-12 shrink-0 font-bold text-[#EF4444]">
        {shortcut.key}
      </span>
      <span className="min-w-0 flex-1 truncate">{shortcut.tallyHint}</span>
      {!shortcut.exactTally ? (
        <span className="shrink-0 text-[9px] text-[var(--factory1-text-muted)]">
          F1
        </span>
      ) : null}
    </button>
  );
}

function runShortcut(
  shortcut: AppShortcut,
  navigate: (href: string) => void
) {
  if (shortcut.opensMenu) {
    window.dispatchEvent(new Event(openShortcutsMenuEvent));
    return;
  }

  if (shortcut.href) {
    navigate(shortcut.href);
  }
}

function isShortcutActive(currentHref: string, href: string) {
  const currentPath = currentHref.split("?")[0];
  const hrefPath = href.split("?")[0];

  if (href.includes("?")) {
    return currentHref === href;
  }

  return currentPath === hrefPath;
}
