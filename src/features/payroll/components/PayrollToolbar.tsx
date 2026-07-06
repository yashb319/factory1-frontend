"use client";

import { CalendarPlus, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PayrollStatus } from "../types/payroll.types";
import { monthOptions, yearOptions } from "../utils/payroll.utils";

interface Props {
  month?: number;
  year?: number;
  status?: PayrollStatus;
  onMonthChange: (month?: number) => void;
  onYearChange: (year?: number) => void;
  onStatusChange: (status?: PayrollStatus) => void;
  onReset: () => void;
  onGenerate: () => void;
}

export function PayrollToolbar({
  month,
  year,
  status,
  onMonthChange,
  onYearChange,
  onStatusChange,
  onReset,
  onGenerate,
}: Props) {
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground md:flex">
          <Filter className="h-4 w-4" />
          Filter
        </div>

        <Select
          value={month ? String(month) : "ALL"}
          onValueChange={(value) =>
            onMonthChange(value === "ALL" ? undefined : Number(value))
          }
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All months</SelectItem>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={year ? String(year) : "ALL"}
          onValueChange={(value) =>
            onYearChange(value === "ALL" ? undefined : Number(value))
          }
        >
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All years</SelectItem>
            {yearOptions.map((y) => (
              <SelectItem key={y.value} value={String(y.value)}>
                {y.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status ?? "ALL"}
          onValueChange={(value) =>
            onStatusChange(value === "ALL" ? undefined : (value as PayrollStatus))
          }
        >
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="GENERATED">Generated</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="rounded-md border bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-950">
          Monthly salary run
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Generate after attendance and salary details are ready.
        </p>
        <Button className="mt-3 w-full" onClick={onGenerate}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Generate Payroll
        </Button>
      </div>
    </div>
  );
}
