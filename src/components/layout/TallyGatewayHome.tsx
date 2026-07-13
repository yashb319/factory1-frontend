"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { AuthUser } from "@/features/auth/types";
import { visibleShortcuts } from "@/config/shortcuts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "@/features/organization-settings/api/organizationSettingsApi";
import type { OrganizationSettingsRequest } from "@/features/organization-settings/types/organizationSettings.types";
import { playUiSound } from "@/lib/uiSounds";
import {
  useGetDashboardSummaryQuery,
  useGetDashboardTrendsQuery,
} from "@/features/dashboard/api/dashboardApi";
import type {
  DashboardSummary,
  DashboardTrendBucket,
} from "@/features/dashboard/types/dashboard.types";
import {
  useGetAccountingGstSummaryQuery,
  useGetAgingReportQuery,
  useGetLedgerReportQuery,
  useGetProfitLossQuery,
} from "@/features/accounting/api/accountingApi";
import type {
  AgingReport,
  LedgerReport,
  ProfitLoss,
} from "@/features/accounting/types/accounting.types";
import { useGetInventoryDashboardQuery } from "@/features/inventory/api/inventoryApi";
import type { InventoryDashboard } from "@/features/inventory/types/inventory.types";
import type { GstReport } from "@/features/billing/types/billing.types";

type TallyGatewayHomeProps = {
  user: AuthUser | null;
  onNavigate: (href: string) => void;
};

type GatewayItem = {
  key?: string;
  shortcut?: string;
  label: string;
  href: string;
  developed?: boolean;
};

type CompanyScreen =
  | "gateway"
  | "company"
  | "alterCompany"
  | "dashboard"
  | "dashboardReport";

type DashboardReportKey =
  | "BUSINESS_OVERVIEW"
  | "CASH_BANK"
  | "RECEIVABLES"
  | "PAYABLES"
  | "STOCK_SUMMARY"
  | "SALES_TREND"
  | "PURCHASE_TREND"
  | "GST_SUMMARY";

type AlterCompanyDraft = {
  organizationName: string;
  mailingName: string;
  location: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstNumber: string;
  businessType: string;
  industryType: string;
  employeeCountEstimate: string;
  financialYearStartMonth: string;
  currency: string;
  timezone: string;
};

export const gatewayMenuItems: GatewayItem[] = [
  { key: "C", label: "Company", href: "/organization-settings?section=company" },
  { key: "D", label: "Dashboard", href: "/dashboard" },
  { key: "M", label: "Masters", href: "/accounting?workspace=MASTERS" },
  { key: "T", label: "Transactions", href: "/accounting?workspace=VOUCHERS" },
  { key: "B", label: "Banking", href: "/accounting?workspace=CASH_BANK" },
  { key: "R", label: "Reports", href: "/accounting?workspace=REPORTS" },
  { key: "U", label: "Utilities", href: "/import-export" },
  { key: "I", label: "Import", href: "/import-export" },
  { key: "E", label: "Export", href: "/import-export" },
  { shortcut: "F12", label: "Configuration", href: "/organization-settings" },
  { shortcut: "F1", label: "Help", href: "/docs" },
];

const companyMenuItems: GatewayItem[] = [
  { shortcut: "F3", label: "Select Company", href: "/organization-settings?section=company", developed: false },
  { shortcut: "Alt+K", label: "Create Company", href: "/signup", developed: false },
  { key: "A", label: "Alter Company", href: "/organization-settings?section=company" },
  { key: "S", label: "Shut Company", href: "/login" },
  { key: "B", label: "Backup", href: "/import-export" },
  { key: "R", label: "Restore", href: "/import-export" },
  { key: "P", label: "Split Company Data", href: "/import-export", developed: false },
  { key: "W", label: "Rewrite Data", href: "/import-export", developed: false },
  { key: "Y", label: "Security Control", href: "/organization-settings?section=security" },
  { key: "U", label: "User Management", href: "/organization-settings?section=users" },
  { key: "F", label: "Company Features", href: "/organization-settings?section=features" },
  { shortcut: "F11", label: "F11 Features", href: "/organization-settings?section=features" },
  { shortcut: "F12", label: "F12 Configuration", href: "/organization-settings" },
  { key: "D", label: "Company Data", href: "/organization-settings?section=company-data" },
];

const dashboardMenuItems: Array<GatewayItem & { reportKey?: DashboardReportKey }> = [
  { key: "B", label: "Business Overview", href: "/dashboard", reportKey: "BUSINESS_OVERVIEW" },
  { key: "C", label: "Cash & Bank", href: "/accounting?workspace=CASH_BANK", reportKey: "CASH_BANK" },
  { key: "R", label: "Receivables", href: "/accounting?workspace=OVERVIEW", reportKey: "RECEIVABLES" },
  { key: "P", label: "Payables", href: "/accounting?workspace=OVERVIEW", reportKey: "PAYABLES" },
  { key: "S", label: "Stock Summary", href: "/inventory", reportKey: "STOCK_SUMMARY" },
  { key: "L", label: "Sales Trend", href: "/dashboard", reportKey: "SALES_TREND" },
  { key: "U", label: "Purchase Trend", href: "/dashboard", reportKey: "PURCHASE_TREND" },
  { key: "G", label: "GST Summary", href: "/accounting?workspace=TAXES", reportKey: "GST_SUMMARY" },
  { key: "E", label: "Exception Alerts", href: "/dashboard", developed: false },
];

