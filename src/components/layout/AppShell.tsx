"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FactoryWalkthrough } from "@/components/help/FactoryWalkthrough";
import { FloatingAssistant } from "@/features/ai/components/FloatingAssistant";
import {
  openShortcutsMenuEvent,
  visibleShortcuts,
} from "@/config/shortcuts";
import { useAppSelector } from "@/lib/hook";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
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

      const shortcut = visibleShortcuts(user).find(
        (entry) => entry.key === event.key
      );

      if (!shortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (shortcut.opensMenu) {
        window.dispatchEvent(new Event(openShortcutsMenuEvent));
        return;
      }

      if (shortcut.href) {
        router.push(shortcut.href);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [pathname, router, user]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />

      <div className={sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}>
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />

        <main data-tour="workspace" className="p-4 pb-24 sm:p-6 sm:pb-24">
          {children}
        </main>
      </div>

      {!user?.platformAdmin ? (
        <>
          <FactoryWalkthrough />
          <FloatingAssistant />
        </>
      ) : null}
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
