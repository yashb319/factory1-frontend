import type { PayslipTemplateData } from "../../payslip-templates/types/payslipTemplate.types";
import { EMPLOYEE_INFO_FIELD_OPTIONS } from "../../payslip-templates/types/payslipTemplate.types";
import { amountToIndianWords } from "./numberToWords";
import { formatFieldValue, resolveField } from "./payslipData.utils";

interface TemplatePayslip {
  templateData: PayslipTemplateData;
  payslipData: unknown;
  payPeriodMonth: number;
  payPeriodYear: number;
}

/**
 * Produces a standalone HTML document mirroring <PayslipDocument />, so the
 * existing iframe + html2canvas download/print pipeline can capture the
 * template-driven payslip without depending on app stylesheets.
 */
export function buildTemplatePayslipHtml(payslip: TemplatePayslip): string {
  const { templateData } = payslip;
  const data = (payslip.payslipData ?? {}) as Record<string, unknown>;
  const netSalary = Number(resolveField(data, templateData.netPay.field) ?? 0);

  return `
<!doctype html>
<html>
<head>
<style>
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #0f172a;
  font-family: Arial, Helvetica, sans-serif;
}
body { display: flex; justify-content: center; }
#payslip-root {
  width: 794px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 32px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
}
.org-name { margin: 0; font-size: 18px; font-weight: 600; }
.muted { margin: 4px 0 0; font-size: 13px; color: #64748b; }
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 32px;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 0;
  font-size: 13px;
}
.row { display: flex; justify-content: space-between; gap: 16px; }
.label { color: #64748b; }
.strong { font-weight: 600; }
.tables { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.table-title { margin: 0 0 8px; font-size: 13px; font-weight: 600; }
.table-rows { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.full-width { margin-top: 16px; }
.net-box {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}
.net-label { font-size: 13px; font-weight: 600; }
.net-amount { font-size: 18px; font-weight: 700; }
.words { margin: 8px 0 0; font-size: 11px; color: #64748b; }
.signature {
  margin-top: 32px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
  font-size: 11px;
  color: #64748b;
}
</style>
</head>
<body>
<div id="payslip-root">
  <div class="header">
    <div>
      <p class="org-name">${escapeHtml(
        String(resolveField(data, "organization.name") ?? "Organization")
      )}</p>
      <p class="muted">${escapeHtml(
        String(resolveField(data, "organization.address") ?? "")
      )}</p>
    </div>
    <p class="muted">Pay period: ${payslip.payPeriodMonth}/${payslip.payPeriodYear}</p>
  </div>

  <div class="info-grid">
    ${templateData.employeeInfo.fields
      .map((field) =>
        buildRow(fieldLabel(field), String(resolveField(data, field) ?? "-"), true)
      )
      .join("")}
  </div>

  <div class="tables">
    ${buildTable("Earnings", templateData.earnings.rows, data)}
    ${buildTable("Deductions", templateData.deductions.rows, data)}
  </div>

  ${
    templateData.employerContributions.rows.length > 0
      ? `<div class="full-width">${buildTable(
          "Employer contributions (informational, not deducted)",
          templateData.employerContributions.rows,
          data
        )}</div>`
      : ""
  }

  <div class="net-box">
    <span class="net-label">Net Pay</span>
    <span class="net-amount">${escapeHtml(formatFieldValue(netSalary))}</span>
  </div>

  ${
    templateData.netPay.amountInWords
      ? `<p class="words">Amount in words: ${escapeHtml(
          amountToIndianWords(netSalary)
        )}</p>`
      : ""
  }

  ${
    templateData.signatureBlock.showSignature
      ? `<div class="signature">${escapeHtml(templateData.signatureBlock.text ?? "")}</div>`
      : ""
  }
</div>
</body>
</html>
`;
}

function buildTable(
  title: string,
  rows: { label: string; field: string }[],
  data: Record<string, unknown>
) {
  return `
    <div>
      <p class="table-title">${escapeHtml(title)}</p>
      <div class="table-rows">
        ${rows
          .map((row) =>
            buildRow(row.label, formatFieldValue(resolveField(data, row.field)))
          )
          .join("")}
      </div>
    </div>
  `;
}

function buildRow(label: string, value: string, strong = false) {
  return `
    <div class="row">
      <span class="label">${escapeHtml(label)}</span>
      <span class="${strong ? "strong" : ""}">${escapeHtml(value)}</span>
    </div>
  `;
}

function fieldLabel(field: string): string {
  return (
    EMPLOYEE_INFO_FIELD_OPTIONS.find((option) => option.value === field)?.label ??
    field
  );
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
