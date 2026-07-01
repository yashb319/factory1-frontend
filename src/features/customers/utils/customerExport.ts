import type { Customer } from "../types/customer.types";

export const exportCustomersCsv = (customers: Customer[]) => {
  const headers = [
    "Customer Code",
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

  const rows = customers.map((c) => [
    c.customerCode,
    c.name,
    c.phone ?? "",
    c.email ?? "",
    c.gstNumber ?? "",
    c.city ?? "",
    c.state ?? "",
    c.contactPerson ?? "",
    c.paymentTerms ?? "",
    c.status,
    `${c.dataCompletenessScore}%`,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};