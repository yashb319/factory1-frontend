import { PayrollRunDetailsResponse } from "../types/payroll.types";
import { toCsv } from "@/features/import-export/utils/csv";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";

export function exportPayrollCsv(payroll: PayrollRunDetailsResponse) {
  const fileName = `payroll-${payroll.payrollMonth}-${payroll.payrollYear}.csv`;
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

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