export function TallyGatewayHome({ user, onNavigate }: TallyGatewayHomeProps) {
  const shortcuts = visibleShortcuts(user).filter((shortcut) => shortcut.exactTally);
  const { data: settingsResponse } = useGetOrganizationSettingsQuery();
  const [updateSettings, updateSettingsState] = useUpdateOrganizationSettingsMutation();
  const orgSettings = settingsResponse?.data;
  const range = selectedDashboardRange(orgSettings);
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: dashboardSummary } = useGetDashboardSummaryQuery(range);
  const { data: dashboardTrends } = useGetDashboardTrendsQuery(range);
  const { data: ledgerReport } = useGetLedgerReportQuery(range);
  const { data: profitLoss } = useGetProfitLossQuery(range);
  const { data: receivablesAging } = useGetAgingReportQuery({
    type: "SALES",
    asOfDate: todayIso,
  });
  const { data: payablesAging } = useGetAgingReportQuery({
    type: "PURCHASE",
    asOfDate: todayIso,
  });
  const { data: gstSummary } = useGetAccountingGstSummaryQuery(range);
  const { data: inventoryDashboard } = useGetInventoryDashboardQuery();
  const [activeMenu, setActiveMenu] = useState<CompanyScreen>("gateway");
  const [activeDashboardReport, setActiveDashboardReport] =
    useState<DashboardReportKey>("BUSINESS_OVERVIEW");
  const currentMenuItems =
    activeMenu === "company"
      ? companyMenuItems
      : activeMenu === "dashboard"
        ? dashboardMenuItems
        : gatewayMenuItems;
  const gatewayItems = useMemo(
    () =>
      currentMenuItems.map((item, index) => ({
        index,
        item,
      })),
    [currentMenuItems]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedHref =
    activeMenu === "alterCompany"
      ? "/organization-settings?section=company"
      : activeMenu === "dashboardReport"
        ? dashboardReportHref(activeDashboardReport)
      : gatewayItems[selectedIndex]?.item.href ?? "/dashboard";
  const [alterDraft, setAlterDraft] = useState<AlterCompanyDraft>(
    emptyAlterCompanyDraft()
  );
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), 3, 1);
  const periodEnd = new Date(today.getFullYear() + (today.getMonth() >= 3 ? 1 : 0), 2, 31);

  useEffect(() => {
    setSelectedIndex((current) =>
      Math.min(Math.max(current, 0), Math.max(gatewayItems.length - 1, 0))
    );
  }, [gatewayItems.length]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeMenu]);

  useEffect(() => {
    if (!orgSettings) {
      return;
    }

    setAlterDraft({
      organizationName: orgSettings.organizationName ?? "",
      mailingName: orgSettings.organizationName ?? "",
      location: orgSettings.location ?? "",
      city: orgSettings.city ?? "",
      state: orgSettings.state ?? "",
      pincode: orgSettings.pincode ?? "",
      country: orgSettings.country ?? "India",
      gstNumber: orgSettings.gstNumber ?? "",
      businessType: orgSettings.businessType ?? "",
      industryType: orgSettings.industryType ?? "",
      employeeCountEstimate: orgSettings.employeeCountEstimate
        ? String(orgSettings.employeeCountEstimate)
        : "",
      financialYearStartMonth: String(orgSettings.financialYearStartMonth ?? 4),
      currency: orgSettings.currency ?? "INR",
      timezone: orgSettings.timezone ?? "Asia/Kolkata",
    });
  }, [orgSettings]);

  useEffect(() => {
    const selected = menuRef.current?.querySelector<HTMLElement>(
      `[data-gateway-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    function handleGatewayKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("role") === "combobox"
      ) {
        return;
      }

      if (activeMenu === "alterCompany") {
        if (event.key === "Escape") {
          event.preventDefault();
          setActiveMenu("company");
        }
        return;
      }

      if (activeMenu === "dashboardReport") {
        if (event.key === "Escape") {
          event.preventDefault();
          setActiveMenu("dashboard");
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) =>
          Math.min(current + 1, gatewayItems.length - 1)
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const columnJump = Math.ceil(gatewayItems.length / 2);
        const direction = event.key === "ArrowRight" ? columnJump : -columnJump;
        setSelectedIndex((current) =>
          Math.min(Math.max(current + direction, 0), gatewayItems.length - 1)
        );
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        setSelectedIndex(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        setSelectedIndex(Math.max(gatewayItems.length - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selected = gatewayItems[selectedIndex]?.item;
        if (!selected) {
          return;
        }
        if (activeMenu === "gateway" && selected.label === "Company") {
          setActiveMenu("company");
          return;
        }
        if (activeMenu === "gateway" && selected.label === "Dashboard") {
          setActiveMenu("dashboard");
          return;
        }
        if (activeMenu === "company" && selected.label === "Alter Company") {
          setActiveMenu("alterCompany");
          return;
        }
        if (activeMenu === "dashboard") {
          const reportKey = dashboardReportKeyFor(selected);
          if (reportKey) {
            setActiveDashboardReport(reportKey);
            setActiveMenu("dashboardReport");
            return;
          }
        }
        if (selected.developed === false) {
          toast.info(`${selected.label} is not developed yet`);
          return;
        }
        onNavigate(selected.href);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (activeMenu !== "gateway") {
          setActiveMenu("gateway");
          return;
        }
        if (selectedIndex > 0) {
          setSelectedIndex(0);
          return;
        }
        onNavigate("/login");
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const itemIndex = gatewayItems.findIndex(
        (entry) => entry.item.key?.toLowerCase() === event.key.toLowerCase()
      );

      if (itemIndex === -1) {
        return;
      }

      const selected = gatewayItems[itemIndex].item;
      event.preventDefault();
      setSelectedIndex(itemIndex);

      if (activeMenu === "gateway" && selected.label === "Company") {
        setActiveMenu("company");
        return;
      }

      if (activeMenu === "gateway" && selected.label === "Dashboard") {
        setActiveMenu("dashboard");
        return;
      }

      if (activeMenu === "company" && selected.label === "Alter Company") {
        setActiveMenu("alterCompany");
        return;
      }

      if (activeMenu === "dashboard") {
        const reportKey = dashboardReportKeyFor(selected);
        if (reportKey) {
          setActiveDashboardReport(reportKey);
          setActiveMenu("dashboardReport");
          return;
        }
      }

      if (selected.developed === false) {
        toast.info(`${selected.label} is not developed yet`);
        return;
      }

      onNavigate(selected.href);
    }

    window.addEventListener("keydown", handleGatewayKey);
    return () => window.removeEventListener("keydown", handleGatewayKey);
  }, [activeMenu, gatewayItems, onNavigate, selectedIndex]);

  async function saveAlterCompany() {
    if (!alterDraft.organizationName.trim()) {
      toast.error("Company name is required");
      return;
    }

    const payload: OrganizationSettingsRequest = {
      workingHoursPerDay: orgSettings?.workingHoursPerDay ?? 8,
      workingDaysPerMonth: orgSettings?.workingDaysPerMonth ?? 26,
      overtimeMultiplier: orgSettings?.overtimeMultiplier ?? 1.5,
      currency: alterDraft.currency || orgSettings?.currency || "INR",
      timezone: alterDraft.timezone || orgSettings?.timezone || "Asia/Kolkata",
      weekStartDay: orgSettings?.weekStartDay ?? "MONDAY",
      financialYearStartMonth: Number(alterDraft.financialYearStartMonth || 4),
      organizationName: alterDraft.organizationName.trim(),
      location: alterDraft.location,
      city: alterDraft.city,
      pincode: alterDraft.pincode,
      country: alterDraft.country || "India",
      industryType: alterDraft.industryType,
      employeeCountEstimate: alterDraft.employeeCountEstimate
        ? Number(alterDraft.employeeCountEstimate)
        : undefined,
      gstNumber: alterDraft.gstNumber.trim().toUpperCase(),
      businessType: alterDraft.businessType,
      state: alterDraft.state,
      activeAccountingPeriodStart: orgSettings?.activeAccountingPeriodStart,
      activeAccountingPeriodEnd: orgSettings?.activeAccountingPeriodEnd,
      accountingMastersEnabled: orgSettings?.accountingMastersEnabled,
      accountingVouchersEnabled: orgSettings?.accountingVouchersEnabled,
      accountingTaxationEnabled: orgSettings?.accountingTaxationEnabled,
      accountingReportsEnabled: orgSettings?.accountingReportsEnabled,
      tdsEnabled: orgSettings?.tdsEnabled,
      tcsEnabled: orgSettings?.tcsEnabled,
    };

    try {
      await updateSettings(payload).unwrap();
      toast.success("Company altered");
      setActiveMenu("company");
    } catch {
      toast.error("Could not alter company");
    }
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="grid min-h-7 grid-cols-2 border-b border-[#0F766E] bg-[#C8E6C9] text-xs sm:grid-cols-4 lg:grid-cols-8">
        {gatewayTopActions(selectedHref).map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={!action.enabled}
            onClick={() => {
              if (action.enabled) {
                onNavigate(action.href);
              }
            }}
            className={[
              "border-r border-[#0F766E] px-2 py-1 text-left",
              action.enabled
                ? "hover:bg-[#6366F1] hover:text-white"
                : "cursor-not-allowed text-slate-500 opacity-60",
            ].join(" ")}
            title={
              action.enabled
                ? `${action.key}: ${action.label}`
                : `${action.label} is not available here`
            }
          >
            <span
              className={[
                "font-bold",
                action.enabled ? "text-[#EF4444]" : "text-slate-500",
              ].join(" ")}
            >
              {action.key}
            </span>
            <span>: {action.label}</span>
          </button>
        ))}
      </div>

      <div className="grid h-[calc(100%-7rem)] min-h-0 gap-0 overflow-hidden lg:grid-cols-[minmax(260px,0.9fr)_minmax(360px,1fr)]">
        <section className="min-h-0 overflow-hidden border-r border-[#0F766E] p-3">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <div className="italic">Current Period</div>
              <div className="font-semibold">
                {formatDate(periodStart)} to {formatDate(periodEnd)}
              </div>
            </div>
            <div>
              <div className="italic">Current Date</div>
              <div className="font-semibold">
                {today.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-[1fr_auto] gap-y-5">
            <span className="italic">Name of Company</span>
            <span className="italic">Date of Last Entry</span>
            <span className="font-semibold">
              {user?.organizationId ? "Factory1 Organization" : "Factory1"}
            </span>
            <span className="font-semibold">No Vouchers Entered</span>
          </div>

          <div className="mt-20 max-w-md border-2 border-[#EF4444] bg-[#FEFCE8] p-4">
            <div className="text-center font-semibold underline">Remote User Details</div>
            <div className="mt-6 grid grid-cols-[160px_1fr] gap-y-1 text-xs">
              <span className="font-semibold">My Remote ID</span>
              <span>: {user?.email ?? "factory1@user"}</span>
              <span className="font-semibold">My Remote Login Time</span>
              <span>: {new Date().toLocaleString("en-IN")}</span>
              <span className="font-semibold">Active Sessions</span>
              <span>: 1</span>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 items-start justify-center overflow-hidden p-2">
          <div
            ref={menuRef}
            className="h-full w-full max-w-3xl overflow-hidden border border-[#0F766E] bg-[#D9F99D]/40 px-8 py-4"
          >
            {activeMenu === "alterCompany" ? (
              <AlterCompanyScreen
                draft={alterDraft}
                saving={updateSettingsState.isLoading}
                onBack={() => setActiveMenu("company")}
                onChange={(patch) =>
                  setAlterDraft((current) => ({ ...current, ...patch }))
                }
                onSave={saveAlterCompany}
              />
            ) : activeMenu === "dashboardReport" ? (
              <DashboardReportScreen
                reportKey={activeDashboardReport}
                summary={dashboardSummary}
                trends={dashboardTrends?.buckets ?? []}
                ledgerReport={ledgerReport}
                profitLoss={profitLoss}
                receivablesAging={receivablesAging}
                payablesAging={payablesAging}
                gstSummary={gstSummary}
                inventoryDashboard={inventoryDashboard}
                onBack={() => setActiveMenu("dashboard")}
              />
            ) : (
            <div className="mx-auto grid max-w-md gap-y-1">
              {gatewayItems.map(({ item, index }) => {
                const disabled = item.developed === false;
                const selected = index === selectedIndex;

                return (
                  <button
                    key={`${item.label}-${item.shortcut ?? item.key ?? ""}`}
                    type="button"
                    data-gateway-index={index}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      setSelectedIndex(index);
                      if (activeMenu === "gateway" && item.label === "Company") {
                        setActiveMenu("company");
                        return;
                      }
                      if (activeMenu === "gateway" && item.label === "Dashboard") {
                        setActiveMenu("dashboard");
                        return;
                      }
                      if (activeMenu === "dashboard") {
                        const reportKey = dashboardReportKeyFor(item);
                        if (reportKey) {
                          setActiveDashboardReport(reportKey);
                          setActiveMenu("dashboardReport");
                          return;
                        }
                      }
                      if (!disabled) {
                        onNavigate(item.href);
                      } else {
                        toast.info(`${item.label} is not developed yet`);
                      }
                    }}
                    title={
                      disabled
                        ? "Not developed yet"
                        : item.key
                          ? `Press ${item.key}`
                          : item.shortcut
                            ? `Press ${item.shortcut}`
                            : item.label
                    }
                    className={[
                      "grid w-full grid-cols-[62px_1fr_auto] gap-2 px-3 py-0.5 text-left outline-none",
                      selected ? "bg-[#0F172A] text-white" : "",
                      disabled
                        ? selected
                          ? "cursor-not-allowed opacity-80"
                          : "cursor-not-allowed text-slate-500 opacity-70"
                        : "hover:bg-[#6366F1] hover:text-white",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "font-bold",
                        selected ? "text-[#FCA5A5]" : "text-[#EF4444]",
                      ].join(" ")}
                    >
                      {item.key ?? item.shortcut ?? ""}
                    </span>
                    <span>{item.label}</span>
                    {disabled ? (
                      <span
                        className={[
                          "text-[10px] italic",
                          selected ? "text-slate-200" : "text-slate-500",
                        ].join(" ")}
                      >
                        Not developed yet
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onNavigate("/login")}
                className="block w-full px-3 py-0.5 text-left hover:bg-[#6366F1] hover:text-white"
              >
                Quit
              </button>
            </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid border-t border-[#0F766E] bg-[#BBF7D0] text-xs lg:grid-cols-[180px_1fr_1fr_1fr]">
        <div className="border-r border-[#0F766E] p-2">
          <div className="text-center font-semibold">Factory1</div>
          <div className="mt-1 text-center text-[11px]">AI-first ERP</div>
        </div>
        <div className="border-r border-[#0F766E] p-2">
          <div className="font-semibold">Version</div>
          <div>Cloud SaaS · Latest</div>
          <div>Keyboard-first mode enabled</div>
        </div>
        <div className="border-r border-[#0F766E] p-2">
          <div className="font-semibold">Configuration</div>
          <div>Use F12 Configure or Org Settings to change UI mode.</div>
        </div>
        <div className="p-2">
          <div className="font-semibold">Keyboard</div>
          <div className="flex flex-wrap gap-2 pt-1">
            {shortcuts.slice(0, 6).map((shortcut) => (
              <Button
                key={shortcut.key}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 rounded-sm bg-[#ECFDF5] px-2 text-[11px]"
                onClick={() => shortcut.href && onNavigate(shortcut.href)}
              >
                {shortcut.key}: {shortcut.tallyHint}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function DashboardReportScreen({
  reportKey,
  summary,
  trends,
  ledgerReport,
  profitLoss,
  receivablesAging,
  payablesAging,
  gstSummary,
  inventoryDashboard,
  onBack,
}: {
  reportKey: DashboardReportKey;
  summary?: DashboardSummary;
  trends: DashboardTrendBucket[];
  ledgerReport?: LedgerReport;
  profitLoss?: ProfitLoss;
  receivablesAging?: AgingReport;
  payablesAging?: AgingReport;
  gstSummary?: GstReport;
  inventoryDashboard?: InventoryDashboard;
  onBack: () => void;
}) {
  const chart = dashboardChartFor(reportKey, {
    trends,
    summary,
    ledgerReport,
    profitLoss,
    receivablesAging,
    payablesAging,
    gstSummary,
    inventoryDashboard,
  });
  const rows = dashboardRowsFor(reportKey, {
    summary,
    ledgerReport,
    profitLoss,
    receivablesAging,
    payablesAging,
    gstSummary,
    inventoryDashboard,
  });

  return (
    <div className="mx-auto grid h-full w-full max-w-3xl grid-rows-[auto_1fr_auto] overflow-hidden text-[12px]">
      <div className="border-b border-[#0F766E] bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
        {dashboardReportTitle(reportKey)}
      </div>

      <div className="overflow-hidden px-4 py-3">
        <TallyLineGraph series={chart} />

        <table className="mt-3 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-y border-[#0F766E] bg-[#C8E6C9]">
              <th className="px-2 py-1 text-left">Particulars</th>
              <th className="px-2 py-1 text-right">Value</th>
              <th className="px-2 py-1 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[#94A3B8]/60">
                <td className="px-2 py-1 font-semibold">{row.label}</td>
                <td className="px-2 py-1 text-right">{row.value}</td>
                <td className="px-2 py-1">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onBack}
        >
          Q: Back
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          P: Print
        </span>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          E: Export
        </span>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onBack}
        >
          Esc: Close
        </button>
      </div>
    </div>
  );
}

function TallyLineGraph({
  series,
}: {
  series: Array<{ name: string; color: string; points: Array<{ label: string; value: number }> }>;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 680;
  const height = 210;
  const left = 46;
  const right = 16;
  const top = 18;
  const bottom = 30;
  const allValues = series.flatMap((entry) => entry.points.map((point) => point.value));
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;
  const maxPoints = Math.max(...series.map((entry) => entry.points.length), 1);

  const toX = (index: number) =>
    left + (index / Math.max(maxPoints - 1, 1)) * (width - left - right);
  const toY = (value: number) =>
    top + ((max - value) / range) * (height - top - bottom);
  const hoverLabel =
    hoverIndex !== null ? series[0]?.points[hoverIndex]?.label : undefined;
  const tooltipRows =
    hoverIndex !== null
      ? series.map((entry) => ({
          name: entry.name,
          color: entry.color,
          value: entry.points[hoverIndex]?.value ?? 0,
        }))
      : [];
  const tooltipX =
    hoverIndex !== null
      ? Math.min(Math.max(toX(hoverIndex) + 10, left), width - 180)
      : 0;
  const tooltipY = top + 8;

  return (
    <div className="border border-[#0F766E] bg-[#FEFCE8] p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const svg = event.currentTarget;
          const rect = svg.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * width;
          const rawIndex =
            ((x - left) / Math.max(width - left - right, 1)) *
            Math.max(maxPoints - 1, 1);
          const nextIndex = Math.min(
            Math.max(Math.round(rawIndex), 0),
            Math.max(maxPoints - 1, 0)
          );
          setHoverIndex(nextIndex);
        }}
      >
        {[0, 1, 2, 3].map((line) => {
          const y = top + (line / 3) * (height - top - bottom);
          return (
            <line
              key={line}
              x1={left}
              x2={width - right}
              y1={y}
              y2={y}
              stroke="#94A3B8"
              strokeDasharray="3 3"
              strokeWidth="0.8"
            />
          );
        })}
        <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#0F172A" />
        <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="#0F172A" />
        {series.map((entry) => {
          const d = entry.points
            .map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index)} ${toY(point.value)}`)
            .join(" ");
          return <path key={entry.name} d={d} fill="none" stroke={entry.color} strokeWidth="2" />;
        })}
        {hoverIndex !== null ? (
          <>
            <line
              x1={toX(hoverIndex)}
              x2={toX(hoverIndex)}
              y1={top}
              y2={height - bottom}
              stroke="#0F172A"
              strokeDasharray="2 2"
            />
            {tooltipRows.map((row) => (
              <circle
                key={row.name}
                cx={toX(hoverIndex)}
                cy={toY(row.value)}
                r="3"
                fill={row.color}
                stroke="#0F172A"
                strokeWidth="0.8"
              />
            ))}
            <rect
              x={tooltipX}
              y={tooltipY}
              width="164"
              height={26 + tooltipRows.length * 15}
              fill="#FEFCE8"
              stroke="#0F766E"
              strokeWidth="1.2"
            />
            <text x={tooltipX + 8} y={tooltipY + 16} fontSize="10" fontWeight="700" fill="#0F172A">
              {hoverLabel}
            </text>
            {tooltipRows.map((row, index) => (
              <g key={row.name}>
                <rect
                  x={tooltipX + 8}
                  y={tooltipY + 24 + index * 15}
                  width="8"
                  height="8"
                  fill={row.color}
                />
                <text x={tooltipX + 20} y={tooltipY + 32 + index * 15} fontSize="9" fill="#0F172A">
                  {row.name}: {formatTallyAmount(row.value)}
                </text>
              </g>
            ))}
          </>
        ) : null}
        {series[0]?.points.map((point, index) => (
          <text key={`${point.label}-${index}`} x={toX(index)} y={height - 10} textAnchor="middle" fontSize="8" fill="#0F172A">
            {point.label}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 px-2 text-[11px]">
        {series.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-5" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function AlterCompanyScreen({
  draft,
  saving,
  onBack,
  onChange,
  onSave,
}: {
  draft: AlterCompanyDraft;
  saving: boolean;
  onBack: () => void;
  onChange: (patch: Partial<AlterCompanyDraft>) => void;
  onSave: () => void;
}) {
  const [acceptPromptOpen, setAcceptPromptOpen] = useState(false);

  function requestAccept() {
    playUiSound("post");
    setAcceptPromptOpen(true);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;

    if (acceptPromptOpen) {
      const key = event.key.toLowerCase();

      if (event.key === "Enter" || key === "y") {
        event.preventDefault();
        setAcceptPromptOpen(false);
        onSave();
        return;
      }

      if (event.key === "Escape" || key === "n") {
        event.preventDefault();
        setAcceptPromptOpen(false);
        return;
      }
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onBack();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      requestAccept();
      return;
    }

    if (
      event.key === "Enter" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      const focusable = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          "input:not([disabled]), button:not([disabled])"
        )
      );
      const currentIndex = target ? focusable.indexOf(target) : -1;
      const direction = event.shiftKey ? -1 : 1;
      const next = focusable[currentIndex + direction];

      if (next) {
        next.focus();
      } else if (!event.shiftKey) {
        requestAccept();
      }
    }
  }

  return (
    <div
      className="relative mx-auto grid h-full max-w-2xl grid-rows-[auto_1fr_auto] overflow-hidden text-[12px]"
      data-tally-nav-scope
      onKeyDown={handleKeyDown}
    >
      <div className="border-b border-[#0F766E] bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
        Company Alteration
      </div>
      <div className="grid content-start gap-y-1 overflow-hidden px-6 py-3">
        <TallyCompanyField
          label="Name"
          value={draft.organizationName}
          onChange={(value) => onChange({ organizationName: value })}
          autoFocus
        />
        <TallyCompanyField
          label="Mailing Name"
          value={draft.mailingName}
          onChange={(value) => onChange({ mailingName: value })}
        />
        <TallyCompanyField
          label="Address"
          value={draft.location}
          onChange={(value) => onChange({ location: value })}
        />
        <TallyCompanyField
          label="City"
          value={draft.city}
          onChange={(value) => onChange({ city: value })}
        />
        <TallyCompanyField
          label="Pin Code"
          value={draft.pincode}
          onChange={(value) => onChange({ pincode: value })}
        />
        <TallyCompanyField
          label="State"
          value={draft.state}
          onChange={(value) => onChange({ state: value })}
        />
        <TallyCompanyField
          label="Country"
          value={draft.country}
          onChange={(value) => onChange({ country: value })}
        />

        <div className="mt-2 border-t border-[#0F766E] pt-1 font-bold">
          Statutory Details
        </div>
        <TallyCompanyField
          label="GSTIN/UIN"
          value={draft.gstNumber}
          onChange={(value) => onChange({ gstNumber: value.toUpperCase() })}
        />
        <TallyCompanyField
          label="Business Type"
          value={draft.businessType}
          onChange={(value) => onChange({ businessType: value })}
        />
        <TallyCompanyField
          label="Industry Type"
          value={draft.industryType}
          onChange={(value) => onChange({ industryType: value })}
        />
        <TallyCompanyField
          label="No. of Employees"
          type="number"
          value={draft.employeeCountEstimate}
          onChange={(value) => onChange({ employeeCountEstimate: value })}
        />

        <div className="mt-2 border-t border-[#0F766E] pt-1 font-bold">
          Books and Currency
        </div>
        <TallyCompanyField
          label="FY Start Month"
          type="number"
          value={draft.financialYearStartMonth}
          onChange={(value) => onChange({ financialYearStartMonth: value })}
        />
        <TallyCompanyField
          label="Currency"
          value={draft.currency}
          onChange={(value) => onChange({ currency: value })}
        />
        <TallyCompanyField
          label="Time Zone"
          value={draft.timezone}
          onChange={(value) => onChange({ timezone: value })}
        />
      </div>

      <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#C8E6C9] text-[11px]">
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onBack}
        >
          Q: Back
        </button>
        <button
          type="button"
          className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={requestAccept}
        >
          A: Accept
        </button>
        <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
          D: Delete
        </span>
        <button
          type="button"
          className="px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
          onClick={onBack}
        >
          X: Cancel
        </button>
      </div>

      {acceptPromptOpen ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
          <div className="w-72 border-2 border-[#0F766E] bg-[#FEFCE8] shadow-lg">
            <div className="bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
              Accept?
            </div>
            <div className="space-y-3 px-5 py-4 text-center">
              <div>Save company alteration?</div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <button
                  type="button"
                  autoFocus
                  className="border border-[#0F766E] bg-[#0F172A] px-3 py-1 font-bold text-white"
                  onClick={() => {
                    setAcceptPromptOpen(false);
                    onSave();
                  }}
                >
                  Y: Yes
                </button>
                <button
                  type="button"
                  className="border border-[#0F766E] px-3 py-1 hover:bg-[#6366F1] hover:text-white"
                  onClick={() => setAcceptPromptOpen(false)}
                >
                  N: No
                </button>
              </div>
              <div className="text-[10px] text-slate-600">
                Press Enter/Y to save, N/Esc to edit
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TallyCompanyField({
  label,
  value,
  onChange,
  autoFocus = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  type?: "text" | "number";
}) {
  return (
    <label className="tally-company-field grid grid-cols-[180px_1fr] items-center gap-3">
      <span className="tally-company-label px-1">{label}</span>
      <input
        autoFocus={autoFocus}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-6 border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
      />
    </label>
  );
}

function emptyAlterCompanyDraft(): AlterCompanyDraft {
  return {
    organizationName: "",
    mailingName: "",
    location: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    gstNumber: "",
    businessType: "",
    industryType: "",
    employeeCountEstimate: "",
    financialYearStartMonth: "4",
    currency: "INR",
    timezone: "Asia/Kolkata",
  };
}

function dashboardReportTitle(reportKey: DashboardReportKey) {
  const labels: Record<DashboardReportKey, string> = {
    BUSINESS_OVERVIEW: "Business Overview",
    CASH_BANK: "Cash & Bank",
    RECEIVABLES: "Receivables",
    PAYABLES: "Payables",
    STOCK_SUMMARY: "Stock Summary",
    SALES_TREND: "Sales Trend",
    PURCHASE_TREND: "Purchase Trend",
    GST_SUMMARY: "GST Summary",
  };

  return labels[reportKey];
}

function dashboardReportKeyFor(item: GatewayItem): DashboardReportKey | null {
  if (!("reportKey" in item)) {
    return null;
  }

  const reportKey = item.reportKey;
  return typeof reportKey === "string" ? (reportKey as DashboardReportKey) : null;
}

function dashboardReportHref(reportKey: DashboardReportKey) {
  const hrefs: Record<DashboardReportKey, string> = {
    BUSINESS_OVERVIEW: "/dashboard",
    CASH_BANK: "/accounting?workspace=CASH_BANK",
    RECEIVABLES: "/accounting?workspace=OVERVIEW",
    PAYABLES: "/accounting?workspace=OVERVIEW",
    STOCK_SUMMARY: "/inventory",
    SALES_TREND: "/billing?type=SALES",
    PURCHASE_TREND: "/billing?type=PURCHASE",
    GST_SUMMARY: "/accounting?workspace=TAXES",
  };

  return hrefs[reportKey];
}

type DashboardReportData = {
  summary?: DashboardSummary;
  trends?: DashboardTrendBucket[];
  ledgerReport?: LedgerReport;
  profitLoss?: ProfitLoss;
  receivablesAging?: AgingReport;
  payablesAging?: AgingReport;
  gstSummary?: GstReport;
  inventoryDashboard?: InventoryDashboard;
};

function dashboardChartFor(reportKey: DashboardReportKey, data: DashboardReportData) {
  const trends = data.trends?.length ? data.trends : fallbackTrendBuckets(data.summary);
  const trendPoints = (key: "sales" | "purchases" | "net") =>
    trends.map((bucket) => ({
      label: monthAxisLabel(bucket.period || bucket.label),
      value: Number(bucket[key] ?? 0),
    }));

  if (reportKey === "BUSINESS_OVERVIEW") {
    return [
      { name: "Sales", color: "#059669", points: trendPoints("sales") },
      { name: "Purchase", color: "#0EA5E9", points: trendPoints("purchases") },
      { name: "Net Profit", color: "#EF4444", points: trendPoints("net") },
    ];
  }

  if (reportKey === "SALES_TREND") {
    return [{ name: "Sales", color: "#059669", points: trendPoints("sales") }];
  }

  if (reportKey === "PURCHASE_TREND") {
    return [{ name: "Purchases", color: "#0EA5E9", points: trendPoints("purchases") }];
  }

  if (reportKey === "RECEIVABLES") {
    return agingSeries("Receivables", data.receivablesAging, "#059669");
  }

  if (reportKey === "PAYABLES") {
    return agingSeries("Payables", data.payablesAging, "#EF4444");
  }

  if (reportKey === "STOCK_SUMMARY") {
    const stock = data.inventoryDashboard;
    return [
      {
        name: "Stock Value",
        color: "#6366F1",
        points: [
          { label: "Raw", value: stock?.rawMaterialValue ?? 0 },
          { label: "Finished", value: stock?.finishedGoodsValue ?? 0 },
          { label: "Total", value: stock?.totalInventoryValue ?? 0 },
        ],
      },
    ];
  }

  if (reportKey === "GST_SUMMARY") {
    const gst = data.gstSummary;
    return [
      {
        name: "GST",
        color: "#EA580C",
        points: [
          { label: "Output", value: (gst?.salesCgstAmount ?? 0) + (gst?.salesSgstAmount ?? 0) + (gst?.salesIgstAmount ?? 0) },
          { label: "Input", value: (gst?.purchaseCgstAmount ?? 0) + (gst?.purchaseSgstAmount ?? 0) + (gst?.purchaseIgstAmount ?? 0) },
          { label: "Net", value: gst?.netGstPayable ?? 0 },
        ],
      },
    ];
  }

  return [
    {
      name: "Cash Flow",
      color: "#0EA5E9",
      points: [
        { label: "Receivable", value: data.ledgerReport?.totalReceivables ?? 0 },
        { label: "Payable", value: data.ledgerReport?.totalPayables ?? 0 },
        { label: "Net", value: data.ledgerReport?.netReceivable ?? 0 },
      ],
    },
  ];
}

function dashboardRowsFor(reportKey: DashboardReportKey, data: DashboardReportData) {
  if (reportKey === "BUSINESS_OVERVIEW") {
    return [
      { label: "Sales", value: formatTallyAmount(data.summary?.salesThisMonth), note: "Current selected period" },
      { label: "Purchases", value: formatTallyAmount(data.summary?.purchasesThisMonth), note: "Current selected period" },
      { label: "Gross Profit", value: formatTallyAmount(data.profitLoss?.grossProfit), note: "From P&L" },
      { label: "Net Profit", value: formatTallyAmount(data.profitLoss?.netProfit), note: "From P&L" },
    ];
  }

  if (reportKey === "CASH_BANK") {
    return [
      { label: "Total Receivables", value: formatTallyAmount(data.ledgerReport?.totalReceivables), note: "Ledger report" },
      { label: "Total Payables", value: formatTallyAmount(data.ledgerReport?.totalPayables), note: "Ledger report" },
      { label: "Net Receivable", value: formatTallyAmount(data.ledgerReport?.netReceivable), note: "Positive means collectable" },
    ];
  }

  if (reportKey === "RECEIVABLES") {
    return agingRows(data.receivablesAging);
  }

  if (reportKey === "PAYABLES") {
    return agingRows(data.payablesAging);
  }

  if (reportKey === "STOCK_SUMMARY") {
    const stock = data.inventoryDashboard;
    return [
      { label: "Total Items", value: formatPlainNumber(stock?.totalItems), note: "Inventory masters" },
      { label: "Active Items", value: formatPlainNumber(stock?.activeItems), note: "Available for use" },
      { label: "Low Stock", value: formatPlainNumber(stock?.lowStockItems), note: "Needs attention" },
      { label: "Out of Stock", value: formatPlainNumber(stock?.outOfStockItems), note: "Needs purchase/production" },
      { label: "Inventory Value", value: formatTallyAmount(stock?.totalInventoryValue), note: "Current stock valuation" },
    ];
  }

  if (reportKey === "SALES_TREND") {
    return [
      { label: "Sales This Month", value: formatTallyAmount(data.summary?.salesThisMonth), note: "Dashboard summary" },
      { label: "Bills", value: formatPlainNumber(data.summary?.bills), note: "Recorded bills" },
      { label: "Customers", value: formatPlainNumber(data.summary?.customers), note: "Customer masters" },
    ];
  }

  if (reportKey === "PURCHASE_TREND") {
    return [
      { label: "Purchases This Month", value: formatTallyAmount(data.summary?.purchasesThisMonth), note: "Dashboard summary" },
      { label: "Suppliers", value: formatPlainNumber(data.summary?.suppliers), note: "Supplier masters" },
      { label: "Inventory Value", value: formatTallyAmount(data.summary?.inventoryValue), note: "Stock impact" },
    ];
  }

  const gst = data.gstSummary;
  return [
    { label: "Sales Taxable", value: formatTallyAmount(gst?.salesTaxableAmount), note: "Outward taxable" },
    { label: "Purchase Taxable", value: formatTallyAmount(gst?.purchaseTaxableAmount), note: "Inward taxable" },
    { label: "Output GST", value: formatTallyAmount((gst?.salesCgstAmount ?? 0) + (gst?.salesSgstAmount ?? 0) + (gst?.salesIgstAmount ?? 0)), note: "CGST + SGST + IGST" },
    { label: "Input GST", value: formatTallyAmount((gst?.purchaseCgstAmount ?? 0) + (gst?.purchaseSgstAmount ?? 0) + (gst?.purchaseIgstAmount ?? 0)), note: "Input credit" },
    { label: "Net GST Payable", value: formatTallyAmount(gst?.netGstPayable), note: "Before filing adjustments" },
  ];
}

function agingSeries(name: string, report: AgingReport | undefined, color: string) {
  return [
    {
      name,
      color,
      points: [
        { label: "Current", value: report?.currentAmount ?? 0 },
        { label: "1-30", value: report?.days1To30Amount ?? 0 },
        { label: "31-60", value: report?.days31To60Amount ?? 0 },
        { label: "61-90", value: report?.days61To90Amount ?? 0 },
        { label: "90+", value: report?.over90Amount ?? 0 },
      ],
    },
  ];
}

function agingRows(report: AgingReport | undefined) {
  return [
    { label: "Current", value: formatTallyAmount(report?.currentAmount), note: "Not overdue" },
    { label: "1-30 Days", value: formatTallyAmount(report?.days1To30Amount), note: "Follow-up" },
    { label: "31-60 Days", value: formatTallyAmount(report?.days31To60Amount), note: "Attention" },
    { label: "61-90 Days", value: formatTallyAmount(report?.days61To90Amount), note: "High risk" },
    { label: "90+ Days", value: formatTallyAmount(report?.over90Amount), note: "Critical" },
    { label: "Total Outstanding", value: formatTallyAmount(report?.totalOutstanding), note: "All buckets" },
  ];
}

function fallbackTrendBuckets(summary?: DashboardSummary): DashboardTrendBucket[] {
  return [
    {
      period: "current",
      label: "Current",
      sales: summary?.salesThisMonth ?? 0,
      purchases: summary?.purchasesThisMonth ?? 0,
      net: (summary?.salesThisMonth ?? 0) - (summary?.purchasesThisMonth ?? 0),
    },
  ];
}

function selectedDashboardRange(
  settings?: { activeAccountingPeriodStart?: string; activeAccountingPeriodEnd?: string; financialYearStartMonth?: number } | null
) {
  if (settings?.activeAccountingPeriodStart && settings.activeAccountingPeriodEnd) {
    return {
      fromDate: settings.activeAccountingPeriodStart,
      toDate: settings.activeAccountingPeriodEnd,
    };
  }

  return currentFinancialYearRange(settings?.financialYearStartMonth ?? 4);
}

function currentFinancialYearRange(startMonth: number) {
  const now = new Date();
  const normalizedStartMonth = Math.min(Math.max(startMonth, 1), 12);
  const startMonthIndex = normalizedStartMonth - 1;
  const startYear =
    now.getMonth() >= startMonthIndex ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  const fromDate = new Date(startYear, startMonthIndex, 1)
    .toISOString()
    .slice(0, 10);
  const toDate = new Date(endYear, startMonthIndex, 0)
    .toISOString()
    .slice(0, 10);
  return { fromDate, toDate };
}

function monthAxisLabel(value?: string) {
  if (!value) {
    return "";
  }

  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
  });
}

