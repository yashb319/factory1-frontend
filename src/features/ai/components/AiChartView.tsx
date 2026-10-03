"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AiChart } from "../types/ai.types";

const chartColors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];
const MAX_CHART_POINTS = 50;

type Props = {
  chart?: AiChart | null;
};

export function AiChartView({ chart }: Props) {
  const validChart = validateAiChart(chart);
  if (!validChart) return null;

  return (
    <figure className="rounded-lg border bg-background p-3">
      <figcaption className="mb-3 text-sm font-medium">
        {validChart.title}
      </figcaption>
      <div
        className="h-72 w-full"
        role="img"
        aria-label={`${validChart.title}. ${validChart.data
          .map((point) => `${point.label}: ${point.value}`)
          .join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          {validChart.type === "pie" ? (
            <PieChart>
              <Pie
                data={validChart.data}
                dataKey="value"
                nameKey="label"
                outerRadius={92}
                label
              >
                {validChart.data.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : validChart.type === "line" ? (
            <LineChart data={validChart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
              />
            </LineChart>
          ) : (
            <BarChart data={validChart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-medium text-muted-foreground">
          View chart data
        </summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-1 pr-3">Label</th>
              <th className="py-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {validChart.data.map((point) => (
              <tr key={point.label} className="border-b last:border-0">
                <td className="py-1 pr-3">{point.label}</td>
                <td className="py-1">{point.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function validateAiChart(chart?: AiChart | null): AiChart | null {
  if (
    !chart ||
    !["bar", "line", "pie"].includes(chart.type) ||
    !chart.title?.trim() ||
    !Array.isArray(chart.data) ||
    chart.data.length < 2 ||
    chart.data.length > MAX_CHART_POINTS
  ) {
    return null;
  }

  const data = chart.data.filter(
    (point) =>
      typeof point.label === "string" &&
      point.label.trim().length > 0 &&
      typeof point.value === "number" &&
      Number.isFinite(point.value)
  );

  if (
    data.length < 2 ||
    data.every((point) => point.value === 0) ||
    new Set(data.map((point) => point.label)).size < 2
  ) {
    return null;
  }

  return { ...chart, data };
}
