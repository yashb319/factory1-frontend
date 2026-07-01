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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map(([title, value]) => (
        <Card key={title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {isLoading ? "..." : value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}