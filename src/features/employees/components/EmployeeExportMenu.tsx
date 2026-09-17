"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { ExportColumn } from "@/components/export/export.types";
import { Employee } from "../types/employee.types";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";
import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";

interface Props {
  employees: Employee[];
}

const EMPLOYEE_EXPORT_COLUMNS: ExportColumn[] = [
  { label: "Employee Code", value: "employeeCode" },
  { label: "Name", value: "name" },
  { label: "Phone", value: "phone" },
  { label: "Mobile", value: "mobile" },
  { label: "Email", value: "email" },
  { label: "Department", value: "department" },
  { label: "Designation", value: "designation" },
  { label: "Salary Rate", value: "salaryRate" },
  { label: "Salary Type", value: "salaryType" },
  { label: "Joining Date", value: "joiningDate" },
  { label: "Status", value: "status" },
  { label: "Location", value: "location" },
  { label: "Date of Birth", value: "dateOfBirth" },
  { label: "Gender", value: "gender" },
  { label: "Employment Basis", value: "employmentBasis" },
  { label: "Reporting To", value: "reportingToEmployeeCode" },
  { label: "Address", value: "address" },
  { label: "Permanent Address", value: "permanentAddress" },
  { label: "Marital Status", value: "maritalStatus" },
  { label: "Aadhaar Number", value: "aadhaarNumber" },
  { label: "Account No", value: "bankAccountNumber" },
  { label: "Bank Name", value: "bankName" },
  { label: "Branch Name", value: "bankBranchName" },
  { label: "IFSC Code", value: "bankIfscCode" },
  { label: "PAN Number", value: "panNumber" },
  { label: "UAN", value: "uan" },
  { label: "Tax Regime", value: "taxRegime" },
];

export function EmployeeExportMenu({ employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const logDataJob = useLogDataJob();

  function handleStartExport(payload: { columns: string[] }) {
    const selectedColumns = EMPLOYEE_EXPORT_COLUMNS.filter((column) =>
      payload.columns.includes(column.value)
    );
    const fileName = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    const rows = employees.map((employee) =>
      selectedColumns.map((column) => {
        const cell = employee[column.value as keyof Employee];
        return typeof cell === "boolean" ? String(cell) : cell ?? "";
      })
    );
    const csv = toCsv([
      selectedColumns.map((column) => column.label),
      ...rows,
    ]);
    const saved = saveLocalExportFile({ fileName, content: csv });

    downloadCsv({ fileName, content: csv });

    void logDataJob({
      operation: "EXPORT",
      module: "EMPLOYEE",
      fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: employees.length,
      successRows: employees.length,
      failedRows: 0,
      outputFileUrl: saved.url,
    });
    toast.success("Employee CSV exported successfully.");
    setOpen(false);
    router.push("/import-export");
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={employees.length === 0}
        onClick={() => setOpen(true)}
      >
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>

      <ExportDialog
        open={open}
        onOpenChange={setOpen}
        title="Export Employees"
        moduleName="Employees"
        columns={EMPLOYEE_EXPORT_COLUMNS}
        onStartExport={handleStartExport}
      />
    </>
  );
}
