"use client";

import { AlertTriangle, Brain, TrendingUp } from "lucide-react";
import { PayrollRunDetailsResponse } from "../types/payroll.types";
import { formatCurrency } from "../utils/payroll.utils";

interface Props {
  payroll?: PayrollRunDetailsResponse;
}

export function PayrollAiInsights({ payroll }: Props) {
  if (!payroll) return null;

  const items = payroll.items ?? [];

  const highOvertimeEmployees = items.filter(
    (item) => Number(item.overtimeHours ?? 0) > 0
  );

  const lowAttendanceEmployees = items.filter(
    (item) =>
      Number(item.presentDays ?? 0) <
      Number(item.totalWorkingDays ?? 0) * 0.75
  );

  const highestPaidEmployee = [...items].sort(
    (a, b) => Number(b.netSalary) - Number(a.netSalary)
  )[0];

  const insights = [
    highOvertimeEmployees.length > 0
      ? {
          icon: AlertTriangle,
          title: "Overtime detected",
          message: `${highOvertimeEmployees.length} employee(s) have overtime this payroll cycle.`,
        }
      : {
          icon: Brain,
          title: "No overtime pressure",
          message: "No overtime hours were detected in this payroll run.",
        },

    lowAttendanceEmployees.length > 0
      ? {
          icon: AlertTriangle,
          title: "Low attendance impact",
          message: `${lowAttendanceEmployees.length} employee(s) have attendance below 75%.`,
        }
      : {
          icon: TrendingUp,
          title: "Attendance looks healthy",
          message: "No major low-attendance payroll risk found.",
        },

    highestPaidEmployee
      ? {
          icon: TrendingUp,
          title: "Highest payout",
          message: `${highestPaidEmployee.employeeName} has the highest net salary: ${formatCurrency(
            highestPaidEmployee.netSalary
          )}.`,
        }
      : null,
  ].filter(Boolean) as {
    icon: typeof Brain;
    title: string;
    message: string;
  }[];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {insights.map((insight) => {
        const Icon = insight.icon;

        return (
          <div
            key={insight.title}
            className="rounded-xl border bg-blue-50 p-4"
          >
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-blue-700" />
              <p className="font-medium text-blue-950">{insight.title}</p>
            </div>

            <p className="mt-2 text-sm text-blue-800">{insight.message}</p>
          </div>
        );
      })}
    </div>
  );
}