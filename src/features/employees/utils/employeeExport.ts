import type { Employee } from "../types/employee.types";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";
import { toCsv } from "@/features/import-export/utils/csv";

export const exportEmployeesCsv = (employees: Employee[]) => {
  const fileName = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    "Employee Code",
    "Name",
    "Phone",
    "Email",
    "Employee Type",
    "Department",
    "Designation",
    "Salary Rate",
    "Salary Type",
    "Status",
  ];

  const rows = employees.map((employee) => [
    employee.employeeCode,
    employee.name,
    employee.phone ?? "",
    employee.email ?? "",
    employee.employeeType,
    employee.department ?? "",
    employee.designation ?? "",
    employee.salaryRate,
    employee.salaryType,
    employee.status,
  ]);

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
};
