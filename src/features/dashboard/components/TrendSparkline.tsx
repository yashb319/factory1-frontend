"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Props = {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
};

export function TrendSparkline({ data, color = "#16a34a", height = 48 }: Props) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-slate-400"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            formatter={(value) => [
              new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(Number(value)),
              "",
            ]}
            labelFormatter={(label) => String(label)}
            contentStyle={{ fontSize: 11, padding: "4px 8px" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
