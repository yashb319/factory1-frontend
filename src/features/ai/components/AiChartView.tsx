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

type Props = {
  chart?: AiChart | null;
};

export function AiChartView({ chart }: Props) {
  if (!chart || !chart.data?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-3 text-sm font-medium">{chart.title}</div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "pie" ? (
            <PieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="label"
                outerRadius={92}
                label
              >
                {chart.data.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : chart.type === "line" ? (
            <LineChart data={chart.data}>
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
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
