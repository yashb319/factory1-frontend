import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";
import type { BalanceSheet } from "../types/accounting.types";

export function exportBalanceSheetCsv(report: BalanceSheet) {
  const fileName = `balance-sheet-${report.fromDate}-to-${report.toDate}.csv`;
  const maxRows = Math.max(report.assets.length, report.liabilities.length);
  const rows = Array.from({ length: maxRows }, (_, index) => {
    const asset = report.assets[index];
    const liability = report.liabilities[index];

    return [
      asset?.ledgerName ?? "",
      asset?.groupName ?? "",
      asset?.amount ?? "",
      liability?.ledgerName ?? "",
      liability?.groupName ?? "",
      liability?.amount ?? "",
    ];
  });
  const csv = toCsv([
    ["Balance Sheet", `${report.fromDate} to ${report.toDate}`],
    ["Total Assets", report.totalAssets],
    ["Total Liabilities", report.totalLiabilities],
    ["Current Period Profit", report.netProfit],
    ["Difference", report.difference],
    [],
    [
      "Asset Ledger",
      "Asset Group",
      "Asset Amount",
      "Liability Ledger",
      "Liability Group",
      "Liability Amount",
    ],
    ...rows,
  ]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
