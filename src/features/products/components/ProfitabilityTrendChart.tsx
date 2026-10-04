"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProfitabilityTrendPoint } from "../types/profitability.types";
import {
  formatProfitabilityMoney,
  formatProfitabilityPercent,
} from "../utils/profitabilityPresentation";

export function ProfitabilityTrendChart({
  trends,
}: {
  trends: ProfitabilityTrendPoint[];
}) {
  if (!trends.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No historical profitability periods were returned.
      </div>
    );
  }

  const chartData = trends.map((point) => ({
    period: point.periodLabel,
    "Attributed revenue": point.attributedRevenue.value,
    "Gross profit": point.grossProfit.value,
  }));

  return (
    <div className="space-y-4">
      <div
        className="h-72 w-full"
        aria-hidden="true"
        data-testid="profitability-trend-chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={72} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Attributed revenue"
              stroke="#2563eb"
              strokeWidth={2}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="Gross profit"
              stroke="#16a34a"
              strokeWidth={2}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="responsive-table w-full text-sm">
          <caption className="sr-only">
            Historical attributed revenue, gross profit, margin, completeness,
            and frozen costing snapshot by period
          </caption>
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left" scope="col">
                Period
              </th>
              <th className="p-3 text-right" scope="col">
                Attributed revenue
              </th>
              <th className="p-3 text-right" scope="col">
                Gross profit
              </th>
              <th className="p-3 text-right" scope="col">
                Gross margin
              </th>
              <th className="p-3 text-left" scope="col">
                Evidence
              </th>
            </tr>
          </thead>
          <tbody>
            {trends.map((point) => (
              <tr key={point.period} className="border-t">
                <th className="p-3 text-left font-medium" scope="row">
                  {point.periodLabel}
                </th>
                <td className="p-3 text-right" data-label="Attributed revenue">
                  {formatProfitabilityMoney(point.attributedRevenue)}
                </td>
                <td className="p-3 text-right" data-label="Gross profit">
                  {formatProfitabilityMoney(point.grossProfit)}
                </td>
                <td className="p-3 text-right" data-label="Gross margin">
                  {formatProfitabilityPercent(point.marginPercent)}
                </td>
                <td className="p-3" data-label="Evidence">
                  <p>{point.completeness.toLowerCase()}</p>
                  <p className="break-all text-xs text-muted-foreground">
                    {point.costingSnapshotId
                      ? `Cost snapshot ${point.costingSnapshotId}`
                      : "Cost snapshot not available"}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
