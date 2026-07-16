"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useGetDashboardSummaryQuery,
  useGetDashboardTrendsQuery,
} from "@/features/dashboard/api/dashboardApi";
import {
  useGetLedgerReportQuery,
  useGetProfitLossQuery,
  useGetAgingReportQuery,
  useGetAccountingGstSummaryQuery,
} from "@/features/accounting/api/accountingApi";
import { useGetInventoryDashboardQuery } from "@/features/inventory/api/inventoryApi";
import type {
  AgingReport,
  LedgerReport,
  ProfitLoss,
} from "@/features/accounting/types/accounting.types";
import type { InventoryDashboard } from "@/features/inventory/types/inventory.types";
import type { GstReport } from "@/features/billing/types/billing.types";
import type {
  DashboardSummary,
  DashboardTrendBucket,
} from "@/features/dashboard/types/dashboard.types";

type ReportKey =
  | "BUSINESS_OVERVIEW"
  | "CASH_BANK"
  | "RECEIVABLES"
  | "PAYABLES"
  | "STOCK_SUMMARY"
  | "SALES_TREND"
  | "PURCHASE_TREND"
  | "GST_SUMMARY"
  | "EXCEPTION_ALERTS";

type Part = { key: string; label: string; reportKey: ReportKey };
type Row = { label: string; value: string; note?: string };

