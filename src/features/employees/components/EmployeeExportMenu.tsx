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

interface Props {
  employees: Employee[];
}

const EMPLOYEE_EXPORT_COLUMNS: ExportColumn[] = [
  { label: "Employee Code", value: "employeeCode" },
  { label: "Name", value: "name" },
  { label: "Phone", value: "phone" },
  { label: "Email", value: "email" },
  { label: "Employee Type", value: "employeeType" },
  { label: "Department", value: "department" },
  { label: "Designation", value: "designation" },
  { label: "Salary Rate", value: "salaryRate" },
  { label: "Salary Type", value: "salaryType" },
  { label: "Joining Date", value: "joiningDate" },
  { label: "Status", value: "status" },
];

export function EmployeeExportMenu({ employees }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const logDataJob = useLogDataJob();

  function handleStartExport() {
    void logDataJob({
      operation: "EXPORT",
      module: "EMPLOYEE",
      fileName: `employees-${new Date().toISOString().slice(0, 10)}.csv`,
      status: "COMPLETED",
      progress: 100,
      totalRows: employees.length,
      successRows: employees.length,
      failedRows: 0,
    });
    toast.success("Export job started. Track progress in Import / Export History.");
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
