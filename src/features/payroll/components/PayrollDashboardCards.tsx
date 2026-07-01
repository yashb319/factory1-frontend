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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {isLoading ? "..." : card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}