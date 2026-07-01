"use client";

import { Sparkles } from "lucide-react";
import { Employee } from "../types/employee.types";

interface Props {
  employees: Employee[];
}

export function EmployeeAiInsights({ employees }: Props) {
  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>

        <div>
          <h3 className="text-sm font-semibold">AI Insights</h3>
          <p className="text-sm text-muted-foreground">
            {employees.length === 0
              ? "No employee data available for insights yet."
              : `${activeCount} active employees visible in current result. Payroll and attendance risk insights will appear here.`}
          </p>
        </div>
      </div>
    </div>
  );
}