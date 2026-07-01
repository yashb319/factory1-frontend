"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SupplierDashboard } from "../types/supplier.types";

type Props = {
  data?: SupplierDashboard;
  isLoading?: boolean;
};

export function SupplierDashboardCards({ data, isLoading }: Props) {
  const cards = [
    ["Total Suppliers", data?.totalSuppliers ?? 0],
    ["Active Suppliers", data?.activeSuppliers ?? 0],
    ["Inactive Suppliers", data?.inactiveSuppliers ?? 0],
    ["Missing GST", data?.suppliersMissingGst ?? 0],
    ["Missing Phone", data?.suppliersMissingPhone ?? 0],
    ["Missing Payment Terms", data?.suppliersMissingPaymentTerms ?? 0],
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