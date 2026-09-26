"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
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
import { createDefaultStatutoryProfile } from "../utils/employeeStatutory";
import { EmployeeStatutoryFields } from "./EmployeeStatutoryFields";

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
  const dateOfBirth = form.watch("dateOfBirth");
  const joiningDate = form.watch("joiningDate");
  const statutoryProfile =
    form.watch("statutoryProfile") ?? createDefaultStatutoryProfile();
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const photoReaderRef = React.useRef<FileReader | null>(null);
  const [photoFileName, setPhotoFileName] = React.useState("");

  React.useEffect(
    () => () => {
      photoReaderRef.current?.abort();
    },
    []
  );

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      event.target.value = "";
      setPhotoFileName("");
      form.setError("photoDataUrl", {
        message: "Choose a JPEG, PNG or WebP image",
      });
      return;
    }
    form.clearErrors("photoDataUrl");
    setPhotoFileName(file.name);

    photoReaderRef.current?.abort();
    const reader = new FileReader();
    photoReaderRef.current = reader;
    reader.onload = () => {
      if (photoReaderRef.current !== reader) return;
      photoReaderRef.current = null;
      form.setValue("photoDataUrl", String(reader.result || ""), {
        shouldDirty: true,
        shouldValidate: true,
      });
    };
    reader.onerror = () => {
      if (photoReaderRef.current !== reader) return;
      photoReaderRef.current = null;
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
      setPhotoFileName("");
      form.setError("photoDataUrl", {
        message: "The selected photo could not be read",
      });
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    photoReaderRef.current?.abort();
    photoReaderRef.current = null;
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
    setPhotoFileName("");
    form.clearErrors("photoDataUrl");
    form.setValue("photoDataUrl", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const mobileRegistration = form.register("mobile");

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "create" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Employee Code</label>
            <output
              aria-live="polite"
              className="flex h-8 items-center rounded-md border bg-muted px-2.5 text-sm font-medium"
            >
              {form.watch("code") || "Generating code…"}
            </output>
            <p className="text-xs text-muted-foreground">
              Assigned automatically by Factory1.
            </p>
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
              <Image
                src={photoDataUrl}
                alt="Employee"
                width={96}
                height={96}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-center text-xs text-muted-foreground">
                No photo selected
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <label className="text-sm font-medium">Attendance Photo</label>
            <input
              ref={photoInputRef}
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              type="file"
              onChange={handlePhotoChange}
            />
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => photoInputRef.current?.click()}
              >
                Choose Photo
              </Button>
              {photoDataUrl && photoFileName ? (
                <span className="truncate text-sm text-muted-foreground">
                  {photoFileName}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">
              Used by the Factory1 capture station for prototype photo matching.
            </p>
            {errors.photoDataUrl && (
              <p className="text-xs text-destructive">
                {errors.photoDataUrl.message}
              </p>
            )}
          </div>

          {photoDataUrl ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Remove selected photo"
              onClick={removePhoto}
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
            min={0}
            step="0.01"
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
        <Input
          type="date"
          min={dateOfBirth || undefined}
          aria-invalid={Boolean(errors.joiningDate)}
          {...form.register("joiningDate")}
        />
        {errors.joiningDate && (
          <p className="text-xs text-destructive">{errors.joiningDate.message}</p>
        )}
      </div>

      <div className="space-y-4 border-t pt-5">
        <h3 className="text-sm font-semibold">Personal Details</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Birth</label>
            <Input
              type="date"
              max={joiningDate || undefined}
              aria-invalid={Boolean(errors.dateOfBirth)}
              {...form.register("dateOfBirth")}
            />
            {errors.dateOfBirth && (
              <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
            )}
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
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              pattern="[0-9]{10}"
              placeholder="9876543210"
              aria-invalid={Boolean(errors.mobile)}
              {...mobileRegistration}
              onChange={(event) => {
                event.currentTarget.value = event.currentTarget.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
                void mobileRegistration.onChange(event);
              }}
            />
            {errors.mobile && (
              <p className="text-xs text-destructive">{errors.mobile.message}</p>
            )}
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

        <section className="space-y-4 border-t pt-5">
          <div>
            <h3 className="text-sm font-semibold">Statutory Details</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These details will be saved with the employee.
            </p>
          </div>
          <EmployeeStatutoryFields
            value={statutoryProfile}
            onChange={(field, value) =>
              form.setValue("statutoryProfile", {
                ...statutoryProfile,
                [field]: value,
              }, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </section>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
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
