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
import { Combobox, ComboboxOption } from "@/components/ui/combobox";

import { EmployeeFormValues } from "../schemas/employee.schema";

interface Props {
  form: UseFormReturn<EmployeeFormValues>;
  mode: "create" | "edit";
  loading?: boolean;
  designationOptions?: string[];
  reportingToOptions?: ComboboxOption[];
  onCancel: () => void;
  onSubmit: (values: EmployeeFormValues) => void;
}

export function EmployeeForm({
  form,
  mode,
  loading = false,
  designationOptions = [],
  reportingToOptions = [],
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
        {mode === "create" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Employee Code</label>
            <Input
              placeholder="EMP0001"
              {...form.register("code", {
                setValueAs: (value) => value.trim().toUpperCase(),
              })}
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
          </div>
        )}
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
          <Combobox
            value={form.watch("designation") ?? ""}
            onChange={(next) =>
              form.setValue("designation", next, { shouldDirty: true })
            }
            options={designationOptions.map((designation) => ({
              value: designation,
              label: designation,
            }))}
            placeholder="Machine Operator"
            emptyText="No existing designations — type to add a new one"
            allowFreeText
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Employment Basis</label>
          <Select
            value={form.watch("employmentBasis") ?? ""}
            onValueChange={(value) =>
              form.setValue(
                "employmentBasis",
                value as EmployeeFormValues["employmentBasis"],
                { shouldValidate: true }
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select basis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_TIME">Full Time</SelectItem>
              <SelectItem value="PART_TIME">Part Time</SelectItem>
              <SelectItem value="CONTRACT">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <Input placeholder="Bangalore Plant" {...form.register("location")} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Reporting To</label>
        <Combobox
          value={form.watch("reportingToEmployeeId") ?? ""}
          onChange={(next) =>
            form.setValue("reportingToEmployeeId", next, {
              shouldDirty: true,
            })
          }
          options={reportingToOptions}
          placeholder="Search employee by name or code"
          emptyText="No employees available"
          allowFreeText={false}
        />
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

      <div className="space-y-4 border-t pt-5">
        <h3 className="text-sm font-semibold">Personal Details</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Birth</label>
            <Input type="date" {...form.register("dateOfBirth")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            <Select
              value={form.watch("gender") ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "gender",
                  value as EmployeeFormValues["gender"],
                  { shouldValidate: true }
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Marital Status</label>
          <Select
            value={form.watch("maritalStatus") ?? ""}
            onValueChange={(value) =>
              form.setValue(
                "maritalStatus",
                value as EmployeeFormValues["maritalStatus"],
                { shouldValidate: true }
              )
            }
          >
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SINGLE">Single</SelectItem>
              <SelectItem value="MARRIED">Married</SelectItem>
              <SelectItem value="DIVORCED">Divorced</SelectItem>
              <SelectItem value="WIDOWED">Widowed</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border-t pt-5">
        <h3 className="text-sm font-semibold">Contact &amp; Identity</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mobile</label>
            <Input placeholder="9876543210" {...form.register("mobile")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Aadhaar Number</label>
            <Input
              placeholder="XXXX XXXX XXXX"
              {...form.register("aadhaarNumber")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Address</label>
          <Input placeholder="Current address" {...form.register("address")} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Permanent Address</label>
          <Input
            placeholder="Permanent address"
            {...form.register("permanentAddress")}
          />
        </div>
      </div>

      <div className="space-y-4 border-t pt-5">
        <h3 className="text-sm font-semibold">Bank Details</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Account Number</label>
            <Input {...form.register("bankAccountNumber")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bank Name</label>
            <Input {...form.register("bankName")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Branch Name</label>
            <Input {...form.register("bankBranchName")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">IFSC Code</label>
            <Input placeholder="ABCD0123456" {...form.register("bankIfscCode")} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          PAN, UAN and Tax Regime are managed in Statutory Details below.
        </p>
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
