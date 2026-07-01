import type { InventoryItem } from "../types/inventory.types";
import { itemTypeLabel } from "./inventoryHelpers";

export const exportInventoryCsv = (items: InventoryItem[]) => {
  const headers = [
    "Item Code",
    "Name",
    "Category",
    "Type",
    "Unit",
    "Current Stock",
    "Minimum Stock",
    "Purchase Price",
    "Selling Price",
    "Inventory Value",
    "Supplier",
    "Status",
  ];

  const rows = items.map((item) => [
    item.itemCode,
    item.name,
    item.category ?? "",
    itemTypeLabel(item.itemType),
    item.unit,
    item.currentStock,
    item.minimumStock,
    item.purchasePrice ?? "",
    item.sellingPrice ?? "",
    item.inventoryValue,
    item.supplierName ?? "",
    item.status,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};