"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerDashboard } from "../types/customer.types";

type Props = {
  data?: CustomerDashboard;
  isLoading?: boolean;
};

export function CustomerDashboardCards({ data, isLoading }: Props) {
  const cards = [
    ["Total Customers", data?.totalCustomers ?? 0],
    ["Active Customers", data?.activeCustomers ?? 0],
    ["Inactive Customers", data?.inactiveCustomers ?? 0],
    ["Missing GST", data?.customersMissingGst ?? 0],
    ["Missing Phone", data?.customersMissingPhone ?? 0],
    ["Missing Payment Terms", data?.customersMissingPaymentTerms ?? 0],
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
      {cards.map(([title, value]) => (
        <Card key={title}>
          <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl font-semibold sm:text-2xl">
              {isLoading ? "..." : value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}