"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  UserCircle,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { startFactoryWalkthrough } from "@/components/help/FactoryWalkthrough";
import { logout } from "@/features/auth/authSlice";
import { useGetDashboardSummaryQuery } from "@/features/dashboard/api/dashboardApi";
import { navigationItems } from "@/config/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/lib/hook";
import { cn } from "@/lib/utils";

type TopbarProps = {
  onMenuClick: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role;
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: dashboard } = useGetDashboardSummaryQuery();

  const searchableItems = useMemo(() => {
    const visibleNavigation = navigationItems
      .filter((item) => !role || item.roles.includes(role))
      .map((item) => ({
        title: item.title,
        href: item.href,
        icon: item.icon,
        keywords: keywordsByHref[item.href] ?? [],
        description: descriptionByHref[item.href] ?? "Open module",
      }));

    return visibleNavigation;
  }, [role]);

  const filteredItems = useMemo(() => {
    const normalized = normalize(query);

    if (!normalized) {
      return searchableItems;
    }

    return searchableItems.filter((item) => {
      const haystack = normalize(
        [item.title, item.href, item.description, ...item.keywords].join(" ")
      );

      return haystack.includes(normalized);
    });
  }, [query, searchableItems]);

  const notifications = useMemo(
    () => buildNotifications(dashboard),
    [dashboard]
  );

  const unreadCount = notifications.filter(
    (notification) => notification.tone !== "good"
  ).length;

  function handleLogout() {
    dispatch(logout());
    router.replace("/login");
  }

  function navigateTo(href: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  }

  function handleSearchSubmit() {
    const first = filteredItems[0];

    if (first) {
      navigateTo(first.href);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-6 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          data-tour="mobile-menu"
          className="rounded-lg border p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <div
          data-tour="global-search"
          className="relative hidden w-full max-w-md items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:flex"
        >
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearchSubmit();
              }

              if (event.key === "Escape") {
                setSearchOpen(false);
              }
            }}
            placeholder="Search modules, invoices, stock..."
            className="w-full bg-transparent outline-none"
          />

          {searchOpen ? (
            <div className="absolute left-0 top-12 z-50 w-full overflow-hidden rounded-lg border bg-white shadow-xl">
              <SearchResults
                items={filteredItems}
                activeHref={pathname}
                onNavigate={navigateTo}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSearchOpen((current) => !current)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            ) : null}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Live signals from your Factory1 dashboard
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {notifications.map((notification, index) => {
              const Icon = notification.icon;

              return (
                <DropdownMenuItem
                  key={`${notification.title}-${index}`}
                  className="items-start gap-3 px-2 py-2"
                  onClick={() => router.push(notification.href)}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      notification.tone === "danger" &&
                        "bg-red-50 text-red-700",
                      notification.tone === "warning" &&
                        "bg-amber-50 text-amber-700",
                      notification.tone === "good" &&
                        "bg-green-50 text-green-700",
                      notification.tone === "neutral" &&
                        "bg-slate-100 text-slate-700"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {notification.description}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            data-tour="account-menu"
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
          >
            <UserCircle size={20} />
            <span className="hidden font-medium sm:inline">
              {user?.name || "Owner"}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">
                  {user?.name || "Factory Owner"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "owner@factory1.com"}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => {
                window.setTimeout(startFactoryWalkthrough, 0);
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Product Walkthrough
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/organization-settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Organization Settings
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {searchOpen ? (
        <div className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-lg border bg-white shadow-xl sm:hidden">
          <div className="flex items-center gap-2 border-b px-3 py-2 text-sm text-slate-500">
            <Search size={16} />
            <input
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearchSubmit();
                }

                if (event.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              placeholder="Search modules, invoices, stock..."
              className="w-full bg-transparent outline-none"
            />
          </div>
          <SearchResults
            items={filteredItems}
            activeHref={pathname}
            onNavigate={navigateTo}
          />
        </div>
      ) : null}
    </header>
  );
}

type SearchItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
  keywords: string[];
};

function SearchResults({
  items,
  activeHref,
  onNavigate,
}: {
  items: SearchItem[];
  activeHref: string;
  onNavigate: (href: string) => void;
}) {
  if (!items.length) {
    return (
      <div className="px-3 py-4 text-sm text-muted-foreground">
        No matching module found.
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto p-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeHref === item.href;

        return (
          <button
            key={item.href}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onNavigate(item.href)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100",
              active && "bg-slate-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900">
                {item.title}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type Notification = {
  title: string;
  description: string;
  href: string;
  tone: "danger" | "warning" | "good" | "neutral";
  icon: React.ComponentType<{ className?: string; size?: number }>;
};

function buildNotifications(
  dashboard?: {
    lowStockItems?: number;
    absentToday?: number;
    latestPayrollAmount?: number;
    latestPayrollPeriod?: string;
    bills?: number;
    recentActivity?: string[];
    insights?: string[];
  }
): Notification[] {
  if (!dashboard) {
    return [
      {
        title: "Loading factory signals",
        description: "Notifications will appear after dashboard data loads.",
        href: "/dashboard",
        tone: "neutral",
        icon: Bell,
      },
    ];
  }

  const notifications: Notification[] = [];

  if ((dashboard.lowStockItems ?? 0) > 0) {
    notifications.push({
      title: `${dashboard.lowStockItems} low-stock item(s)`,
      description: "Review inventory and reorder planning.",
      href: "/inventory",
      tone: "warning",
      icon: Package,
    });
  }

  if ((dashboard.absentToday ?? 0) > 0) {
    notifications.push({
      title: `${dashboard.absentToday} absent today`,
      description: "Check attendance and shift coverage.",
      href: "/attendance",
      tone: "warning",
      icon: CalendarCheck,
    });
  }

  if ((dashboard.latestPayrollAmount ?? 0) > 0) {
    notifications.push({
      title: "Latest payroll ready",
      description: `${dashboard.latestPayrollPeriod ?? "Latest run"} is available for review.`,
      href: "/payroll",
      tone: "neutral",
      icon: Wallet,
    });
  }

  if ((dashboard.bills ?? 0) > 0) {
    notifications.push({
      title: `${dashboard.bills} bill(s) recorded`,
      description: "Open billing to review sales and supplier bills.",
      href: "/billing",
      tone: "neutral",
      icon: FileText,
    });
  }

  (dashboard.insights ?? []).slice(0, 2).forEach((insight) => {
    notifications.push({
      title: "Factory insight",
      description: insight,
      href: "/dashboard",
      tone: "neutral",
      icon: AlertTriangle,
    });
  });

  if (!notifications.length) {
    notifications.push({
      title: "Factory looks stable",
      description: "No urgent dashboard signals right now.",
      href: "/dashboard",
      tone: "good",
      icon: Bell,
    });
  }

  return notifications.slice(0, 6);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const keywordsByHref: Record<string, string[]> = {
  "/dashboard": ["home", "overview", "summary", "stats", "analytics"],
  "/employees": ["employee", "staff", "worker", "department", "phone", "mobile"],
  "/attendance": ["attendance", "present", "absent", "leave", "daily"],
  "/payroll": ["payroll", "salary", "wage", "payslip", "payment"],
  "/inventory": ["inventory", "stock", "material", "raw", "finished", "reorder"],
  "/products": ["product", "bom", "production", "finished good"],
  "/billing": ["billing", "invoice", "bill", "sales", "purchase", "gst"],
  "/suppliers": ["supplier", "vendor", "purchase", "material"],
  "/customers": ["customer", "client", "buyer", "sales"],
  "/import-export": ["import", "export", "csv", "history", "download"],
  "/ai": ["ai", "chat", "assistant", "question"],
  "/organization-settings": ["settings", "organization", "org", "access", "role", "user"],
};

const descriptionByHref: Record<string, string> = {
  "/dashboard": "Live overview and recent factory activity",
  "/employees": "Manage employee records and details",
  "/attendance": "Track daily attendance and leaves",
  "/payroll": "Generate and review salary runs",
  "/inventory": "Manage stock, materials and movements",
  "/products": "Manage products, BOM and production",
  "/billing": "Create sales and supplier bills",
  "/suppliers": "Manage supplier records",
  "/customers": "Manage customer records",
  "/import-export": "View import and export history",
  "/ai": "Open full AI assistant chat",
  "/organization-settings": "Manage org settings and access",
};
