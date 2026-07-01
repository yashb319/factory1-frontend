// src/features/attendance/schemas/attendance.schema.ts

import { z } from "zod";

export const markAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),

  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),

  status: z.enum([
    "PRESENT",
    "ABSENT",
    "HALF_DAY",
    "LATE",
    "PAID_LEAVE",
    "UNPAID_LEAVE",
  ]),

  remarks: z.string().optional(),
});

export type MarkAttendanceFormValues = z.infer<typeof markAttendanceSchema>;