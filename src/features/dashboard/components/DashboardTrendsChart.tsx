"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardTrends } from "../types/dashboard.types";

type Props = {
  trends: DashboardTrends | undefined;
  loading: boolean;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export function DashboardTrendsChart({ trends, loading }: Props) {
  const data = (trends?.buckets ?? []).map((bucket) => ({
    label: bucket.label,
    Sales: Number(bucket.sales ?? 0),
    Purchases: Number(bucket.purchases ?? 0),
    "Net Profit": Number(bucket.net ?? 0),
  }));

  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-lg border bg-slate-50" />
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border bg-slate-50 text-sm text-slate-400">
        No posted bills in this range yet.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillPurchases" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => currency(Number(value))}
            width={64}
          />
          <Tooltip
            formatter={(value, name) => [currency(Number(value)), name]}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="Sales"
            stroke="#16a34a"
            strokeWidth={2}
            fill="url(#fillSales)"
          />
          <Area
            type="monotone"
            dataKey="Purchases"
            stroke="#dc2626"
            strokeWidth={2}
            fill="url(#fillPurchases)"
          />
          <Area
            type="monotone"
            dataKey="Net Profit"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#fillNet)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
