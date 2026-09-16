import type { Employee } from "../types/employee.types";
import { downloadCsv, saveLocalExportFile } from "@/features/import-export/utils/localExportFiles";
import { toCsv } from "@/features/import-export/utils/csv";

export const exportEmployeesCsv = (employees: Employee[]) => {
  const fileName = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    "Employee Code",
    "Name",
    "Phone",
    "Mobile",
    "Email",
    "Department",
    "Designation",
    "Salary Rate",
    "Salary Type",
    "Joining Date",
    "Status",
    "Location",
    "Date of Birth",
    "Gender",
    "Employment Basis",
    "Reporting To",
    "Address",
    "Permanent Address",
    "Marital Status",
    "Aadhaar Number",
    "Account No",
    "Bank Name",
    "Branch Name",
    "IFSC Code",
    "PAN Number",
    "UAN",
    "Tax Regime",
  ];

  const rows = employees.map((employee) => [
    employee.employeeCode,
    employee.name,
    employee.phone ?? "",
    employee.mobile ?? "",
    employee.email ?? "",
    employee.department ?? "",
    employee.designation ?? "",
    employee.salaryRate,
    employee.salaryType,
    employee.joiningDate ?? "",
    employee.status,
    employee.location ?? "",
    employee.dateOfBirth ?? "",
    employee.gender ?? "",
    employee.employmentBasis ?? "",
    employee.reportingToEmployeeCode ?? "",
    employee.address ?? "",
    employee.permanentAddress ?? "",
    employee.maritalStatus ?? "",
    employee.aadhaarNumber ?? "",
    employee.bankAccountNumber ?? "",
    employee.bankName ?? "",
    employee.bankBranchName ?? "",
    employee.bankIfscCode ?? "",
    employee.panNumber ?? "",
    employee.uan ?? "",
    employee.taxRegime ?? "",
  ]);

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
};
