import { toCsv } from "@/features/import-export/utils/csv";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";
import type { AccountingVoucher } from "../types/accounting.types";

export function exportDayBookCsv(
  vouchers: AccountingVoucher[],
  fromDate: string,
  toDate: string
) {
  const fileName = `day-book-${fromDate}-to-${toDate}.csv`;
  const rows = vouchers.flatMap((voucher) =>
    voucher.lines.map((line) => [
      voucher.voucherDate,
      voucher.voucherNumber,
      voucher.voucherType,
      line.ledgerName ?? "",
      line.entryType,
      line.amount,
      line.description ?? "",
      voucher.narration ?? "",
    ])
  );

  const csv = toCsv([
    [
      "Date",
      "Voucher Number",
      "Voucher Type",
      "Ledger",
      "Dr/Cr",
      "Amount",
      "Line Description",
      "Narration",
    ],
    ...rows,
  ]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
    totalRows: rows.length,
  };
}
