"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useGetEmployeesQuery } from "@/features/employees/api/employeeApi";
import { useMarkAttendanceMutation } from "../api/attendanceApi";
import {
  MarkAttendanceFormValues,
  markAttendanceSchema,
} from "../schemas/attendance.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultValues: MarkAttendanceFormValues = {
  employeeId: "",
  date: new Date().toISOString().slice(0, 10),
  checkInTime: "",
  checkOutTime: "",
  status: "PRESENT",
  remarks: "",
};

export function MarkAttendanceDialog({ open, onOpenChange }: Props) {
  const [markAttendance, { isLoading }] = useMarkAttendanceMutation();

  const { data: employeesData, isLoading: employeesLoading } =
    useGetEmployeesQuery({
      page: 0,
      size: 100,
      status: "ACTIVE",
      sortBy: "name",
      sortDirection: "asc",
    });

  const employees = employeesData?.content ?? [];

  const form = useForm<MarkAttendanceFormValues>({
    resolver: zodResolver(markAttendanceSchema),
    defaultValues,
  });

  async function onSubmit(values: MarkAttendanceFormValues) {
    try {
      await markAttendance({
        employeeId: values.employeeId,
        attendanceDate: values.date,
        checkInTime: combineDateAndTime(values.date, values.checkInTime),
        checkOutTime: combineDateAndTime(values.date, values.checkOutTime),
        status: values.status,
        remarks: values.remarks || undefined,
      }).unwrap();

      toast.success("Attendance marked successfully");
      form.reset(defaultValues);
      onOpenChange(false);
    } catch {
      toast.error("Failed to mark attendance");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset(defaultValues);
    }

    onOpenChange(nextOpen);
  }

  const errors = form.formState.errors;

  function combineDateAndTime(date: string, time?: string) {
    if (!date || !time) return undefined;
    return `${date}T${time}:00`;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Employee *</label>

            <Select
              value={form.watch("employeeId")}
              onValueChange={(value) =>
                form.setValue("employeeId", value, { shouldValidate: true })
              }
              disabled={employeesLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    employeesLoading ? "Loading employees..." : "Select employee"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} · {employee.employeeCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.employeeId && (
              <p className="text-xs text-destructive">
                {errors.employeeId.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date *</label>
              <Input type="date" {...form.register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">
                  {errors.date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status *</label>

              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue(
                    "status",
                    value as MarkAttendanceFormValues["status"],
                    { shouldValidate: true }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="PAID_LEAVE">Paid Leave</SelectItem>
                  <SelectItem value="UNPAID_LEAVE">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Check In</label>
              <Input type="time" {...form.register("checkInTime")} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Check Out</label>
              <Input type="time" {...form.register("checkOutTime")} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Remarks</label>
            <Input
              placeholder="Optional note"
              {...form.register("remarks")}
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Attendance
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}