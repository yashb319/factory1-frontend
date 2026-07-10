"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryDashboard } from "../types/inventory.types";
import { formatCurrency } from "../utils/inventoryHelpers";

type Props = {
  data?: InventoryDashboard;
  isLoading?: boolean;
};

export function InventoryDashboardCards({ data, isLoading }: Props) {
  const cards = [
    {
      title: "Total Items",
      value: data?.totalItems ?? 0,
    },
    {
      title: "Low Stock",
      value: data?.lowStockItems ?? 0,
    },
    {
      title: "Out of Stock",
      value: data?.outOfStockItems ?? 0,
    },
    {
      title: "Inventory Value",
      value: formatCurrency(data?.totalInventoryValue ?? 0),
    },
    {
      title: "Raw Material Value",
      value: formatCurrency(data?.rawMaterialValue ?? 0),
    },
    {
      title: "Finished Goods Value",
      value: formatCurrency(data?.finishedGoodsValue ?? 0),
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