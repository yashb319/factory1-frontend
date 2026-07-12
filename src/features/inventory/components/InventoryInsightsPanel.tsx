"use client";

import { useMemo, useState } from "react";
import { Boxes, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InventoryItem } from "../types/inventory.types";
import { formatCurrency, itemTypeLabel } from "../utils/inventoryHelpers";

type Props = {
  items: InventoryItem[];
  loading?: boolean;
};

type RangePreset = "3M" | "6M" | "FY";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 5);
  from.setDate(1);
  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
}

function presetRange(preset: RangePreset) {
  const to = new Date();
  const from = new Date();

  if (preset === "3M") {
    from.setMonth(from.getMonth() - 2);
    from.setDate(1);
  } else if (preset === "FY") {
    const year = to.getMonth() >= 3 ? to.getFullYear() : to.getFullYear() - 1;
    from.setFullYear(year, 3, 1);
  } else {
    from.setMonth(from.getMonth() - 5);
    from.setDate(1);
  }

  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
}

export function InventoryInsightsPanel({ items, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(defaultRange);

  const chartData = useMemo(() => {
    const grouped = new Map<string, { label: string; Value: number; Low: number; Out: number }>();

    items.forEach((item) => {
      const label = itemTypeLabel(item.itemType);
      const current = grouped.get(label) ?? {
        label,
        Value: 0,
        Low: 0,
        Out: 0,
      };
      current.Value += Number(item.inventoryValue ?? 0);
      current.Low += item.lowStock ? 1 : 0;
      current.Out += item.outOfStock ? 1 : 0;
      grouped.set(label, current);
    });

    return Array.from(grouped.values()).sort((a, b) => b.Value - a.Value);
  }, [items]);

  return (
    <section className="rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
      <span className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Boxes className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-950">
              Inventory graph
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Stock value and exception counts by item type for the current inventory filters.
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-500">
          {open ? "Hide" : "Show"}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open ? (
        <div className="border-t p-5">
          <div className="mb-2 grid gap-2 sm:grid-cols-[auto_auto_auto_1fr_1fr] sm:items-center">
            {(["3M", "6M", "FY"] as RangePreset[]).map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRange(presetRange(preset))}
              >
                {preset}
              </Button>
            ))}
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={range.fromDate}
                onChange={(event) =>
                  setRange((current) => ({
                    ...current,
                    fromDate: event.target.value,
                  }))
                }
                className="pl-9"
              />
            </div>
            <Input
              type="date"
              value={range.toDate}
              onChange={(event) =>
                setRange((current) => ({
                  ...current,
                  toDate: event.target.value,
                }))
              }
            />
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Showing current inventory snapshot. Movement history will use this range when an all-items stock movement API is added.
          </p>

          {loading ? (
            <div className="h-72 animate-pulse rounded-lg border bg-slate-50" />
          ) : chartData.length ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="value" tick={{ fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value))} width={72} />
                  <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11 }} width={32} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "Value"
                        ? [formatCurrency(Number(value)), name]
                        : [Number(value), name]
                    }
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="value" type="monotone" dataKey="Value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="count" type="monotone" dataKey="Low" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="count" type="monotone" dataKey="Out" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border bg-slate-50 text-sm text-slate-400">
              No inventory rows in the current filters.
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Collapse graph
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
