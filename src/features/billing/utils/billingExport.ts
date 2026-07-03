import type { Bill } from "../types/billing.types";

export function exportBillsCsv(bills: Bill[]) {
  const headers = [
    "Bill Number",
    "Type",
    "Party",
    "GST Number",
    "Bill Date",
    "Due Date",
    "Status",
    "Payment Status",
    "Taxable Amount",
    "CGST",
    "SGST",
    "IGST",
    "Round Off",
    "Grand Total",
  ];

  const rows = bills.map((bill) => [
    bill.billNumber,
    bill.type,
    bill.partyName,
    bill.partyGstNumber ?? "",
    bill.billDate,
    bill.dueDate ?? "",
    bill.status,
    bill.paymentStatus,
    bill.taxableAmount,
    bill.cgstAmount,
    bill.sgstAmount,
    bill.igstAmount,
    bill.roundOff,
    bill.grandTotal,
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
  link.download = `billing-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
