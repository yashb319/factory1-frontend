import type { AttendanceRecord } from "../types/attendance.types";
import { toCsv } from "@/features/import-export/utils/csv";
import {
  downloadCsv,
  saveLocalExportFile,
} from "@/features/import-export/utils/localExportFiles";

export function exportAttendanceCsv(records: AttendanceRecord[]) {
  const fileName = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    "Employee Code",
    "Employee Name",
    "Date",
    "Check In",
    "Check Out",
    "Total Hours",
    "Status",
    "Source",
    "Remarks",
  ];

  const rows = records.map((record) => [
    record.employeeCode ?? "",
    record.employeeName ?? "",
    record.date,
    record.checkInTime ?? "",
    record.checkOutTime ?? "",
    record.totalHours ?? "",
    record.status,
    record.source ?? "",
    record.remarks ?? "",
  ]);

  const csv = toCsv([headers, ...rows]);
  const saved = saveLocalExportFile({ fileName, content: csv });

  downloadCsv({ fileName, content: csv });

  return {
    fileName,
    outputFileUrl: saved.url,
  };
}
