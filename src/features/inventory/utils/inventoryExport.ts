import type { InventoryItem } from "../types/inventory.types";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";
import { toCsv } from "@/features/import-export/utils/csv";
import { itemTypeLabel } from "./inventoryHelpers";

export const exportInventoryCsv = (items: InventoryItem[]) => {
  const fileName = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
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

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
};
