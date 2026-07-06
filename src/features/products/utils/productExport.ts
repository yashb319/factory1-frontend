import type { Product } from "../types/product.types";
import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";

export function exportProductsCsv(products: Product[]) {
  const fileName = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    "Product Code",
    "Name",
    "Description",
    "Finished Good Inventory Item",
    "Unit",
    "BOM Configured",
    "Active",
  ];

  const rows = products.map((product) => [
    product.productCode,
    product.name,
    product.description ?? "",
    product.finishedGoodInventoryItemId,
    product.unit ?? "",
    product.hasBom ? "Yes" : "No",
    product.active ? "Yes" : "No",
  ]);

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
