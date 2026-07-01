import {
  PayrollItemResponse,
  PayrollRunDetailsResponse,
} from "../types/payroll.types";
import { formatCurrency, getMonthName } from "./payroll.utils";

export function buildPayslipHtml(
  payroll: PayrollRunDetailsResponse,
  item: PayrollItemResponse
) {
  const monthYear = `${getMonthName(payroll.payrollMonth)} ${payroll.payrollYear}`;

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
  color: #020617;
  font-family: Arial, Helvetica, sans-serif;
}
body {
  display: flex;
  justify-content: center;
}
#payslip-root {
  width: 794px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 28px;
}
.header {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 18px;
}
.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}
.muted {
  margin: 6px 0 0;
  font-size: 13px;
  color: #475569;
}
.right { text-align: right; }
.small-muted {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}
.month {
  margin: 4px 0 0;
  font-size: 22px;
  font-weight: 700;
  color: #1d4ed8;
  text-transform: uppercase;
}
.section-title {
  margin-top: 20px;
  background: #eff6ff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  text-transform: uppercase;
}
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 28px;
  margin-top: 12px;
}
.info-label {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}
.info-value {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 12px;
}
.metric {
  padding: 14px 8px;
  text-align: center;
  border-right: 1px solid #cbd5e1;
}
.metric:last-child { border-right: none; }
.metric-label {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}
.metric-value {
  margin: 6px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}
.amount-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}
.amount-box {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
}
.amount-title {
  background: #eff6ff;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
}
.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
}
.amount-row:first-of-type { border-top: none; }
.amount-row.total { font-weight: 700; }
.net-box {
  margin-top: 20px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
}
.net-header {
  background: #eff6ff;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
  text-transform: uppercase;
}
.net-content {
  display: flex;
  justify-content: space-between;
  padding: 18px 12px;
  align-items: center;
}
.net-title {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}
.net-note {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 600;
}
.net-amount {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #1d4ed8;
}
.footer {
  margin: 18px 0 0;
  font-size: 11px;
  color: #64748b;
}
</style>
</head>
<body>
<div id="payslip-root">
  <div class="header">
    <div>
      <h2 class="title">Factory1 Payslip</h2>
      <p class="muted">Computer generated salary slip</p>
    </div>
    <div class="right">
      <p class="small-muted">Payslip for</p>
      <p class="month">${escapeHtml(monthYear)}</p>
    </div>
  </div>

  <div class="section-title">Employee Details</div>
  <div class="details-grid">
    ${info("Employee Name", item.employeeName)}
    ${info("Employee Code", item.employeeCode)}
    ${info("Salary Type", item.salaryType)}
    ${info("Base Salary", formatCurrency(item.baseSalary))}
  </div>

  <div class="section-title">Attendance Summary</div>
  <div class="metric-grid">
    ${metric("Working Days", item.totalWorkingDays)}
    ${metric("Present Days", item.presentDays)}
    ${metric("Total Hours", item.totalHours)}
    ${metric("Overtime Hours", item.overtimeHours)}
  </div>

  <div class="amount-grid">
    <div class="amount-box">
      <div class="amount-title">Earnings</div>
      ${amountRow("Basic Salary", formatCurrency(item.grossSalary))}
      ${amountRow("Overtime Amount", formatCurrency(item.overtimeAmount))}
      ${amountRow("Total Earnings", formatCurrency(item.grossSalary), true)}
    </div>

    <div class="amount-box">
      <div class="amount-title">Deductions</div>
      ${amountRow("Total Deductions", formatCurrency(item.deductions), true)}
    </div>
  </div>

  <div class="net-box">
    <div class="net-header">Net Salary</div>
    <div class="net-content">
      <div>
        <p class="net-title">Net Salary Payable</p>
        <p class="net-note">This is a computer generated payslip.</p>
      </div>
      <p class="net-amount">${escapeHtml(formatCurrency(item.netSalary))}</p>
    </div>
  </div>

  <p class="footer">
    This payslip is generated by Factory1 and does not require a physical signature.
  </p>
</div>
</body>
</html>
`;
}

function info(label: string, value?: string | number) {
  return `
    <div>
      <p class="info-label">${escapeHtml(label)}</p>
      <p class="info-value">${escapeHtml(value ?? "-")}</p>
    </div>
  `;
}

function metric(label: string, value?: string | number) {
  return `
    <div class="metric">
      <p class="metric-label">${escapeHtml(label)}</p>
      <p class="metric-value">${escapeHtml(value ?? "-")}</p>
    </div>
  `;
}

function amountRow(label: string, value: string, total = false) {
  return `
    <div class="amount-row ${total ? "total" : ""}">
      <span>${escapeHtml(label)}</span>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}