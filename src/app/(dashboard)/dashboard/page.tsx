"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CalendarCheck,
  CheckCircle2,
  Circle,
  FileText,
  Package,
  ReceiptIndianRupee,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { AppPage } from "@/components/common/AppPage";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSection } from "@/components/common/PageSection";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGetDashboardSummaryQuery,
  useGetDashboardTrendsQuery,
} from "@/features/dashboard/api/dashboardApi";
import { useGetBenchmarksQuery } from "@/features/ai/api/aiApi";
import type { BenchmarkProfile } from "@/features/ai/types/ai.types";
import { TrendSparkline } from "@/features/dashboard/components/TrendSparkline";
import { DashboardTrendsChart } from "@/features/dashboard/components/DashboardTrendsChart";
import { DashboardAiInsights } from "@/features/dashboard/components/DashboardAiInsights";
import { BenchmarkCombobox } from "@/features/dashboard/components/BenchmarkCombobox";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 5);
  from.setDate(1);
  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type RangePreset = "3M" | "6M" | "1Y" | "2Y" | "FY";

function presetRange(preset: RangePreset) {
  const to = new Date();
  const from = new Date();

  if (preset === "3M") {
    from.setMonth(from.getMonth() - 2);
    from.setDate(1);
  } else if (preset === "6M") {
    from.setMonth(from.getMonth() - 5);
    from.setDate(1);
  } else if (preset === "1Y") {
    from.setFullYear(from.getFullYear() - 1);
    from.setDate(1);
  } else if (preset === "2Y") {
    from.setFullYear(from.getFullYear() - 2);
    from.setDate(1);
  } else {
    const year = to.getMonth() >= 3 ? to.getFullYear() : to.getFullYear() - 1;
    from.setFullYear(year, 3, 1);
  }

  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
}

