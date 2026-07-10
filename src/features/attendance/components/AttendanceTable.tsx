"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttendanceRecord } from "../types/attendance.types";

interface Props {
  records: AttendanceRecord[];
  loading: boolean;
}

export function AttendanceTable({ records, loading }: Props) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table className="responsive-table">
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <div className="h-8 animate-pulse rounded-md bg-muted" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && records.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  No attendance records found.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell data-label="Employee">
                    <div>
                      <p className="font-medium">
                        {record.employeeName || record.employeeCode || record.employeeId}
                      </p>
                      {record.employeeCode && (
                        <p className="text-xs text-muted-foreground">
                          {record.employeeCode}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell data-label="Date">{record.date}</TableCell>
                  <TableCell data-label="Check In">{record.checkInTime || "-"}</TableCell>
                  <TableCell data-label="Check Out">{record.checkOutTime || "-"}</TableCell>
                  <TableCell data-label="Total Hours">{record.totalHours ?? "-"}</TableCell>

                  <TableCell data-label="Status">
                    <Badge variant="outline">{record.status}</Badge>
                  </TableCell>

                  <TableCell data-label="Source">{record.source || "-"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}