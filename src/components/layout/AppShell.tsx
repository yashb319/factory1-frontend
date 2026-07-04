"use client";

import { useState } from "react";
import { FactoryWalkthrough } from "@/components/help/FactoryWalkthrough";
import { FloatingAssistant } from "@/features/ai/components/FloatingAssistant";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

      <FactoryWalkthrough />
      <FloatingAssistant />
    </div>
  );
}
