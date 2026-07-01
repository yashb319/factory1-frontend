"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryItem } from "../types/inventory.types";
import { formatCurrency } from "../utils/inventoryHelpers";

type Props = {
  items: InventoryItem[];
};

export function InventoryAiInsights({ items }: Props) {
  const lowStock = items.filter((item) => item.lowStock);
  const outOfStock = items.filter((item) => item.outOfStock);
  const missingSuppliers = items.filter(
    (item) => item.itemType === "RAW_MATERIAL" && !item.supplierName
  );

  const highestValueItem = [...items].sort(
    (a, b) => b.inventoryValue - a.inventoryValue
  )[0];

  const insights = [
    outOfStock.length > 0
      ? `${outOfStock.length} item(s) are out of stock and may block production or sales.`
      : "No out-of-stock item found in this view.",

    lowStock.length > 0
      ? `${lowStock.length} item(s) are below minimum stock. Reorder planning is needed.`
      : "Stock levels look healthy for the current view.",

    missingSuppliers.length > 0
      ? `${missingSuppliers.length} raw material item(s) have no supplier mapped.`
      : "Raw material supplier mapping looks good.",

    highestValueItem
      ? `${highestValueItem.name} has the highest stock value in this view: ${formatCurrency(
          highestValueItem.inventoryValue
        )}.`
      : "Add inventory items to generate insights.",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Factory1 Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight}
              className="rounded-lg border bg-muted/30 px-4 py-3 text-sm"
            >
              {insight}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}