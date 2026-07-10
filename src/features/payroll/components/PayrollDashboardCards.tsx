"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollDashboardResponse } from "../types/payroll.types";
import { formatCurrency } from "../utils/payroll.utils";

interface Props {
  data?: PayrollDashboardResponse;
  isLoading?: boolean;
}

export function PayrollDashboardCards({ data, isLoading }: Props) {
const cards = [
  {
    title: "Total Payrolls",
    value: data?.totalPayrolls ?? 0,
  },
  {
    title: "Generated",
    value: data?.generated ?? 0,
  },
  {
    title: "Approved",
    value: data?.approved ?? 0,
  },
  {
    title: "Paid",
    value: data?.paid ?? 0,
  },
  {
    title: "This Month Payroll",
    value: formatCurrency(data?.thisMonthPayroll),
  },
  {
    title: "This Year Payroll",
    value: formatCurrency(data?.thisYearPayroll),
  },
];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl font-semibold sm:text-2xl">
              {isLoading ? "..." : card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}