"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FactoryWalkthrough } from "@/components/help/FactoryWalkthrough";
import { FloatingAssistant } from "@/features/ai/components/FloatingAssistant";
import type { AuthUser } from "@/features/auth/types";
import {
  type AppShortcut,
  openShortcutsMenuEvent,
  visibleShortcuts,
} from "@/config/shortcuts";
import { useAppSelector } from "@/lib/hook";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { gatewayMenuItems, TallyGatewayHome } from "./TallyGatewayHome";
import { UiModePrompt } from "./UiModePrompt";
import { cn } from "@/lib/utils";
import { playUiSound } from "@/lib/uiSounds";
import { toast } from "sonner";
import { moduleForHref, moduleTheme } from "@/config/theme";
import {
  type FactoryUiMode,
  getFactoryUiMode,
  shouldShowFactoryUiModePrompt,
  UI_MODE_CHANGED_EVENT,
} from "@/lib/uiModePreference";

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [uiMode, setUiMode] = useState<FactoryUiMode>("modern");
  const [uiModePromptOpen, setUiModePromptOpen] = useState(false);
  const tallyMode = uiMode === "tally";

  useEffect(() => {
    setUiMode(getFactoryUiMode(user));
    setUiModePromptOpen(Boolean(user) && shouldShowFactoryUiModePrompt(user));

    function handleModeChange(event: Event) {
      const detail = (event as CustomEvent<{ mode?: FactoryUiMode }>).detail;
      setUiMode(detail?.mode ?? getFactoryUiMode(user));
    }

    window.addEventListener(UI_MODE_CHANGED_EVENT, handleModeChange);

    return () =>
      window.removeEventListener(UI_MODE_CHANGED_EVENT, handleModeChange);
  }, [user]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.repeat && (event.key === "Enter" || event.key === "Escape")) {
        playUiSound(event.key === "Enter" ? "enter" : "escape");
      }

      if (tallyMode && event.key === "Escape" && pathname !== "/dashboard") {
        event.preventDefault();
        event.stopPropagation();
        router.push("/dashboard");
        return;
      }

      if (tallyMode && event.key === "Backspace") {
        const target = event.target as HTMLElement | null;
        const editing =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.getAttribute("contenteditable") === "true";

        if (!editing) {
          event.preventDefault();
          event.stopPropagation();
          if (pathname !== "/dashboard") {
            router.push("/dashboard");
          }
          return;
        }
      }

      const allShortcuts = visibleShortcuts(user).filter((shortcut) =>
        tallyMode ? shortcut.exactTally : !shortcut.exactTally
      );

      if (
        tallyMode &&
        pathname === "/dashboard" &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "a"
      ) {
        return;
      }

      const matchedShortcut = allShortcuts.find((shortcut) =>
        matchesShortcut(event, shortcut.key)
      );

      if (matchedShortcut?.href || matchedShortcut?.opensMenu) {
        event.preventDefault();
        event.stopPropagation();
        runShortcut(matchedShortcut, router.push);
        return;
      }

      if (
        matchedShortcut &&
        !["F2", "F3", "F11"].includes(matchedShortcut.key)
      ) {
        event.preventDefault();
        event.stopPropagation();
        toast.info(
          `${matchedShortcut.title} shortcut recognized. Screen action is not developed yet.`
        );
        return;
      }

      if (!/^F([1-9]|1[0-2])$/.test(event.key)) {
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (pathname === "/billing" && isBillingShortcut(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("factory1:billing-shortcut", {
            detail: {
              key: event.key,
            },
          })
        );
        return;
      }

      if (pathname === "/accounting" && isAccountingShortcut(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("factory1:accounting-shortcut", {
            detail: {
              key: event.key,
            },
          })
        );
        return;
      }

      const shortcut = allShortcuts.find(
        (entry) => entry.key === event.key
      );

      if (!shortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      runShortcut(shortcut, router.push);
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [pathname, router, tallyMode, user]);

  return (
    <div
      className={cn(
        "min-h-screen bg-[var(--factory1-background)] text-[var(--factory1-text-primary)]",
        tallyMode ? "factory1-tally-mode" : ""
      )}
      data-ui-mode={uiMode}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        desktopVisible={!tallyMode}
      />

      <div
        className={cn(
          "min-h-screen",
          tallyMode
            ? "overflow-hidden lg:pr-48"
            : sidebarCollapsed
              ? "lg:pl-20"
              : "lg:pl-64"
        )}
      >
        {!tallyMode ? (
          <Topbar
            onMenuClick={() => setMobileSidebarOpen(true)}
            uiMode={uiMode}
          />
        ) : null}

        <main
          data-tour="workspace"
          className={cn(
            "bg-[var(--factory1-background)]",
            tallyMode
              ? "h-[calc(100vh-2rem)] overflow-hidden p-0"
              : "p-4 pb-24 sm:p-5 sm:pb-24"
          )}
        >
          {tallyMode && pathname === "/dashboard" ? (
            <TallyGatewayHome user={user} onNavigate={router.push} />
          ) : (
            children
          )}
        </main>
      </div>

      {tallyMode ? (
        <>
          <TallyShortcutRail
            user={user}
            currentHref={`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
            onNavigate={router.push}
          />
          <TallyCommandBar />
        </>
      ) : null}

      <UiModePrompt
        open={uiModePromptOpen}
        user={user}
        onOpenChange={setUiModePromptOpen}
        onSelect={setUiMode}
      />

      {!user?.platformAdmin ? (
        <>
          <FactoryWalkthrough />
          <FloatingAssistant />
        </>
      ) : null}
    </div>
  );
}

function TallyShortcutRail({
  user,
  currentHref,
  onNavigate,
}: {
  user: AuthUser | null;
  currentHref: string;
  onNavigate: (href: string) => void;
}) {
  const shortcuts = visibleShortcuts(user);
  const onGateway = currentHref.startsWith("/dashboard");
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

function TallyCommandBar() {
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
        Gateway: F1
      </div>
    </footer>
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

function matchesShortcut(event: KeyboardEvent, key: string) {
  const parts = key.split("+");
  const expectedKey = parts.pop()?.toLowerCase() ?? "";
  const needsAlt = parts.includes("Alt");
  const needsCtrl = parts.includes("Ctrl");
  const needsShift = parts.includes("Shift");
  const needsMeta = parts.includes("Meta");

  if (
    event.altKey !== needsAlt ||
    event.ctrlKey !== needsCtrl ||
    event.shiftKey !== needsShift ||
    event.metaKey !== needsMeta
  ) {
    return false;
  }

  const normalizedKey = event.key.toLowerCase();
  const normalizedCode = event.code.toLowerCase();
  const expectedCode = /^\d$/.test(expectedKey)
    ? `digit${expectedKey}`
    : expectedKey.length === 1
      ? `key${expectedKey}`
      : expectedKey.toLowerCase();

  return normalizedKey === expectedKey || normalizedCode === expectedCode;
}

function isShortcutActive(currentHref: string, href: string) {
  const currentPath = currentHref.split("?")[0];
  const hrefPath = href.split("?")[0];

  if (href.includes("?")) {
    return currentHref === href;
  }

  return currentPath === hrefPath;
}

function Command({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <div className={cn("flex min-w-24 items-center px-2", strong && "font-bold")}>
      {label}
    </div>
  );
}

function isBillingShortcut(key: string) {
  return [
    "F2",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
  ].includes(key);
}

function isAccountingShortcut(key: string) {
  return [
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
  ].includes(key);
}
