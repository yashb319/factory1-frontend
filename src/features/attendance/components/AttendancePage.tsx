// src/features/attendance/components/AttendancePage.tsx

"use client";

import { useState } from "react";
import { Download, ExternalLink, KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useGetAttendanceQuery } from "../api/attendanceApi";
import { AttendanceListParams } from "../types/attendance.types";
import { AttendanceStatsCards } from "./AttendanceStatsCards";
import { AttendanceFilters } from "./AttendanceFilters";
import { AttendanceTable } from "./AttendanceTable";
import { MarkAttendanceDialog } from "./MarkAttendanceDialog";
import { DailyAttendanceRegister } from "./DailyAttendanceRegister";
import { exportAttendanceCsv } from "../utils/attendanceExport";
import { useLogDataJob } from "@/features/import-export/hooks/useLogDataJob";

export function AttendancePage() {
  const [markOpen, setMarkOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const [filters, setFilters] = useState<AttendanceListParams>({
    fromDate: today,
    toDate: today,
    page: 0,
    size: 10,
    status: "ALL",
    sortBy: "attendanceDate",
    sortDirection: "desc",
  });

  const { data, isLoading, isFetching } = useGetAttendanceQuery(filters);
  const logDataJob = useLogDataJob();

  function updateFilters(next: Partial<AttendanceListParams>) {
    setFilters((prev) => ({
      ...prev,
      ...next,
      page: next.page ?? 0,
    }));
  }

  function handleExport() {
    const records = data?.content ?? [];

    if (!records.length) {
      toast.info("No attendance records to export");
      return;
    }

    const exported = exportAttendanceCsv(records);

    void logDataJob({
      operation: "EXPORT",
      module: "ATTENDANCE",
      fileName: exported.fileName,
      status: "COMPLETED",
      progress: 100,
      totalRows: records.length,
      successRows: records.length,
      failedRows: 0,
      outputFileUrl: exported.outputFileUrl,
      notes: `Filters: ${filters.fromDate ?? "-"} to ${filters.toDate ?? "-"}`,
    });

    toast.success("Attendance CSV exported successfully");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Track daily attendance, manual entries, device events and monthly reports.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!data?.content?.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button onClick={() => setMarkOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Mark Attendance
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <p className="font-semibold">Want automatic QR/photo attendance?</p>
            <p className="mt-1 text-blue-800">
              Generate the Attendance Capture Key in Organization Settings, then open the capture station on your gate phone or kiosk.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => window.open("/organization-settings", "_self")}>
            Setup Key
          </Button>
          <Button
            onClick={() =>
              window.open(
                "https://factory1-frontend-attendance-captur.vercel.app/",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Capture
          </Button>
        </div>
      </div>

      <AttendanceStatsCards />

      <DailyAttendanceRegister />

      <AttendanceFilters filters={filters} onChange={updateFilters} />

      <AttendanceTable
        records={data?.content ?? []}
        loading={isLoading || isFetching}
      />

      <MarkAttendanceDialog open={markOpen} onOpenChange={setMarkOpen} />
    </div>
  );
}
