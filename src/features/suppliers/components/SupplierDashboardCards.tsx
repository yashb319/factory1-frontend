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