import type { Employee } from "../types/employee.types";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";
import { toCsv } from "@/features/import-export/utils/csv";
import { EMPLOYEE_EXPORT_COLUMNS } from "./employeeExportColumns";

export const exportEmployeesCsv = (employees: Employee[]) => {
  const fileName = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = EMPLOYEE_EXPORT_COLUMNS.map((column) => column.label);
  const rows = employees.map((employee) =>
    EMPLOYEE_EXPORT_COLUMNS.map((column) => {
      const value = employee[column.value];
      return typeof value === "boolean" ? String(value) : value ?? "";
    })
  );

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
};
