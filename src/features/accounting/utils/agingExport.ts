import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";
import type { AgingReport } from "../types/accounting.types";

export function exportAgingCsv(report: AgingReport) {
  const label = report.type === "SALES" ? "receivables" : "payables";
  const fileName = `${label}-aging-${report.asOfDate}.csv`;
  const csv = toCsv([
    [`${report.type === "SALES" ? "Receivables" : "Payables"} Aging`, report.asOfDate],
    ["Current", report.currentAmount],
    ["1-30", report.days1To30Amount],
    ["31-60", report.days31To60Amount],
    ["61-90", report.days61To90Amount],
    ["Over 90", report.over90Amount],
    ["Total Outstanding", report.totalOutstanding],
    [],
    [
      "Bill Number",
      "Party",
      "GST Number",
      "Bill Date",
      "Due Date",
      "Days Overdue",
      "Bucket",
      "Outstanding",
    ],
    ...report.rows.map((row) => [
      row.billNumber,
      row.partyName,
      row.partyGstNumber ?? "",
      row.billDate,
      row.dueDate ?? "",
      row.daysOverdue,
      row.bucket,
      row.outstandingAmount,
    ]),
  ]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
