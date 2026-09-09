// src/features/attendance/types/attendance.types.ts

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "HALF_DAY"
  | "LATE"
  | "PAID_LEAVE"
  | "UNPAID_LEAVE";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: number;
  status: AttendanceStatus;
  source?: "MANUAL" | "DEVICE" | "BULK";
  remarks?: string;
}

export interface AttendanceListParams {
  employeeId?: string;
  status?: AttendanceStatus | "ALL";
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc" | "ASC" | "DESC";
}

export interface MarkAttendanceRequest {
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface BulkAttendanceRequest {
  attendanceDate: string;
  records: {
    employeeId: string;
    checkInTime?: string;
    checkOutTime?: string;
    status: AttendanceStatus;
    remarks?: string;
  }[];
}

export interface BulkAttendanceResponse {
  successCount: number;
  failedCount: number;
  errors: string[];
}

export interface DeviceAttendanceEventRequest {
  employeeCode: string;
  eventTime: string;
  eventType: "CHECK_IN" | "CHECK_OUT";
  deviceId?: string;
}

export interface AttendanceDashboardResponse {
  present: number;
  absent: number;
  halfDay: number;
  paidLeave: number;
  unpaidLeave: number;
  holiday: number;
}

export interface MonthlyAttendanceReport {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  month: number;
  year: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  lateDays: number;
  paidLeaves: number;
  unpaidLeaves: number;
  holidays: number;
  totalHours: number;
  overtimeHours: number;
  /** Legacy field retained for the Tally attendance view. */
  payableDays?: number;
}

export interface AttendanceLeaveStatus {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  paid: boolean;
  reason: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}