// src/features/attendance/components/DailyAttendanceRegister.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useGetEmployeesQuery } from "@/features/employees/api/employeeApi";
import {
  useBulkAttendanceMutation,
  useGetAttendanceQuery,
} from "../api/attendanceApi";
import { AttendanceRecord, AttendanceStatus } from "../types/attendance.types";

interface RegisterRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;

  attendanceId?: string;

  checkInTime: string;
  checkOutTime: string;

  status: AttendanceStatus;
  remarks: string;

  hasAttendance: boolean;
  isModified: boolean;
}

const STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LATE",
  "PAID_LEAVE",
  "UNPAID_LEAVE",
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function combineDateAndTime(date: string, time?: string) {
  if (!date || !time) return undefined;
  return `${date}T${time}:00`;
}

function extractTime(value?: string) {
  if (!value) return "";
  return value.slice(11, 16);
}

function isTimeDisabled(status: AttendanceStatus) {
  return (
    status === "ABSENT" ||
    status === "PAID_LEAVE" ||
    status === "UNPAID_LEAVE"
  );
}

export function DailyAttendanceRegister() {
  const [date, setDate] = useState(getToday());
  const [rows, setRows] = useState<RegisterRow[]>([]);

  const { data: employeesData, isLoading: employeesLoading } =
    useGetEmployeesQuery({
      page: 0,
      size: 500,
      status: "ACTIVE",
      sortBy: "name",
      sortDirection: "asc",
    });

  const { data: attendanceData, isFetching: attendanceLoading } =
    useGetAttendanceQuery({
      fromDate: date,
      toDate: date,
      page: 0,
      size: 1000,
      sortBy: "attendanceDate",
      sortDirection: "asc",
    });

  const [bulkAttendance, { isLoading: saving }] = useBulkAttendanceMutation();

  const employees = useMemo(
    () => employeesData?.content ?? [],
    [employeesData]
  );

  const attendanceRecords = useMemo(
    () => attendanceData?.content ?? [],
    [attendanceData]
  );

  useEffect(() => {
    if (!employees.length) {
      setRows([]);
      return;
    }

    const attendanceMap = new Map<string, AttendanceRecord>();

    attendanceRecords.forEach((attendance) => {
      attendanceMap.set(attendance.employeeId, attendance);
    });

    const mergedRows: RegisterRow[] = employees.map((employee) => {
      const attendance = attendanceMap.get(employee.id);

      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: employee.name,
        department: employee.department,

        attendanceId: attendance?.id,

        checkInTime: extractTime(attendance?.checkInTime),
        checkOutTime: extractTime(attendance?.checkOutTime),

        status: attendance?.status ?? "PRESENT",
        remarks: attendance?.remarks ?? "",

        hasAttendance: Boolean(attendance),
        isModified: false,
      };
    });

    setRows(mergedRows);
  }, [employees, attendanceRecords]);

  function updateRow(
    employeeId: string,
    field: keyof RegisterRow,
    value: string
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.employeeId !== employeeId) return row;

        const nextRow: RegisterRow = {
          ...row,
          [field]: value,
          isModified: true,
        };

        if (field === "status" && isTimeDisabled(value as AttendanceStatus)) {
          nextRow.checkInTime = "";
          nextRow.checkOutTime = "";
        }

        return nextRow;
      })
    );
  }

  async function handleSave() {
    try {
      const changedRows = rows.filter((row) => row.isModified);

      if (changedRows.length === 0) {
        toast.info("No attendance changes to save");
        return;
      }

      const result = await bulkAttendance({
        attendanceDate: date,
        records: changedRows.map((row) => ({
          employeeId: row.employeeId,
          checkInTime: combineDateAndTime(date, row.checkInTime),
          checkOutTime: combineDateAndTime(date, row.checkOutTime),
          status: row.status,
          remarks: row.remarks || undefined,
        })),
      }).unwrap();

      if (result.failedCount > 0) {
        toast.warning(
          `${result.successCount} saved, ${result.failedCount} failed`
        );
        return;
      }

      toast.success(`${result.successCount} attendance records saved`);
    } catch {
      toast.error("Failed to save daily attendance");
    }
  }

  const loading = employeesLoading || attendanceLoading;

  const totalEmployees = rows.length;
  const recordedCount = rows.filter((row) => row.hasAttendance).length;
  const pendingCount = totalEmployees - recordedCount;
  const modifiedCount = rows.filter((row) => row.isModified).length;

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col justify-between gap-4 border-b p-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-sm font-semibold">Daily Attendance Register</h2>
          <p className="text-sm text-muted-foreground">
            Mark, review and update attendance for all active employees.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full sm:w-[180px]"
          />

          <Button
            onClick={handleSave}
            disabled={saving || modifiedCount === 0}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes {modifiedCount > 0 ? `(${modifiedCount})` : ""}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Total Employees</p>
          <p className="text-xl font-semibold">{totalEmployees}</p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Recorded</p>
          <p className="text-xl font-semibold">{recordedCount}</p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-xl font-semibold">{pendingCount}</p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Modified</p>
          <p className="text-xl font-semibold">{modifiedCount}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="min-w-[140px]">Check In</TableHead>
              <TableHead className="min-w-[140px]">Check Out</TableHead>
              <TableHead className="min-w-[170px]">Status</TableHead>
              <TableHead className="min-w-[220px]">Remarks</TableHead>
              <TableHead>Record</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <div className="h-8 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  No active employees found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rows.map((row) => {
                const timeDisabled = isTimeDisabled(row.status);

                return (
                  <TableRow
                    key={row.employeeId}
                    className={row.isModified ? "bg-muted/50" : undefined}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.employeeCode}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>{row.department || "-"}</TableCell>

                    <TableCell>
                      <Input
                        type="time"
                        value={row.checkInTime}
                        disabled={timeDisabled}
                        onChange={(event) =>
                          updateRow(
                            row.employeeId,
                            "checkInTime",
                            event.target.value
                          )
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="time"
                        value={row.checkOutTime}
                        disabled={timeDisabled}
                        onChange={(event) =>
                          updateRow(
                            row.employeeId,
                            "checkOutTime",
                            event.target.value
                          )
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(value) =>
                          updateRow(row.employeeId, "status", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Input
                        placeholder="Optional note"
                        value={row.remarks}
                        onChange={(event) =>
                          updateRow(
                            row.employeeId,
                            "remarks",
                            event.target.value
                          )
                        }
                      />
                    </TableCell>

                    <TableCell>
                      {row.isModified
                        ? "Modified"
                        : row.hasAttendance
                          ? "Saved"
                          : "Pending"}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}