function formatTallyAmount(value?: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatPlainNumber(value?: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function gatewayTopActions(targetHref: string) {
  const context = actionContextForHref(targetHref);

  return [
    {
      key: "Alt+P",
      label: "Print",
      href: targetHref,
      enabled: context.print,
    },
    {
      key: "Alt+E",
      label: "Export",
      href: context.export ? "/import-export" : targetHref,
      enabled: context.export,
    },
    {
      key: "Alt+M",
      label: "E-Mail",
      href: context.email ? "/import-export" : targetHref,
      enabled: context.email,
    },
    {
      key: "Alt+O",
      label: "Upload",
      href: context.upload ? "/import-export" : targetHref,
      enabled: context.upload,
    },
    {
      key: "K",
      label: "Keyboard",
      href: "/docs",
      enabled: true,
    },
    {
      key: "S",
      label: "Support Centre",
      href: "/help-center",
      enabled: true,
    },
    {
      key: "F1",
      label: "Help",
      href: "/docs",
      enabled: true,
    },
    {
      key: "F12",
      label: "Configure",
      href: "/organization-settings",
      enabled: true,
    },
  ];
}

function actionContextForHref(href: string) {
  const isVoucher =
    href.startsWith("/billing") ||
    href.startsWith("/accounting?workspace=VOUCHERS") ||
    href.includes("voucher=");
  const isReport =
    href.startsWith("/dashboard") ||
    href.includes("workspace=REPORTS") ||
    href.includes("workspace=CASH_BANK");
  const isData = href.startsWith("/import-export");

  return {
    print: isVoucher || isReport,
    export: isVoucher || isReport || isData,
    email: isVoucher || isReport,
    upload: isData,
  };
}
