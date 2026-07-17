"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FactoryWalkthrough } from "@/components/help/FactoryWalkthrough";
import { FloatingAssistant } from "@/features/ai/components/FloatingAssistant";
import { type AppShortcut, visibleShortcuts } from "@/config/shortcuts";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { logout } from "@/features/auth/authSlice";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { TallyGatewayHome } from "./TallyGatewayHome";
import { TallyShortcutRail } from "./TallyShortcutRail";
import { TallyCommandBar } from "./TallyCommandBar";
import { UiModePrompt } from "./UiModePrompt";
import { cn } from "@/lib/utils";
import { playUiSound } from "@/lib/uiSounds";
import { toast } from "sonner";
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
  const dispatch = useAppDispatch();
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

      if (tallyMode && event.key === "Escape" && pathname !== "/gateway") {
        event.preventDefault();
        event.stopPropagation();
        if (pathname.startsWith("/tally/inventory")) {
          router.push("/gateway?menu=inventory");
          return;
        }
        if (pathname.startsWith("/tally/product")) {
          router.push("/gateway?menu=product");
          return;
        }
        if (pathname.startsWith("/tally/suppliers")) {
          router.push("/gateway?menu=suppliers");
          return;
        }
        if (pathname.startsWith("/tally/customers")) {
          router.push("/gateway?menu=customers");
          return;
        }
        if (pathname.startsWith("/tally/employees")) {
          router.push("/gateway?menu=employees");
          return;
        }
        if (pathname.startsWith("/tally/attendance")) {
          router.push("/gateway?menu=attendance");
          return;
        }
        if (pathname.startsWith("/tally/accounting")) {
          router.push("/gateway?menu=accounting");
          return;
        }
        if (pathname.startsWith("/tally/billing")) {
          router.push("/gateway?menu=billing");
          return;
        }
        if (pathname.startsWith("/tally/payroll")) {
          router.push("/gateway?menu=payroll");
          return;
        }
        if (pathname.startsWith("/tally/dashboard")) {
          router.push("/gateway?menu=dashboard");
          return;
        }
        if (pathname.startsWith("/tally/org-settings")) {
          router.push("/gateway");
          return;
        }
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/gateway");
        }
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
          if (pathname !== "/gateway") {
            router.push("/gateway");
          }
          return;
        }
      }

      const allShortcuts = visibleShortcuts(user).filter((shortcut) =>
        tallyMode ? shortcut.exactTally : !shortcut.exactTally
      );

      if (
        tallyMode &&
        pathname === "/gateway" &&
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
          {tallyMode && pathname === "/gateway" ? (
            <TallyGatewayHome
              user={user}
              onNavigate={router.push}
              onLogout={() => {
                dispatch(logout());
                router.push("/login");
              }}
            />
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

export function runShortcut(
  shortcut: AppShortcut,
  navigate: (href: string) => void
) {
  if (shortcut.opensMenu) {
    window.dispatchEvent(new Event("factory1:open-shortcuts-menu"));
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
