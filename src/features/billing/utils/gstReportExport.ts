import type { GstReport } from "../types/billing.types";
import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";

export function exportGstReportCsv(report: GstReport) {
  const fileName = `gst-report-${report.fromDate}-to-${report.toDate}.csv`;
  const summaryRows = [
    ["GST Report", `${report.fromDate} to ${report.toDate}`],
    ["Sales Taxable", report.salesTaxableAmount],
    ["Sales CGST", report.salesCgstAmount],
    ["Sales SGST", report.salesSgstAmount],
    ["Sales IGST", report.salesIgstAmount],
    ["Purchase Taxable", report.purchaseTaxableAmount],
    ["Purchase CGST", report.purchaseCgstAmount],
    ["Purchase SGST", report.purchaseSgstAmount],
    ["Purchase IGST", report.purchaseIgstAmount],
    ["Net GST Payable", report.netGstPayable],
    [],
  ];
  const headers = [
    "Bill Number",
    "Type",
    "Bill Date",
    "Party",
    "GST Number",
    "Taxable Amount",
    "CGST",
    "SGST",
    "IGST",
    "Grand Total",
  ];
  const rows = report.rows.map((row) => [
    row.billNumber,
    row.type,
    row.billDate,
    row.partyName,
    row.partyGstNumber ?? "",
    row.taxableAmount,
    row.cgstAmount,
    row.sgstAmount,
    row.igstAmount,
    row.grandTotal,
  ]);
  const csv = toCsv([...summaryRows, headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
