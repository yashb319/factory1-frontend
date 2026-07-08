"use client";

import * as React from "react";
import { Camera, Loader2, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EmployeeFormValues } from "../schemas/employee.schema";

interface Props {
  form: UseFormReturn<EmployeeFormValues>;
  mode: "create" | "edit";
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: EmployeeFormValues) => void;
}

export function EmployeeForm({
  form,
  mode,
  loading = false,
  onCancel,
  onSubmit,
}: Props) {
  const errors = form.formState.errors;
  const photoDataUrl = form.watch("photoDataUrl");

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      form.setValue("photoDataUrl", String(reader.result || ""), {
        shouldDirty: true,
        shouldValidate: true,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6 pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Employee Code *</label>
          <Input placeholder="EMP001" {...form.register("employeeCode")} />
          {errors.employeeCode && (
            <p className="text-xs text-destructive">
              {errors.employeeCode.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Name *</label>
          <Input placeholder="Rahul Kumar" {...form.register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <Input placeholder="9876543210" {...form.register("phone")} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input placeholder="employee@example.com" {...form.register("email")} />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-slate-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Employee"
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera className="h-8 w-8 text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <label className="text-sm font-medium">Attendance Photo</label>
            <Input accept="image/*" type="file" onChange={handlePhotoChange} />
            <p className="text-xs text-slate-500">
              Used by the Factory1 capture station for prototype photo matching.
            </p>
          </div>

          {photoDataUrl ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                form.setValue("photoDataUrl", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Employee Type *</label>
          <Select
            value={form.watch("employeeType")}
            onValueChange={(value) =>
              form.setValue(
                "employeeType",
                value as EmployeeFormValues["employeeType"],
                { shouldValidate: true }
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BLUE_COLLAR">Blue Collar</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
              <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status *</label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) =>
              form.setValue("status", value as EmployeeFormValues["status"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Department</label>
          <Input placeholder="Production" {...form.register("department")} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Designation</label>
          <Input placeholder="Machine Operator" {...form.register("designation")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Salary Rate *</label>
          <Input
            type="number"
            placeholder="700"
            {...form.register("salaryRate", {
              valueAsNumber: true,
            })}
          />
          {errors.salaryRate && (
            <p className="text-xs text-destructive">
              {errors.salaryRate.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Salary Type *</label>
          <Select
            value={form.watch("salaryType")}
            onValueChange={(value) =>
              form.setValue(
                "salaryType",
                value as EmployeeFormValues["salaryType"],
                { shouldValidate: true }
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOURLY">Hourly</SelectItem>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Joining Date</label>
        <Input type="date" {...form.register("joiningDate")} />
      </div>

      <div className="flex justify-end gap-2 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Add Employee" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
