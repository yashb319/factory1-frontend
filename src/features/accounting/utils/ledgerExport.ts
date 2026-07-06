import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";
import type { LedgerReport } from "../types/accounting.types";

export function exportLedgerCsv(report: LedgerReport) {
  const fileName = `account-ledgers-${report.fromDate}-to-${report.toDate}.csv`;
  const headers = [
    "Party",
    "Type",
    "GST Number",
    "Bills",
    "Taxable Amount",
    "GST Amount",
    "Grand Total",
    "Paid Amount",
    "Outstanding",
  ];

  const rows = report.parties.map((party) => [
    party.partyName,
    party.type,
    party.partyGstNumber ?? "",
    party.billCount,
    party.taxableAmount,
    party.gstAmount,
    party.grandTotal,
    party.paidAmount,
    party.outstandingAmount,
  ]);

  const csv = toCsv([
    ["Ledger Report", `${report.fromDate} to ${report.toDate}`],
    ["Receivables", report.totalReceivables],
    ["Payables", report.totalPayables],
    ["Net Receivable", report.netReceivable],
    [],
    headers,
    ...rows,
  ]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
