import type { Supplier } from "../types/supplier.types";
import { toCsv } from "@/features/import-export/utils/csv";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";

export const exportSuppliersCsv = (suppliers: Supplier[]) => {
  const fileName = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    "Supplier Code",
    "Name",
    "Phone",
    "Email",
    "GST Number",
    "City",
    "State",
    "Contact Person",
    "Payment Terms",
    "Status",
    "Completeness",
  ];

  const rows = suppliers.map((s) => [
    s.supplierCode,
    s.name,
    s.phone ?? "",
    s.email ?? "",
    s.gstNumber ?? "",
    s.city ?? "",
    s.state ?? "",
    s.contactPerson ?? "",
    s.paymentTerms ?? "",
    s.status,
    `${s.dataCompletenessScore}%`,
  ]);

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
};
