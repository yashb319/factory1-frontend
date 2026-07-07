import type { Bill } from "../types/billing.types";

export function printInvoice(bill: Bill) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    return false;
  }

  try {
    printWindow.document.open();
    printWindow.document.write(invoiceHtml(bill));
    printWindow.document.close();
  } catch {
    printWindow.close();
    return false;
  }

  return true;
}

function invoiceHtml(bill: Bill) {
  const gstLabel = bill.intraState ? "CGST + SGST" : "IGST";

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
  <div class="actions">
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="top">
    <div>
      <h1>${bill.type === "SALES" ? "Tax Invoice" : "Purchase Voucher"}</h1>
      <p class="muted">Factory1 generated voucher</p>
    </div>
    <div class="right">
      <h2>${escapeHtml(bill.billNumber)}</h2>
      <p class="muted">Date: ${bill.billDate}<br/>Status: ${bill.status}<br/>GST: ${gstLabel}</p>
    </div>
  </div>
  <div class="grid">
    <div class="box">
      <h2>${bill.type === "SALES" ? "Bill To" : "Supplier"}</h2>
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
      setTimeout(function () {
        window.print();
      }, 250);
    });
  </script>
</body>
</html>`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
