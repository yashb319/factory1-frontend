"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttendanceRecord } from "../types/attendance.types";
import { CorrectAttendanceDialog } from "./CorrectAttendanceDialog";
import { useRuntimePermissions } from "@/features/partner-saas/runtime/permissions";

interface Props {
  records: AttendanceRecord[];
  loading: boolean;
  canCorrect?: boolean;
}

export function AttendanceTable({ records, loading, canCorrect = false }: Props) {
  const { can } = useRuntimePermissions();
  const [correctionRecord, setCorrectionRecord] =
    useState<AttendanceRecord | null>(null);
  const columnCount = canCorrect ? 8 : 7;

  return (
    <>
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
                {canCorrect ? (
                  <TableHead className="text-right">Actions</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={columnCount}>
                      <div className="h-8 animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))}

              {!loading && records.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
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
                          {record.employeeName ||
                            record.employeeCode ||
                            "Employee name unavailable"}
                        </p>
                        {record.employeeCode && (
                          <p className="text-xs text-muted-foreground">
                            {record.employeeCode}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell data-label="Date">{record.date}</TableCell>
                    <TableCell data-label="Check In">
                      {record.checkInTime || "-"}
                    </TableCell>
                    <TableCell data-label="Check Out">
                      {record.checkOutTime || "-"}
                    </TableCell>
                    <TableCell data-label="Total Hours">
                      {record.totalHours ?? "-"}
                    </TableCell>

                    <TableCell data-label="Status">
                      <Badge variant="outline">{record.status}</Badge>
                    </TableCell>

                    <TableCell data-label="Source">
                      {record.source || "-"}
                    </TableCell>
                    {canCorrect ? (
                      <TableCell data-label="Actions" className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!can("PUT", `/api/attendance/${record.employeeId}/${record.date}/correction`)}
                          onClick={() => setCorrectionRecord(record)}
                        >
                          Correct
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {canCorrect ? (
        <CorrectAttendanceDialog
          record={correctionRecord}
          open={correctionRecord !== null}
          onOpenChange={(open) => {
            if (!open) setCorrectionRecord(null);
          }}
        />
      ) : null}
    </>
  );
}