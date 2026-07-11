"use client";

import { IndianRupee, TrendingUp, Users, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { SaasAdminInsights } from "../types/saasAdmin.types";

const chartColors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

type Props = {
  insights?: SaasAdminInsights;
  loading?: boolean;
};

export function SaasInsights({ insights, loading }: Props) {
  if (loading && !insights) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-slate-500">
        Loading revenue insights...
      </div>
    );
  }

  if (!insights) return null;

  const currency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const chartData = insights.revenueByPlan.map((entry) => ({
    label: entry.label,
    mrr: entry.mrr,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Revenue Insights</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          derived from onboarded factories
        </span>
      </div>

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-6">
        <InsightCard
          label="MRR"
          value={currency(insights.mrr)}
          icon={IndianRupee}
        />
        <InsightCard
          label="Annual Recurring"
          value={currency(insights.annualRecurringRevenue)}
          icon={TrendingUp}
        />
        <InsightCard
          label="ARPU"
          value={currency(insights.arpu)}
          icon={IndianRupee}
        />
        <InsightCard
          label="New (month)"
          value={insights.newFactoriesThisMonth}
          icon={Users}
        />
        <InsightCard
          label="Upsell opp."
          value={insights.upsellOpportunities}
          icon={Zap}
        />
        <InsightCard
          label="Trial"
          value={insights.trialFactories}
          icon={Users}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Revenue by plan
          </p>
          {chartData.length ? (
            <div className="mt-3 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => currency(Number(value))}
                  />
                  <Bar dataKey="mrr" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No paid plans yet.
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Top factories by records
          </p>
          <ul className="mt-3 divide-y">
            {insights.topFactoriesByRecords.length ? (
              insights.topFactoriesByRecords.map((factory) => (
                <li
                  key={factory.organizationId}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {factory.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {factory.plan} · {factory.employees} employees
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {factory.records.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-slate-500">records</p>
                  </div>
                </li>
              ))
            ) : (
              <li className="py-2 text-sm text-slate-500">No data yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof IndianRupee;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="flex items-center justify-between p-3 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-slate-500">
            {label}
          </p>
          <p className="mt-1 truncate text-lg font-semibold sm:text-xl">
            {value}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Icon size={18} />
        </div>
      </CardContent>
    </Card>
  );
}
