import type { AccountingVoucher } from "../types/accounting.types";

function escapeHtml(value?: string | null) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function labelCase(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

// Mirrors the voucher print used by the main (new) UI so Tally and the new
// interface produce identical output.
export function voucherHtml(voucher: AccountingVoucher) {
  const rows = (voucher.lines ?? [])
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.ledgerName ?? "Ledger")}</td>
          <td>${line.entryType}</td>
          <td class="num">${formatCurrency(line.amount)}</td>
          <td>${escapeHtml(line.description ?? "")}</td>
        </tr>
      `,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <title>${escapeHtml(voucher.voucherNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
      h1 { margin: 0 0 4px; font-size: 24px; }
      .meta { color: #4b5563; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
      th { background: #f3f4f6; }
      .num { text-align: right; }
      .total { margin-top: 16px; text-align: right; font-weight: 700; }
      .narration { margin-top: 16px; color: #374151; }
    </style>
  </head>
  <body>
    <h1>Accounting Voucher</h1>
    <div class="meta">
      <strong>${escapeHtml(voucher.voucherNumber)}</strong> · ${labelCase(
        voucher.voucherType,
      )} · ${escapeHtml(voucher.voucherDate)}
    </div>
    <table>
      <thead>
        <tr>
          <th>Ledger</th>
          <th>Dr/Cr</th>
          <th class="num">Amount</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total">
      Debit ${formatCurrency(voucher.totalDebit)} · Credit ${formatCurrency(
        voucher.totalCredit,
      )}
    </div>
    ${
      voucher.narration
        ? `<div class="narration">Narration: ${escapeHtml(voucher.narration)}</div>`
        : ""
    }
    <script>
      window.onload = function () {
        window.print();
        window.onafterprint = function () { window.close(); };
      };
    </script>
  </body>
</html>`;
}

export async function printVoucher(voucher: AccountingVoucher) {
  const { printHtml } = await import(
    "@/features/import-export/utils/localExportFiles"
  );
  return printHtml(voucherHtml(voucher));
}
