import type {
  AccountingVoucher,
  AccountingVoucherLine,
} from "../types/accounting.types";

type PrintOrganization = {
  organizationName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  gstNumber?: string | null;
};

function qrCodeUrl(value: string) {
  const text = encodeURIComponent(value);
  return `https://chart.googleapis.com/chart?cht=qr&chs=120x120&chl=${text}`;
}

function orgBlock(org?: PrintOrganization | null) {
  if (!org) return "";
  const name = org.organizationName
    ? `<div style="font-size:15px;font-weight:700;letter-spacing:.3px;">${org.organizationName}</div>`
    : "";
  const lines = [org.addressLine1, org.addressLine2, org.city, org.state, org.pinCode]
    .filter(Boolean)
    .join(", ");
  const address = lines ? `<div>${lines}</div>` : "";
  const gst = org.gstNumber
    ? `<div>GSTIN: ${org.gstNumber}</div>`
    : "";
  return `<div style="margin-bottom:4px;">${name}${address}${gst}</div>`;
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

function escapeHtml(value?: string | null) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function lineRows(
  lines: AccountingVoucherLine[],
  ledgerNames: Record<string, string>,
) {
  if (!lines?.length) return `<tr><td colspan="4" style="text-align:center;">No entries</td></tr>`;
  return lines
    .map((line, index) => {
      const name = ledgerNames[line.ledgerId] ?? line.ledgerId;
      return `<tr>
        <td style="text-align:right;padding:2px 6px;">${index + 1}</td>
        <td style="padding:2px 6px;">${escapeHtml(name)}${
          line.description ? `<br/><span style="color:#666;font-size:11px;">${escapeHtml(line.description)}</span>` : ""
        }</td>
        <td style="text-align:right;padding:2px 6px;">${
          line.entryType === "DR" ? formatCurrency(line.amount) : ""
        }</td>
        <td style="text-align:right;padding:2px 6px;">${
          line.entryType === "CR" ? formatCurrency(line.amount) : ""
        }</td>
      </tr>`;
    })
    .join("");
}

export function voucherHtml(
  voucher: AccountingVoucher,
  org?: PrintOrganization | null,
  ledgerNames: Record<string, string> = {},
) {
  const totalDebit = (voucher.lines ?? []).reduce(
    (sum, l) => (l.entryType === "DR" ? sum + (l.amount ?? 0) : sum),
    0,
  );
  const totalCredit = (voucher.lines ?? []).reduce(
    (sum, l) => (l.entryType === "CR" ? sum + (l.amount ?? 0) : sum),
    0,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${labelCase(voucher.voucherType)} Voucher - ${voucher.voucherNumber}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 24px; }
  .sheet { max-width: 800px; margin: 0 auto; border: 1px solid #222; padding: 18px 22px; }
  .title { text-align: center; font-size: 18px; font-weight: 800; margin-bottom: 6px; text-transform: uppercase; }
  .sub { text-align: center; color: #444; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { border-bottom: 1px solid #222; text-align: left; padding: 4px 6px; }
  .meta { display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px; }
  .totals { margin-top: 10px; }
  .totals td { padding: 3px 6px; }
  .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 12px; color: #555; }
  .qr { text-align: right; }
</style>
</head>
<body>
  <div class="sheet">
    <div style="text-align:center;">${orgBlock(org)}</div>
    <div class="title">${labelCase(voucher.voucherType)} Voucher</div>
    <div class="sub">${voucher.voucherNumber || "DRAFT"}</div>
    <div class="meta">
      <div><strong>Date:</strong> ${voucher.voucherDate || ""}</div>
      <div><strong>Status:</strong> ${voucher.posted ? "POSTED" : "DRAFT"}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:6%;text-align:right;">#</th>
          <th>Ledger</th>
          <th style="width:22%;text-align:right;">Debit</th>
          <th style="width:22%;text-align:right;">Credit</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows(voucher.lines ?? [], ledgerNames)}
      </tbody>
      <tfoot>
        <tr class="totals">
          <td colspan="2" style="text-align:right;font-weight:700;">Totals</td>
          <td style="text-align:right;font-weight:700;border-top:1px solid #222;">${formatCurrency(totalDebit)}</td>
          <td style="text-align:right;font-weight:700;border-top:1px solid #222;">${formatCurrency(totalCredit)}</td>
        </tr>
      </tfoot>
    </table>
    ${
      voucher.narration
        ? `<div style="margin-top:12px;font-size:13px;"><strong>Narration:</strong> ${escapeHtml(voucher.narration)}</div>`
        : ""
    }
    <div class="footer">
      <div>This is a system generated voucher.</div>
      <div class="qr"><img src="${qrCodeUrl(
        `${voucher.voucherNumber}`,
      )}" alt="QR" /></div>
    </div>
  </div>
</body>
</html>`;
}

export async function printVoucher(
  voucher: AccountingVoucher,
  org?: PrintOrganization | null,
  ledgerNames: Record<string, string> = {},
) {
  const html = voucherHtml(voucher, org, ledgerNames);
  const { printHtml } = await import(
    "@/features/import-export/utils/localExportFiles"
  );
  return printHtml(html);
}
