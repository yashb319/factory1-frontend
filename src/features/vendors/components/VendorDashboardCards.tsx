"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VendorDashboard } from "../types/vendor.types";

type Props = {
  data?: VendorDashboard;
  isLoading?: boolean;
};

export function VendorDashboardCards({ data, isLoading }: Props) {
  const cards = [
    ["Total Vendors", data?.totalVendors ?? 0],
    ["Active Vendors", data?.activeVendors ?? 0],
    ["Inactive Vendors", data?.inactiveVendors ?? 0],
    ["Missing Contact Info", data?.vendorsMissingContact ?? 0],
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
