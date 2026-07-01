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
import { useBulkAttendanceMutation } from "../api/attendanceApi";
import { AttendanceStatus } from "../types/attendance.types";

interface RegisterRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  checkInTime: string;
  checkOutTime: string;
  status: AttendanceStatus;
  remarks: string;
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

  const [bulkAttendance, { isLoading: saving }] = useBulkAttendanceMutation();

  const employees = useMemo(
    () => employeesData?.content ?? [],
    [employeesData]
  );

  useEffect(() => {
    if (!employees.length) {
      setRows([]);
      return;
    }

    setRows(
      employees.map((employee) => ({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: employee.name,
        department: employee.department,
        checkInTime: "",
        checkOutTime: "",
        status: "PRESENT",
        remarks: "",
      }))
    );
  }, [employees]);

  function updateRow(
    employeeId: string,
    field: keyof RegisterRow,
    value: string
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.employeeId !== employeeId) return row;

        const nextRow = {
          ...row,
          [field]: value,
        };

        if (
          field === "status" &&
          isTimeDisabled(value as AttendanceStatus)
        ) {
          nextRow.checkInTime = "";
          nextRow.checkOutTime = "";
        }

        return nextRow;
      })
    );
  }

  async function handleSave() {
    try {
      await bulkAttendance({
        attendanceDate: date,
        records: rows.map((row) => ({
          employeeId: row.employeeId,
          checkInTime: combineDateAndTime(date, row.checkInTime),
          checkOutTime: combineDateAndTime(date, row.checkOutTime),
          status: row.status,
          remarks: row.remarks || undefined,
        })),
      }).unwrap();

      toast.success("Daily attendance saved successfully");
    } catch {
      toast.error("Failed to save daily attendance");
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col justify-between gap-4 border-b p-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-sm font-semibold">Daily Attendance Register</h2>
          <p className="text-sm text-muted-foreground">
            Mark attendance for all active employees in one place.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full sm:w-[180px]"
          />

          <Button onClick={handleSave} disabled={saving || rows.length === 0}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Register
          </Button>
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
            </TableRow>
          </TableHeader>

          <TableBody>
            {employeesLoading &&
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <div className="h-8 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                </TableRow>
              ))}

            {!employeesLoading && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No active employees found.
                </TableCell>
              </TableRow>
            )}

            {!employeesLoading &&
              rows.map((row) => {
                const timeDisabled = isTimeDisabled(row.status);

                return (
                  <TableRow key={row.employeeId}>
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
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}