"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/apiError";
import { useCorrectAttendanceMutation } from "../api/attendanceApi";
import {
  correctAttendanceSchema,
  type CorrectAttendanceFormValues,
} from "../schemas/attendance.schema";
import type { AttendanceRecord } from "../types/attendance.types";

export function CorrectAttendanceDialog({
  record,
  open,
  onOpenChange,
}: {
  record: AttendanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [correctAttendance, correctionState] =
    useCorrectAttendanceMutation();
  const form = useForm<CorrectAttendanceFormValues>({
    resolver: zodResolver(correctAttendanceSchema),
    defaultValues: {
      checkInTime: "",
      checkOutTime: "",
      reason: "",
    },
  });

  useEffect(() => {
    form.reset({
      checkInTime: toDateTimeLocal(record?.checkInTime),
      checkOutTime: toDateTimeLocal(record?.checkOutTime),
      reason: "",
    });
  }, [form, record]);

  async function onSubmit(values: CorrectAttendanceFormValues) {
    if (!record) return;

    try {
      await correctAttendance({
        employeeId: record.employeeId,
        attendanceDate: record.date,
        checkInTime: values.checkInTime || null,
        checkOutTime: values.checkOutTime || null,
        reason: values.reason.trim(),
      }).unwrap();
      toast.success("Attendance corrected");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to correct attendance"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct attendance</DialogTitle>
          <DialogDescription>
            Update punches for {record?.employeeName ?? "this employee"} on{" "}
            {record?.date}. This owner-only action is audited.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <label htmlFor="attendance-check-in" className="text-sm font-medium">
              Check in
            </label>
            <Input
              id="attendance-check-in"
              type="datetime-local"
              {...form.register("checkInTime")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="attendance-check-out" className="text-sm font-medium">
              Check out
            </label>
            <Input
              id="attendance-check-out"
              type="datetime-local"
              {...form.register("checkOutTime")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="attendance-reason" className="text-sm font-medium">
              Reason *
            </label>
            <Textarea
              id="attendance-reason"
              rows={3}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={correctionState.isLoading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={correctionState.isLoading}>
              {correctionState.isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save correction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  return value.slice(0, 16);
}
