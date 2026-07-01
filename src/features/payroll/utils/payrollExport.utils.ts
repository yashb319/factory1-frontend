import { PayrollRunDetailsResponse } from "../types/payroll.types";

export function exportPayrollCsv(payroll: PayrollRunDetailsResponse) {
  const headers = [
    "Employee Code",
    "Employee Name",
    "Salary Type",
    "Base Salary",
    "Working Days",
    "Present Days",
    "Total Hours",
    "Overtime Hours",
    "Gross Salary",
    "Overtime Amount",
    "Deductions",
    "Net Salary",
  ];

  const rows = payroll.items.map((item) => [
    item.employeeCode,
    item.employeeName,
    item.salaryType,
    item.baseSalary,
    item.totalWorkingDays,
    item.presentDays,
    item.totalHours,
    item.overtimeHours,
    item.grossSalary,
    item.overtimeAmount,
    item.deductions,
    item.netSalary,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `payroll-${payroll.payrollMonth}-${payroll.payrollYear}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}