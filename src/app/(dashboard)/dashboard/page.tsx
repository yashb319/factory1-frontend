"use client";

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
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { AppPage } from "@/components/common/AppPage";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSection } from "@/components/common/PageSection";
import { StatCard } from "@/components/cards/StatCard";
import { useGetDashboardSummaryQuery } from "@/features/dashboard/api/dashboardApi";

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardSummaryQuery();

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

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Employees"
          value={loadingValue(isLoading, data?.employees)}
          description={`${data?.activeEmployees ?? 0} active`}
          icon={Users}
        />

        <StatCard
          title="Today Attendance"
          value={loadingValue(isLoading, data?.presentToday)}
          description={`${data?.absentToday ?? 0} absent today`}
          icon={CalendarCheck}
        />

        <StatCard
          title="Latest Payroll"
          value={isLoading ? "..." : formatCurrency(data?.latestPayrollAmount ?? 0)}
          description={data?.latestPayrollPeriod ?? "No payroll generated"}
          icon={Wallet}
        />

        <StatCard
          title="Inventory Items"
          value={loadingValue(isLoading, data?.inventoryItems)}
          description={`${data?.lowStockItems ?? 0} low stock`}
          icon={Package}
        />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Sales This Month"
          value={isLoading ? "..." : formatCurrency(data?.salesThisMonth ?? 0)}
          description={`${data?.bills ?? 0} total bills`}
          icon={ReceiptIndianRupee}
        />

        <StatCard
          title="Purchases This Month"
          value={isLoading ? "..." : formatCurrency(data?.purchasesThisMonth ?? 0)}
          description="Supplier bills posted"
          icon={Truck}
        />

        <StatCard
          title="Products"
          value={loadingValue(isLoading, data?.products)}
          description={`${data?.productionEntriesThisMonth ?? 0} production entries this month`}
          icon={Boxes}
        />

        <StatCard
          title="Customers / Suppliers"
          value={isLoading ? "..." : `${data?.customers ?? 0} / ${data?.suppliers ?? 0}`}
          description="Active business records"
          icon={FileText}
        />
      </div>

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
