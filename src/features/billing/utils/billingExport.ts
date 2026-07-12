import type { Bill } from "../types/billing.types";
import { toCsv } from "@/features/import-export/utils/csv";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";

export function exportBillsCsv(bills: Bill[]) {
  const fileName = `billing-${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    "Bill Number",
    "Type",
    "Party",
    "GST Number",
    "Bill Date",
    "Due Date",
    "Status",
    "Payment Status",
    "E-way Bill Number",
    "E-way Bill Date",
    "E-way Valid Until",
    "Transporter",
    "Vehicle Number",
    "Dispatch From",
    "Ship To",
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
    bill.ewayBillNumber ?? "",
    bill.ewayBillDate ?? "",
    bill.ewayBillValidUntil ?? "",
    bill.transporterName ?? "",
    bill.vehicleNumber ?? "",
    bill.dispatchFrom ?? "",
    bill.shipTo ?? "",
    bill.taxableAmount,
    bill.cgstAmount,
    bill.sgstAmount,
    bill.igstAmount,
    bill.roundOff,
    bill.grandTotal,
  ]);

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
