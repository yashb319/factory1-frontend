import type { Supplier } from "../types/supplier.types";

export const exportSuppliersCsv = (suppliers: Supplier[]) => {
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

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};