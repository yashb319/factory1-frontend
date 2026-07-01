"use client";

import { Loader2 } from "lucide-react";
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
              <SelectItem value="WHITE_COLLAR">White Collar</SelectItem>
              <SelectItem value="CONTRACTOR">Contractor</SelectItem>
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