"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
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
import type { PayrollRunSummaryResponse } from "../types/payroll.types";
import { formatCurrency, getMonthName } from "../utils/payroll.utils";

type Props = {
  payrollRuns: PayrollRunSummaryResponse[];
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

function payrollPeriodDate(run: PayrollRunSummaryResponse) {
  return `${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}-01`;
}

export function PayrollInsightsPanel({ payrollRuns, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(defaultRange);

  const chartData = useMemo(
    () =>
      [...payrollRuns]
        .filter((run) => {
          const periodDate = payrollPeriodDate(run);
          return periodDate >= range.fromDate && periodDate <= range.toDate;
        })
        .sort((a, b) =>
          a.payrollYear === b.payrollYear
            ? a.payrollMonth - b.payrollMonth
            : a.payrollYear - b.payrollYear
        )
        .map((run) => ({
          label: `${getMonthName(run.payrollMonth).slice(0, 3)} ${run.payrollYear}`,
          Net: Number(run.netAmount ?? 0),
          Gross: Number(run.grossAmount ?? 0),
          Deductions: Number(run.deductionAmount ?? 0),
        })),
    [payrollRuns, range.fromDate, range.toDate]
  );

  return (
    <section className="rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-950">
              Payroll graph
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Net salary, gross salary and deductions for the payroll rows in this view.
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
          <div className="mb-4 grid gap-2 sm:grid-cols-[auto_auto_auto_1fr_1fr] sm:items-center">
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

          {loading ? (
            <div className="h-72 animate-pulse rounded-lg border bg-slate-50" />
          ) : chartData.length ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value))} width={72} />
                  <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Gross" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Net" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Deductions" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border bg-slate-50 text-sm text-slate-400">
              No payroll rows in this range.
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
