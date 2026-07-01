"use client";

import { DataJob } from "../types/importExport.types";
import { ImportExportTable } from "./ImportExportTable";

const mockJobs: DataJob[] = [
  {
    id: "1",
    operation: "IMPORT",
    module: "EMPLOYEE",
    fileName: "employees-june.xlsx",
    status: "COMPLETED",
    progress: 100,
    totalRows: 120,
    successRows: 118,
    failedRows: 2,
    createdBy: "Yash",
    createdAt: "2026-06-28 10:15 AM",
    completedAt: "2026-06-28 10:17 AM",
    errorFileUrl: "#",
  },
  {
    id: "2",
    operation: "EXPORT",
    module: "PAYROLL",
    fileName: "payroll-june.csv",
    status: "RUNNING",
    progress: 65,
    totalRows: 500,
    successRows: 325,
    failedRows: 0,
    createdBy: "Yash",
    createdAt: "2026-06-28 10:30 AM",
  },
  {
    id: "3",
    operation: "IMPORT",
    module: "INVENTORY",
    fileName: "stock-master.xlsx",
    status: "FAILED",
    progress: 40,
    totalRows: 300,
    successRows: 0,
    failedRows: 300,
    createdBy: "Admin",
    createdAt: "2026-06-27 06:00 PM",
    errorFileUrl: "#",
  },
];

export function ImportExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import / Export History
        </h1>
        <p className="text-sm text-muted-foreground">
          Track file imports, exports, progress, success rows and error reports
          across Factory1 modules.
        </p>
      </div>

      <ImportExportTable jobs={mockJobs} />
    </div>
  );
}