export default function DashboardPage() {
  const [range, setRange] = useState<{ fromDate: string; toDate: string }>({
    fromDate: "",
    toDate: "",
  });
  const [userPicked, setUserPicked] = useState(false);

  const { data: benchmarks } = useGetBenchmarksQuery();
  const [benchmarkKey, setBenchmarkKey] = useState<string>("small");
  const [listedProfile, setListedProfile] =
    useState<BenchmarkProfile | undefined>(undefined);

  const { data, isLoading } = useGetDashboardSummaryQuery(
    range.fromDate ? range : undefined
  );
  const { data: trends, isFetching: trendsLoading } =
    useGetDashboardTrendsQuery(range);

  const allProfiles = useMemo(() => {
    const base = benchmarks ?? [];
    const extra = listedProfile ? [listedProfile] : [];
    return [
      ...base,
      ...extra.filter((p) => !base.some((b) => b.key === p.key)),
    ];
  }, [benchmarks, listedProfile]);

  const selectedBenchmark: BenchmarkProfile | undefined =
    allProfiles.find((profile) => profile.key === benchmarkKey)
    ?? allProfiles[0];

  const handleSelectBenchmark = (profile: BenchmarkProfile) => {
    setListedProfile(profile);
    setBenchmarkKey(profile.key);
  };

  useEffect(() => {
    if (data && !userPicked) {
      const start = data.accountingPeriodStart;
      const end = data.accountingPeriodEnd;

      if (start && end) {
        setRange({ fromDate: start, toDate: end });
      }
    }
  }, [data, userPicked]);

  const salesSpark = useMemo(
    () =>
      (trends?.buckets ?? []).map((bucket) => ({
        label: bucket.label,
        value: Number(bucket.sales ?? 0),
      })),
    [trends]
  );

  const purchasesSpark = useMemo(
    () =>
      (trends?.buckets ?? []).map((bucket) => ({
        label: bucket.label,
        value: Number(bucket.purchases ?? 0),
      })),
    [trends]
  );

  const netSpark = useMemo(
    () =>
      (trends?.buckets ?? []).map((bucket) => ({
        label: bucket.label,
        value: Number(bucket.net ?? 0),
      })),
    [trends]
  );

  const netThisMonth =
    Number(data?.salesThisMonth ?? 0) - Number(data?.purchasesThisMonth ?? 0);

  return (
    <AppPage>
      <PageHeader
        title="Dashboard"
        description="Live overview of your Factory1 workspace."
      />

      {!isLoading && data && !data.setupCompleted && (
        <PageSection
          title="Factory Setup"
          description="Complete these starter steps to make dashboard, payroll, billing and AI answers more useful."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.setupItems.map((item) => {
              const Icon = item.completed ? CheckCircle2 : Circle;

              return (
                <Link
                  href={item.href}
                  key={item.key}
                  className="group flex min-h-28 items-start gap-3 rounded-lg border bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <Icon
                    className={
                      item.completed
                        ? "mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                        : "mt-0.5 h-5 w-5 shrink-0 text-slate-400"
                    }
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-950">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">
                      {item.description}
                    </span>
                  </span>

                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-600" />
                </Link>
              );
            })}
          </div>
        </PageSection>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-slate-600">
            Showing data for{" "}
            <span className="font-semibold text-slate-800">
              {formatDate(range.fromDate)} – {formatDate(range.toDate)}
            </span>
            {data?.isAccountingPeriod && !userPicked && (
              <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                Accounting FY
              </span>
            )}
          </span>
          <span className="text-xs text-slate-400">
            Range is for dashboard stats only — it does not change accounting.
          </span>
          <BenchmarkCombobox
            profiles={benchmarks ?? []}
            selected={selectedBenchmark}
            onSelect={handleSelectBenchmark}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">From</span>
            <Input
              type="date"
              className="w-[160px]"
              value={range.fromDate}
              max={range.toDate}
              onChange={(event) => {
                setUserPicked(true);
                setRange((prev) => ({
                  ...prev,
                  fromDate: event.target.value,
                }));
              }}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500">To</span>
            <Input
              type="date"
              className="w-[160px]"
              value={range.toDate}
              min={range.fromDate}
              onChange={(event) => {
                setUserPicked(true);
                setRange((prev) => ({
                  ...prev,
                  toDate: event.target.value,
                }));
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["3M", "6M", "1Y", "2Y", "FY"] as RangePreset[]).map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setUserPicked(true);
                  if (preset === "FY") {
                    if (
                      data?.accountingPeriodStart &&
                      data?.accountingPeriodEnd
                    ) {
                      setRange({
                        fromDate: data.accountingPeriodStart,
                        toDate: data.accountingPeriodEnd,
                      });
                    } else {
                      setRange(presetRange("FY"));
                    }
                  } else {
                    setRange(presetRange(preset));
                  }
                }}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <DashboardAiInsights
        summary={data}
        trends={trends}
        range={range}
        benchmarkProfile={selectedBenchmark}
      />

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Sales"
          value={isLoading ? "..." : formatCurrency(data?.salesThisMonth ?? 0)}
          description={`${data?.bills ?? 0} total bills · ${rangeLabel(range)}`}
          icon={ReceiptIndianRupee}
          chart={<TrendSparkline data={salesSpark} color="#16a34a" />}
        />

        <StatCard
          title="Purchases"
          value={
            isLoading ? "..." : formatCurrency(data?.purchasesThisMonth ?? 0)
          }
          description={`Supplier bills · ${rangeLabel(range)}`}
          icon={Truck}
          chart={<TrendSparkline data={purchasesSpark} color="#dc2626" />}
        />

        <StatCard
          title="Net Profit"
          value={isLoading ? "..." : formatCurrency(netThisMonth)}
          description={
            (netThisMonth >= 0 ? "Above breakeven · " : "Below breakeven · ") +
            rangeLabel(range)
          }
          icon={netThisMonth >= 0 ? TrendingUp : TrendingDown}
          chart={<TrendSparkline data={netSpark} color="#2563eb" />}
        />

        <StatCard
          title="Inventory Items"
          value={loadingValue(isLoading, data?.inventoryItems)}
          description={`${data?.lowStockItems ?? 0} low stock`}
          icon={Package}
        />
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Inventory Value"
          value={isLoading ? "..." : formatCurrency(data?.inventoryValue ?? 0)}
          description="At cost price"
          icon={Boxes}
        />

        <StatCard
          title="Latest Payroll"
          value={
            isLoading ? "..." : formatCurrency(data?.latestPayrollAmount ?? 0)
          }
          description={data?.latestPayrollPeriod ?? "No payroll generated"}
          icon={Wallet}
        />

        <StatCard
          title="Products"
          value={loadingValue(isLoading, data?.products)}
          description={`${data?.productionEntriesThisMonth ?? 0} production entries`}
          icon={Boxes}
        />

        <StatCard
          title="Customers / Suppliers"
          value={
            isLoading
              ? "..."
              : `${data?.customers ?? 0} / ${data?.suppliers ?? 0}`
          }
          description="Active business records"
          icon={FileText}
        />
      </div>

      <PageSection
        title="Sales vs Purchases vs Net Profit"
        description="Posted bills across the selected date range."
      >
        <DashboardTrendsChart trends={trends} loading={trendsLoading} />
      </PageSection>

      

      <div className="grid gap-6">
        <PageSection
          title="Recent Activity"
          description="Latest operational signals from your factory"
        >
          <div className="space-y-3 text-sm text-slate-600">
            {(data?.recentActivity ?? []).map((activity) => (
              <p key={activity}>{activity}</p>
            ))}
            {!isLoading && !data?.recentActivity?.length && (
              <p>No activity available yet.</p>
            )}
          </div>
        </PageSection>
      </div>
    </AppPage>
  );
}

function loadingValue(isLoading: boolean, value?: number) {
  return isLoading ? "..." : String(value ?? 0);
}

function rangeLabel(range: { fromDate: string; toDate: string }): string {
  return `${formatDate(range.fromDate)} – ${formatDate(range.toDate)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
