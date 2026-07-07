import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";
import type { ProfitLoss } from "../types/accounting.types";

export function exportProfitLossCsv(report: ProfitLoss) {
  const fileName = `profit-loss-${report.fromDate}-to-${report.toDate}.csv`;
  const summaryRows = [
    ["Profit & Loss", `${report.fromDate} to ${report.toDate}`],
    ["Trading Income", report.tradingIncome],
    ["Trading Expense", report.tradingExpense],
    ["Gross Profit", report.grossProfit],
    ["Indirect Income", report.indirectIncome],
    ["Indirect Expense", report.indirectExpense],
    ["Net Profit", report.netProfit],
    [],
  ];
  const headers = [
    "Ledger",
    "Group",
    "Section",
    "Amount",
  ];
  const rows = report.rows.map((row) => [
    row.ledgerName,
    row.groupName ?? "",
    row.section,
    row.amount,
  ]);
  const csv = toCsv([...summaryRows, headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
