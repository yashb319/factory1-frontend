// src/features/attendance/components/AttendancePage.tsx

"use client";

import { useState } from "react";
import { CalendarCheck, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGetAttendanceQuery } from "../api/attendanceApi";
import { AttendanceListParams } from "../types/attendance.types";
import { AttendanceStatsCards } from "./AttendanceStatsCards";
import { AttendanceFilters } from "./AttendanceFilters";
import { AttendanceTable } from "./AttendanceTable";
import { MarkAttendanceDialog } from "./MarkAttendanceDialog";
import { AttendanceAiInsights } from "./AttendanceAiInsights";
import { DailyAttendanceRegister } from "./DailyAttendanceRegister";

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

  function updateFilters(next: Partial<AttendanceListParams>) {
    setFilters((prev) => ({
      ...prev,
      ...next,
      page: next.page ?? 0,
    }));
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

        <Button onClick={() => setMarkOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Mark Attendance
        </Button>
      </div>

      <AttendanceStatsCards />

      <AttendanceAiInsights />

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