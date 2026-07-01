"use client";

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
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 md:flex-row">
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
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>

      <Button onClick={onGenerate}>Generate Payroll</Button>
    </div>
  );
}