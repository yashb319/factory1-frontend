import type { Bill, BillItem } from "../types/billing.types";
import type { OrganizationSettingsResponse } from "@/features/organization-settings/types/organizationSettings.types";
import { printHtml } from "@/features/import-export/utils/localExportFiles";

type PrintOrganization = Pick<
  OrganizationSettingsResponse,
  | "organizationName"
  | "organizationEmail"
  | "location"
  | "city"
  | "state"
  | "pincode"
  | "country"
  | "gstNumber"
>;

type HsnTaxRow = {
  hsnCode: string;
  taxable: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
};

export async function printInvoice(
  bill: Bill,
  organization?: PrintOrganization | null
) {
  return printHtml(invoiceHtml(bill, organization));
}

export function invoiceHtml(bill: Bill, organization?: PrintOrganization | null) {
  if (bill.type !== "SALES") {
    return voucherHtml(bill);
  }

  const orgName = organization?.organizationName || "Factory1";
  const orgAddress = compact([
    organization?.location,
    organization?.city,
    organization?.state,
    organization?.pincode,
  ]).join(", ");
  const orgState = organization?.state || stateFromGstin(organization?.gstNumber);
  const partyState = bill.placeOfSupply || stateFromGstin(bill.partyGstNumber);
  const taxRows = buildHsnRows(bill);
  const totalQuantity = bill.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const quantityUnit = commonUnit(bill.items);
  const taxAmount = Number(bill.cgstAmount || 0) + Number(bill.sgstAmount || 0) + Number(bill.igstAmount || 0);
  const taxMode = bill.intraState ? "split" : "integrated";

  return `
<!doctype html>
<html>
<head>
  <title>${escapeHtml(bill.billNumber)} - Tax Invoice</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f8fafc;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.25;
    }
    .actions {
      position: fixed;
      right: 18px;
      top: 18px;
      z-index: 5;
    }
    button {
      border: 1px solid #111827;
      border-radius: 4px;
      background: #111827;
      color: #fff;
      cursor: pointer;
      padding: 9px 14px;
      font-size: 13px;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 16px auto;
      background: #fff;
      padding: 11mm 12mm 9mm;
      box-shadow: 0 12px 35px rgba(15, 23, 42, 0.12);
    }
    .invoice {
      border: 1.5px solid #222;
    }
    .title {
      position: relative;
      min-height: 30px;
      border-bottom: 1px solid #222;
      text-align: center;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 7px 150px 6px;
      text-transform: uppercase;
    }
    .copy {
      position: absolute;
      right: 10px;
      top: 7px;
      font-size: 10px;
      font-style: italic;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .top-grid {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      border-bottom: 1px solid #222;
      min-height: 103mm;
    }
    .party-pane {
      border-right: 1px solid #222;
    }
    .party-block {
      min-height: 36mm;
      padding: 6px 7px;
      border-bottom: 1px solid #222;
    }
    .party-block:last-child { border-bottom: 0; }
    .block-label {
      margin-bottom: 2px;
      color: #333;
      font-size: 10px;
    }
    .name {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      height: 100%;
    }
    .detail-cell {
      min-height: 11.4mm;
      padding: 4px 6px;
      border-right: 1px solid #222;
      border-bottom: 1px solid #222;
    }
    .detail-cell:nth-child(2n) { border-right: 0; }
    .detail-label {
      color: #333;
      font-size: 10px;
    }
    .detail-value {
      margin-top: 2px;
      min-height: 13px;
      font-weight: 700;
      word-break: break-word;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border-right: 1px solid #222;
      border-bottom: 1px solid #222;
      padding: 4px 5px;
      vertical-align: top;
    }
    th:last-child, td:last-child { border-right: 0; }
    th {
      text-align: center;
      font-weight: 700;
    }
    .items {
      table-layout: fixed;
      min-height: 70mm;
    }
    .items th { height: 9mm; }
    .items tbody tr.item-row td { height: 12mm; }
    .items tbody tr.filler td {
      height: 38mm;
      border-bottom: 1px solid #222;
    }
    .sl { width: 8mm; text-align: center; }
    .desc { width: auto; }
    .hsn { width: 20mm; text-align: center; }
    .qty { width: 22mm; text-align: right; }
    .rate { width: 20mm; text-align: right; }
    .per { width: 13mm; text-align: center; }
    .disc { width: 16mm; text-align: center; }
    .amount { width: 29mm; text-align: right; }
    .bold { font-weight: 700; }
    .center { text-align: center; }
    .right { text-align: right; }
    .tax-line td {
      height: 8mm;
      font-weight: 700;
    }
    .total-line td {
      height: 8mm;
      font-weight: 800;
      font-size: 12px;
    }
    .words {
      border-bottom: 1px solid #222;
      padding: 5px 7px;
      min-height: 14mm;
    }
    .words strong {
      display: block;
      margin-top: 3px;
      font-size: 12px;
    }
    .tax-summary th,
    .tax-summary td {
      padding: 3px 5px;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      min-height: 38mm;
      border-top: 1px solid #222;
    }
    .declaration {
      padding: 7px;
      border-right: 1px solid #222;
    }
    .signature {
      position: relative;
      padding: 7px;
      text-align: right;
    }
    .signature .company {
      color: #1f4e79;
      font-size: 14px;
      font-weight: 800;
    }
    .sign-line {
      position: absolute;
      right: 12px;
      bottom: 9px;
      width: 58mm;
      border-top: 1px solid #222;
      padding-top: 4px;
      text-align: center;
      font-weight: 700;
    }
    .jurisdiction {
      padding: 5px 7px;
      text-align: center;
      font-weight: 700;
      border-top: 1px solid #222;
    }
    .generated {
      padding: 5px 7px;
      text-align: center;
      font-size: 12px;
    }
    @page { size: A4; margin: 8mm; }
    @media print {
      body { background: #fff; }
      .page {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <main class="page">
    <section class="invoice">
      <div class="title">
        Tax Invoice
        <span class="copy">(Original for Recipient)</span>
      </div>

      <div class="top-grid">
        <div class="party-pane">
          <div class="party-block">
            <div class="name">${escapeHtml(orgName)}</div>
            <div>${escapeHtml(orgAddress || "-")}</div>
            <div>GSTIN/UIN : <span class="bold">${escapeHtml(organization?.gstNumber || "-")}</span></div>
            <div>State Name : ${escapeHtml(orgState || "-")}${stateCodeText(organization?.gstNumber)}</div>
            ${organization?.organizationEmail ? `<div>E-Mail : ${escapeHtml(organization.organizationEmail)}</div>` : ""}
          </div>
          <div class="party-block">
            <div class="block-label">Buyer (Bill to)</div>
            <div class="name">${escapeHtml(bill.partyName)}</div>
            <div>${escapeHtml(bill.billingAddress || bill.shipTo || "-")}</div>
            <div>GSTIN/UIN : <span class="bold">${escapeHtml(bill.partyGstNumber || "-")}</span></div>
            <div>State Name : ${escapeHtml(partyState || "-")}${stateCodeText(bill.partyGstNumber)}</div>
          </div>
          <div class="party-block">
            <div class="block-label">Consignee (Ship to)</div>
            <div class="name">${escapeHtml(bill.partyName)}</div>
            <div>${escapeHtml(bill.shipTo || bill.billingAddress || "-")}</div>
            <div>GSTIN/UIN : <span class="bold">${escapeHtml(bill.partyGstNumber || "-")}</span></div>
            <div>State Name : ${escapeHtml(partyState || "-")}${stateCodeText(bill.partyGstNumber)}</div>
          </div>
        </div>

        <div class="details-grid">
          ${detailCell("Invoice No.", bill.billNumber)}
          ${detailCell("Dated", formatDate(bill.billDate))}
          ${detailCell("Delivery Note", "")}
          ${detailCell("Mode/Terms of Payment", bill.paymentStatus)}
          ${detailCell("Supplier's Ref.", "")}
          ${detailCell("Other Reference(s)", "")}
          ${detailCell("Buyer's Order No.", "")}
          ${detailCell("Dated", "")}
          ${detailCell("Despatch Document No.", "")}
          ${detailCell("Delivery Note Date", "")}
          ${detailCell("Despatched through", bill.transporterName || "")}
          ${detailCell("Destination", bill.placeOfSupply || "")}
          ${detailCell("Bill of Lading/LR-RR No.", "")}
          ${detailCell("Motor Vehicle No.", bill.vehicleNumber || "")}
          ${detailCell("e-Way Bill No.", bill.ewayBillNumber || "")}
          ${detailCell("Terms of Delivery", bill.notes || "")}
        </div>
      </div>

      <table class="items">
        <thead>
          <tr>
            <th class="sl">Sl<br/>No.</th>
            <th class="desc">Description of Goods</th>
            <th class="hsn">HSN/SAC</th>
            <th class="qty">Quantity</th>
            <th class="rate">Rate</th>
            <th class="per">per</th>
            <th class="disc">Disc. %</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map(itemRow).join("")}
          ${taxChargeRows(bill)}
          <tr class="filler">
            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>
          <tr class="total-line">
            <td></td>
            <td class="right">Total</td>
            <td></td>
            <td class="right">${formatQuantity(totalQuantity, quantityUnit)}</td>
            <td></td>
            <td></td>
            <td></td>
            <td class="right">Rs. ${formatNumber(bill.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="words">
        Amount Chargeable (in words)
        <strong>INR ${escapeHtml(numberToIndianWords(Math.round(Number(bill.grandTotal || 0))))} Only</strong>
      </div>

      <table class="tax-summary">
        <thead>
          ${taxMode === "integrated" ? `
          <tr>
            <th rowspan="2">HSN/SAC</th>
            <th rowspan="2" class="right">Taxable<br/>Value</th>
            <th colspan="2">Integrated Tax</th>
            <th rowspan="2" class="right">Total<br/>Tax Amount</th>
          </tr>
          <tr>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
          </tr>
          ` : `
          <tr>
            <th rowspan="2">HSN/SAC</th>
            <th rowspan="2" class="right">Taxable<br/>Value</th>
            <th colspan="2">CGST</th>
            <th colspan="2">SGST/UTGST</th>
            <th rowspan="2" class="right">Total<br/>Tax Amount</th>
          </tr>
          <tr>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
          </tr>
          `}
        </thead>
        <tbody>
          ${taxRows.map((row) => taxSummaryRow(row, taxMode)).join("")}
          ${taxSummaryTotalRow(taxRows, taxMode)}
        </tbody>
      </table>

      <div class="words">
        Tax Amount (in words) : <strong>INR ${escapeHtml(numberToIndianWords(Math.round(taxAmount)))} Only</strong>
      </div>

      <div class="footer-grid">
        <div class="declaration">
          <div>Company's PAN : <span class="bold">${escapeHtml(panFromGstin(organization?.gstNumber) || "-")}</span></div>
          <div style="margin-top: 8px;" class="bold">Declaration</div>
          <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
        </div>
        <div class="signature">
          <div>for <span class="company">${escapeHtml(orgName)}</span></div>
          <div class="sign-line">Authorised Signatory</div>
        </div>
      </div>

      <div class="jurisdiction">SUBJECT TO ${escapeHtml((organization?.city || organization?.state || "LOCAL").toUpperCase())} JURISDICTION</div>
      <div class="generated">This is a Computer Generated Invoice</div>
    </section>
  </main>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      setTimeout(function () {
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;
}

function voucherHtml(bill: Bill) {
  return `
<!doctype html>
<html>
<head>
  <title>${escapeHtml(bill.billNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
    .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 18px; }
    h1 { margin: 0; font-size: 24px; }
    h2 { margin: 0 0 8px; font-size: 16px; }
    .muted { color: #64748b; font-size: 12px; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 22px; }
    .box { border: 1px solid #cbd5e1; padding: 14px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; }
    .right { text-align: right; }
    .totals { margin-left: auto; margin-top: 18px; width: 320px; }
    .totals div { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; }
    .grand { font-weight: 700; font-size: 16px; }
    .actions { position: fixed; right: 24px; top: 24px; display: flex; gap: 8px; }
    button { border: 1px solid #0f172a; border-radius: 6px; background: #0f172a; color: white; cursor: pointer; padding: 9px 14px; }
    @media print { body { margin: 18mm; } .actions { display: none; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
  <div class="top">
    <div>
      <h1>Purchase Voucher</h1>
      <p class="muted">Factory1 generated voucher</p>
    </div>
    <div class="right">
      <h2>${escapeHtml(bill.billNumber)}</h2>
      <p class="muted">Date: ${bill.billDate}<br/>Status: ${bill.status}</p>
    </div>
  </div>
  <div class="grid">
    <div class="box">
      <h2>Supplier</h2>
      <strong>${escapeHtml(bill.partyName)}</strong>
      <p class="muted">GSTIN: ${escapeHtml(bill.partyGstNumber ?? "-")}<br/>${escapeHtml(bill.billingAddress ?? "")}</p>
    </div>
    <div class="box">
      <h2>Voucher Details</h2>
      <p class="muted">Due date: ${bill.dueDate ?? "-"}<br/>Place of supply: ${escapeHtml(bill.placeOfSupply ?? "-")}<br/>Payment: ${bill.paymentStatus}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Item</th><th>HSN</th><th class="right">Qty</th><th>Unit</th><th class="right">Rate</th><th class="right">GST %</th><th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${bill.items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.itemName)}</td>
          <td>${escapeHtml(item.hsnCode ?? "")}</td>
          <td class="right">${item.quantity}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td class="right">${money(item.rate)}</td>
          <td class="right">${item.gstRate}</td>
          <td class="right">${money(item.lineTotal)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <div class="totals">
    <div><span>Taxable</span><span>${money(bill.taxableAmount)}</span></div>
    <div><span>CGST</span><span>${money(bill.cgstAmount)}</span></div>
    <div><span>SGST</span><span>${money(bill.sgstAmount)}</span></div>
    <div><span>IGST</span><span>${money(bill.igstAmount)}</span></div>
    <div><span>Round off</span><span>${money(bill.roundOff)}</span></div>
    <div class="grand"><span>Grand total</span><span>${money(bill.grandTotal)}</span></div>
  </div>
  <p class="muted">Narration: ${escapeHtml(bill.notes ?? "-")}</p>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;
}

function detailCell(label: string, value: string | number | null | undefined) {
  return `
    <div class="detail-cell">
      <div class="detail-label">${escapeHtml(label)}</div>
      <div class="detail-value">${escapeHtml(String(value ?? ""))}</div>
    </div>
  `;
}

function itemRow(item: BillItem, index: number) {
  return `
    <tr class="item-row">
      <td class="sl">${index + 1}</td>
      <td class="desc bold">${escapeHtml(item.itemName)}</td>
      <td class="hsn">${escapeHtml(item.hsnCode || "")}</td>
      <td class="qty bold">${formatQuantity(item.quantity, item.unit)}</td>
      <td class="rate">${formatNumber(item.rate)}</td>
      <td class="per">${escapeHtml(item.unit || "")}</td>
      <td class="disc">${item.discountAmount ? formatNumber(item.discountAmount) : ""}</td>
      <td class="amount bold">${formatNumber(item.taxableAmount)}</td>
    </tr>
  `;
}

function taxChargeRows(bill: Bill) {
  if (bill.intraState) {
    return `
      <tr class="tax-line">
        <td></td><td class="right">CGST</td><td></td><td></td><td class="right"></td><td>%</td><td></td><td class="amount">${formatNumber(bill.cgstAmount)}</td>
      </tr>
      <tr class="tax-line">
        <td></td><td class="right">SGST</td><td></td><td></td><td class="right"></td><td>%</td><td></td><td class="amount">${formatNumber(bill.sgstAmount)}</td>
      </tr>
      ${Number(bill.roundOff || 0) ? `
      <tr class="tax-line">
        <td></td><td class="right">Round Off</td><td></td><td></td><td></td><td></td><td></td><td class="amount">${formatNumber(bill.roundOff)}</td>
      </tr>` : ""}
    `;
  }

  return `
    <tr class="tax-line">
      <td></td><td class="right">IGST</td><td></td><td></td><td class="right"></td><td>%</td><td></td><td class="amount">${formatNumber(bill.igstAmount)}</td>
    </tr>
    ${Number(bill.roundOff || 0) ? `
    <tr class="tax-line">
      <td></td><td class="right">Round Off</td><td></td><td></td><td></td><td></td><td></td><td class="amount">${formatNumber(bill.roundOff)}</td>
    </tr>` : ""}
  `;
}

function buildHsnRows(bill: Bill) {
  const rows = new Map<string, HsnTaxRow>();
  bill.items.forEach((item) => {
    const hsnCode = item.hsnCode || "N/A";
    const existing =
      rows.get(hsnCode) ??
      {
        hsnCode,
        taxable: 0,
        cgstRate: bill.intraState ? Number(item.gstRate || 0) / 2 : 0,
        cgstAmount: 0,
        sgstRate: bill.intraState ? Number(item.gstRate || 0) / 2 : 0,
        sgstAmount: 0,
        igstRate: bill.intraState ? 0 : Number(item.gstRate || 0),
        igstAmount: 0,
        totalTax: 0,
      };
    existing.taxable += Number(item.taxableAmount || 0);
    existing.cgstAmount += Number(item.cgstAmount || 0);
    existing.sgstAmount += Number(item.sgstAmount || 0);
    existing.igstAmount += Number(item.igstAmount || 0);
    existing.totalTax =
      existing.cgstAmount + existing.sgstAmount + existing.igstAmount;
    rows.set(hsnCode, existing);
  });
  return [...rows.values()];
}

function taxSummaryRow(row: HsnTaxRow, mode: "split" | "integrated") {
  if (mode === "integrated") {
    return `
      <tr>
        <td>${escapeHtml(row.hsnCode)}</td>
        <td class="right">${formatNumber(row.taxable)}</td>
        <td class="right">${formatPercent(row.igstRate)}</td>
        <td class="right">${formatNumber(row.igstAmount)}</td>
        <td class="right">${formatNumber(row.totalTax)}</td>
      </tr>
    `;
  }
  return `
    <tr>
      <td>${escapeHtml(row.hsnCode)}</td>
      <td class="right">${formatNumber(row.taxable)}</td>
      <td class="right">${formatPercent(row.cgstRate)}</td>
      <td class="right">${formatNumber(row.cgstAmount)}</td>
      <td class="right">${formatPercent(row.sgstRate)}</td>
      <td class="right">${formatNumber(row.sgstAmount)}</td>
      <td class="right">${formatNumber(row.totalTax)}</td>
    </tr>
  `;
}

function taxSummaryTotalRow(rows: HsnTaxRow[], mode: "split" | "integrated") {
  const totals = rows.reduce(
    (sum, row) => ({
      taxable: sum.taxable + row.taxable,
      cgst: sum.cgst + row.cgstAmount,
      sgst: sum.sgst + row.sgstAmount,
      igst: sum.igst + row.igstAmount,
      tax: sum.tax + row.totalTax,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 }
  );

  if (mode === "integrated") {
    return `
      <tr class="bold">
        <td class="right">Total</td>
        <td class="right">${formatNumber(totals.taxable)}</td>
        <td></td>
        <td class="right">${formatNumber(totals.igst)}</td>
        <td class="right">${formatNumber(totals.tax)}</td>
      </tr>
    `;
  }
  return `
    <tr class="bold">
      <td class="right">Total</td>
      <td class="right">${formatNumber(totals.taxable)}</td>
      <td></td>
      <td class="right">${formatNumber(totals.cgst)}</td>
      <td></td>
      <td class="right">${formatNumber(totals.sgst)}</td>
      <td class="right">${formatNumber(totals.tax)}</td>
    </tr>
  `;
}

function commonUnit(items: BillItem[]) {
  const first = items[0]?.unit || "";
  return items.every((item) => item.unit === first) ? first : "";
}

function compact(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatQuantity(value: number, unit?: string | null) {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value || 0));
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0))}%`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function stateFromGstin(gstin?: string | null) {
  if (!gstin || gstin.length < 2) {
    return "";
  }
  return "";
}

function stateCodeText(gstin?: string | null) {
  if (!gstin || gstin.length < 2) {
    return "";
  }
  return `, Code : ${escapeHtml(gstin.slice(0, 2))}`;
}

function panFromGstin(gstin?: string | null) {
  if (!gstin || gstin.length < 12) {
    return "";
  }
  return gstin.slice(2, 12);
}

function numberToIndianWords(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "Zero";
  }
  if (value === 0) {
    return "Zero";
  }

  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const underHundred = (amount: number) => {
    if (amount < 20) {
      return units[amount];
    }
    return [tens[Math.floor(amount / 10)], units[amount % 10]]
      .filter(Boolean)
      .join(" ");
  };

  const underThousand = (amount: number) => {
    if (amount < 100) {
      return underHundred(amount);
    }
    return [
      units[Math.floor(amount / 100)],
      "Hundred",
      underHundred(amount % 100),
    ]
      .filter(Boolean)
      .join(" ");
  };

  const crore = Math.floor(value / 10000000);
  value %= 10000000;
  const lakh = Math.floor(value / 100000);
  value %= 100000;
  const thousand = Math.floor(value / 1000);
  value %= 1000;
  const parts = [
    crore ? `${underThousand(crore)} Crore` : "",
    lakh ? `${underThousand(lakh)} Lakh` : "",
    thousand ? `${underThousand(thousand)} Thousand` : "",
    value ? underThousand(value) : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