const PARTS: Part[] = [
  { key: "B", label: "Business Overview", reportKey: "BUSINESS_OVERVIEW" },
  { key: "C", label: "Cash & Bank", reportKey: "CASH_BANK" },
  { key: "R", label: "Receivables", reportKey: "RECEIVABLES" },
  { key: "P", label: "Payables", reportKey: "PAYABLES" },
  { key: "S", label: "Stock Summary", reportKey: "STOCK_SUMMARY" },
  { key: "L", label: "Sales Trend", reportKey: "SALES_TREND" },
  { key: "U", label: "Purchase Trend", reportKey: "PURCHASE_TREND" },
  { key: "G", label: "GST Summary", reportKey: "GST_SUMMARY" },
  { key: "E", label: "Exception Alerts", reportKey: "EXCEPTION_ALERTS" },
];

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 5);
  from.setDate(1);
  return { fromDate: toIso(from), toDate: toIso(to) };
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function TallyDashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportParam = searchParams.get("report") as ReportKey | null;

  const range = useMemo(defaultRange, []);
  const [selected, setSelected] = useState(() => {
    const idx = PARTS.findIndex((p) => p.reportKey === reportParam);
    return idx >= 0 ? idx : 0;
  });

  const { data: summary } = useGetDashboardSummaryQuery(range);
  const { data: trends } = useGetDashboardTrendsQuery(range);
  const { data: ledgerReport } = useGetLedgerReportQuery(range);
  const { data: profitLoss } = useGetProfitLossQuery(range);
  const todayIso = new Date().toISOString().slice(0, 10);
  const { data: receivables } = useGetAgingReportQuery({
    type: "SALES",
    asOfDate: todayIso,
  });
  const { data: payables } = useGetAgingReportQuery({
    type: "PURCHASE",
    asOfDate: todayIso,
  });
  const { data: gstSummary } = useGetAccountingGstSummaryQuery(range);
  const { data: inventory } = useGetInventoryDashboardQuery();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key.toLowerCase() === "q") {
        event.preventDefault();
        router.push("/gateway?menu=dashboard");
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((c) => Math.min(c + 1, PARTS.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((c) => Math.max(c - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        router.push(`/gateway?menu=dashboard`);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  const active = PARTS[selected];

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="w-64 shrink-0 overflow-auto border-r border-[#0F766E] bg-[#C8E6C9]">
        <div className="border-b border-[#0F766E] bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
          Dashboard
        </div>
        {PARTS.map((part, index) => (
          <button
            key={part.reportKey}
            type="button"
            onClick={() => setSelected(index)}
            className={[
              "flex w-full items-center gap-2 border-b border-[#94A3B8]/40 px-2 py-1.5 text-left",
              index === selected
                ? "bg-[#0F172A] text-white"
                : "hover:bg-[#6366F1]/10",
            ].join(" ")}
          >
            <span className="font-bold text-[#EF4444]">{part.key}</span>
            <span>{part.label}</span>
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[#0F766E] bg-[#0F172A] px-3 py-1 text-center font-bold text-white">
          {active.label}
        </div>

        <div className="flex-1 overflow-auto px-4 py-3">
          <PartContent
            reportKey={active.reportKey}
            summary={summary}
            trends={trends?.buckets ?? []}
            ledgerReport={ledgerReport}
            profitLoss={profitLoss}
            receivables={receivables}
            payables={payables}
            gstSummary={gstSummary}
            inventory={inventory}
          />
        </div>

        <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => router.push("/gateway?menu=dashboard")}
          >
            Q: Back
          </button>
          <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
            ↑/↓: Parts
          </span>
          <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
            Enter: Open
          </span>
          <span className="px-2 py-1 text-slate-600">Esc: Close</span>
        </div>
      </div>
    </div>
  );
}

function PartContent({
  reportKey,
  summary,
  trends,
  ledgerReport,
  profitLoss,
  receivables,
  payables,
  gstSummary,
  inventory,
}: {
  reportKey: ReportKey;
  summary?: DashboardSummary;
  trends: DashboardTrendBucket[];
  ledgerReport?: LedgerReport;
  profitLoss?: ProfitLoss;
  receivables?: AgingReport;
  payables?: AgingReport;
  gstSummary?: GstReport;
  inventory?: InventoryDashboard;
}) {
  if (!summary && reportKey === "BUSINESS_OVERVIEW") {
    return <Loading />;
  }

  const rows: Row[] =
    reportKey === "BUSINESS_OVERVIEW"
      ? businessOverviewRows(summary)
      : reportKey === "CASH_BANK"
        ? cashBankRows(ledgerReport)
        : reportKey === "RECEIVABLES"
          ? agingRows(receivables, "Receivables")
          : reportKey === "PAYABLES"
            ? agingRows(payables, "Payables")
            : reportKey === "STOCK_SUMMARY"
              ? stockRows(inventory)
              : reportKey === "GST_SUMMARY"
                ? gstRows(gstSummary)
                : reportKey === "EXCEPTION_ALERTS"
                  ? exceptionRows(inventory, receivables, payables, summary)
                  : [];

  if (
    (reportKey === "SALES_TREND" || reportKey === "PURCHASE_TREND") &&
    trends.length
  ) {
    const metric =
      reportKey === "SALES_TREND" ? "sales" : "purchases";
    return (
      <ReportTable
        rows={trends.map((bucket) => ({
          label: bucket.label,
          value: formatCurrency(
            metric === "sales" ? bucket.sales : bucket.purchases,
          ),
          note: `Net ${formatCurrency(bucket.net)}`,
        }))}
      />
    );
  }

  if (rows.length === 0) {
    return <Loading />;
  }

  return <ReportTable rows={rows} />;
}

function Loading() {
  return <div className="text-slate-500">Loading…</div>;
}

function ReportTable({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="border-y border-[#0F766E] bg-[#C8E6C9]">
          <th className="px-2 py-1 text-left">Particulars</th>
          <th className="px-2 py-1 text-right">Value</th>
          <th className="px-2 py-1 text-left">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.label}-${index}`} className="border-b border-[#94A3B8]/60">
            <td className="px-2 py-1 font-semibold">{row.label}</td>
            <td className="px-2 py-1 text-right">{row.value}</td>
            <td className="px-2 py-1 text-slate-600">{row.note ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function businessOverviewRows(summary?: DashboardSummary): Row[] {
  if (!summary) return [];
  const net =
    Number(summary.salesThisMonth ?? 0) -
    Number(summary.purchasesThisMonth ?? 0);
  return [
    { label: "Sales (this month)", value: formatCurrency(summary.salesThisMonth), note: `${summary.bills ?? 0} bills` },
    { label: "Purchases (this month)", value: formatCurrency(summary.purchasesThisMonth) },
    { label: "Net Profit (this month)", value: formatCurrency(net), note: net >= 0 ? "Above breakeven" : "Below breakeven" },
    { label: "Inventory Items", value: String(summary.inventoryItems ?? 0), note: `${summary.lowStockItems ?? 0} low stock` },
    { label: "Inventory Value", value: formatCurrency(summary.inventoryValue) },
    { label: "Latest Payroll", value: formatCurrency(summary.latestPayrollAmount), note: summary.latestPayrollPeriod },
    { label: "Products", value: String(summary.products ?? 0), note: `${summary.productionEntriesThisMonth ?? 0} production entries` },
    { label: "Customers / Suppliers", value: `${summary.customers ?? 0} / ${summary.suppliers ?? 0}` },
    { label: "Employees", value: String(summary.employees ?? 0), note: `${summary.activeEmployees ?? 0} active · ${summary.presentToday ?? 0} present today` },
  ];
}

function cashBankRows(report?: LedgerReport): Row[] {
  if (!report) return [];
  return [
    { label: "Total Receivables", value: formatCurrency(report.totalReceivables) },
    { label: "Total Payables", value: formatCurrency(report.totalPayables) },
    { label: "Net Receivable", value: formatCurrency(report.netReceivable) },
    ...report.parties.slice(0, 8).map((party) => ({
      label: party.partyName,
      value: formatCurrency(party.outstandingAmount),
      note: `${party.billCount} bills`,
    })),
  ];
}

function agingRows(report?: AgingReport, title = "Outstanding"): Row[] {
  if (!report) return [];
  return [
    { label: "Current", value: formatCurrency(report.currentAmount) },
    { label: "1–30 days", value: formatCurrency(report.days1To30Amount) },
    { label: "31–60 days", value: formatCurrency(report.days31To60Amount) },
    { label: "61–90 days", value: formatCurrency(report.days61To90Amount) },
    { label: "Over 90 days", value: formatCurrency(report.over90Amount) },
    { label: `Total ${title}`, value: formatCurrency(report.totalOutstanding), note: `${report.rows.length} bills` },
    ...report.rows.slice(0, 6).map((row) => ({
      label: `${row.partyName} (${row.billNumber})`,
      value: formatCurrency(row.outstandingAmount),
      note: `${row.daysOverdue}d overdue`,
    })),
  ];
}

function stockRows(inventory?: InventoryDashboard): Row[] {
  if (!inventory) return [];
  return [
    { label: "Total Items", value: String(inventory.totalItems) },
    { label: "Active Items", value: String(inventory.activeItems) },
    { label: "Low Stock Items", value: String(inventory.lowStockItems) },
    { label: "Out of Stock", value: String(inventory.outOfStockItems) },
    { label: "Total Inventory Value", value: formatCurrency(inventory.totalInventoryValue) },
    { label: "Raw Material Value", value: formatCurrency(inventory.rawMaterialValue) },
    { label: "Finished Goods Value", value: formatCurrency(inventory.finishedGoodsValue) },
  ];
}

function gstRows(report?: GstReport): Row[] {
  if (!report) return [];
  return [
    { label: "Sales Taxable", value: formatCurrency(report.salesTaxableAmount) },
    { label: "Sales CGST", value: formatCurrency(report.salesCgstAmount) },
    { label: "Sales SGST", value: formatCurrency(report.salesSgstAmount) },
    { label: "Sales IGST", value: formatCurrency(report.salesIgstAmount) },
    { label: "Purchase Taxable", value: formatCurrency(report.purchaseTaxableAmount) },
    { label: "Purchase CGST", value: formatCurrency(report.purchaseCgstAmount) },
    { label: "Purchase SGST", value: formatCurrency(report.purchaseSgstAmount) },
    { label: "Purchase IGST", value: formatCurrency(report.purchaseIgstAmount) },
  ];
}

function exceptionRows(
  inventory?: InventoryDashboard,
  receivables?: AgingReport,
  payables?: AgingReport,
  summary?: DashboardSummary,
): Row[] {
  const rows: Row[] = [];

  const lowStock = inventory?.lowStockItems ?? summary?.lowStockItems ?? 0;
  if (lowStock > 0) {
    rows.push({ label: "Low Stock Items", value: String(lowStock), note: "Reorder suggested" });
  }

  const outOfStock = inventory?.outOfStockItems ?? 0;
  if (outOfStock > 0) {
    rows.push({ label: "Out of Stock Items", value: String(outOfStock), note: "Critical" });
  }

  const overdueReceivables = (receivables?.rows ?? [])
    .filter((row) => row.daysOverdue > 0)
    .slice(0, 8);
  for (const row of overdueReceivables) {
    rows.push({
      label: `Receivable: ${row.partyName} (${row.billNumber})`,
      value: formatCurrency(row.outstandingAmount),
      note: `${row.daysOverdue}d overdue`,
    });
  }

  const overduePayables = (payables?.rows ?? [])
    .filter((row) => row.daysOverdue > 0)
    .slice(0, 8);
  for (const row of overduePayables) {
    rows.push({
      label: `Payable: ${row.partyName} (${row.billNumber})`,
      value: formatCurrency(row.outstandingAmount),
      note: `${row.daysOverdue}d overdue`,
    });
  }

  if (rows.length === 0) {
    rows.push({ label: "No exceptions found", value: "✓ All clear" });
  }

  return rows;
}
