import type { Customer } from "../types/customer.types";
import { toCsv } from "@/features/import-export/utils/csv";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";

export const exportCustomersCsv = (customers: Customer[]) => {
  const fileName = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    "Customer Code",
    "Name",
    "Phone",
    "Email",
    "GST Number",
    "City",
    "State",
    "Pincode",
    "Country",
    "Contact Person",
    "Payment Terms",
    "Status",
    "Completeness",
  ];

  const rows = customers.map((c) => [
    c.customerCode,
    c.name,
    c.phone ?? "",
    c.email ?? "",
    c.gstNumber ?? "",
    c.city ?? "",
    c.state ?? "",
    c.pincode ?? "",
    c.country ?? "",
    c.contactPerson ?? "",
    c.paymentTerms ?? "",
    c.status,
    `${c.dataCompletenessScore}%`,
  ]);

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
};
