"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Factory } from "lucide-react";
import { navigationItems } from "@/config/navigation";
import { useAppSelector } from "@/lib/hook";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onToggleCollapsed: () => void;
};

export function Sidebar({
  collapsed,
  mobileOpen,
  onMobileOpenChange,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);

  const items = navigationItems.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  return (
    <>
      <aside
        data-tour="sidebar"
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen border-r bg-slate-950 text-white transition-all duration-200 lg:block",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          pathname={pathname}
          items={items}
          onToggleCollapsed={onToggleCollapsed}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 border-r bg-slate-950 p-0 text-white"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Factory1 navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            collapsed={false}
            pathname={pathname}
            items={items}
            onNavigate={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

type SidebarContentProps = {
  collapsed: boolean;
  pathname: string;
  items: typeof navigationItems;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
};

function SidebarContent({
  collapsed,
  pathname,
  items,
  onToggleCollapsed,
  onNavigate,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 items-center gap-3 border-b border-slate-800 px-5",
          collapsed && "justify-center px-3"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
          <Factory size={20} />
        </div>

        {!collapsed ? (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Factory1</h1>
            <p className="truncate text-xs text-slate-400">Operations OS</p>
          </div>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center rounded-lg text-sm transition",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed ? <span className="truncate">{item.title}</span> : null}
            </Link>
          );
        })}
      </nav>

      {onToggleCollapsed ? (
        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            data-tour="sidebar-collapse"
            className={cn(
              "flex h-10 w-full items-center rounded-lg text-sm text-slate-300 hover:bg-slate-900 hover:text-white",
              collapsed ? "justify-center" : "justify-between px-3"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!collapsed ? <span>Collapse</span> : null}
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      ) : null}
    </div>
  );
}
