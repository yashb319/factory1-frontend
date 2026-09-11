"use client";

import { useEffect } from "react";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import {
  useCreateEmployeeStatutoryProfileMutation,
  useGetEmployeeStatutoryProfileQuery,
  useUpdateEmployeeStatutoryProfileMutation,
} from "../api/employeeApi";
import {
  EmployeeStatutoryProfileRequest,
  PfCalculationType,
  TaxRegime,
} from "../types/employee.types";

interface Props {
  employeeId: string;
}

const defaultValues: EmployeeStatutoryProfileRequest = {
  panNumber: "",
  uan: "",
  pfAccountNumber: "",
  pfEnabled: false,
  epsMember: false,
  pfCalculationType: "STATUTORY_CEILING",
  customPfWage: undefined,
  voluntaryPfEnabled: false,
  voluntaryPfPercent: undefined,
  taxRegime: "NEW",
  previousEmployerIncome: undefined,
  otherDeclaredIncome: undefined,
  housePropertyIncome: undefined,
  declaredDeductionsTotal: undefined,
};

function isNotFound(error: unknown) {
  return (error as FetchBaseQueryError | undefined)?.status === 404;
}

export function EmployeeStatutoryForm({ employeeId }: Props) {
  const profileQuery = useGetEmployeeStatutoryProfileQuery(employeeId);
  const [createProfile, createState] =
    useCreateEmployeeStatutoryProfileMutation();
  const [updateProfile, updateState] =
    useUpdateEmployeeStatutoryProfileMutation();
  const form = useForm<EmployeeStatutoryProfileRequest>({
    defaultValues,
  });
  const pfCalculationType = form.watch("pfCalculationType");
  const voluntaryPfEnabled = form.watch("voluntaryPfEnabled");
  const taxRegime = form.watch("taxRegime");
  const hasProfile = Boolean(profileQuery.data);
  const canEdit = !profileQuery.isLoading && (!profileQuery.isError || isNotFound(profileQuery.error));

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(profileQuery.data);
    } else if (profileQuery.isError && isNotFound(profileQuery.error)) {
      form.reset(defaultValues);
    }
  }, [form, profileQuery.data, profileQuery.error, profileQuery.isError]);

  async function onSubmit(values: EmployeeStatutoryProfileRequest) {
    const body: EmployeeStatutoryProfileRequest = {
      ...values,
      panNumber: values.panNumber?.trim() || undefined,
      uan: values.uan?.trim() || undefined,
      pfAccountNumber: values.pfAccountNumber?.trim() || undefined,
      customPfWage:
        values.pfCalculationType === "CUSTOM" ? values.customPfWage : undefined,
      voluntaryPfPercent: values.voluntaryPfEnabled
        ? values.voluntaryPfPercent
        : undefined,
      declaredDeductionsTotal:
        values.taxRegime === "OLD" ? values.declaredDeductionsTotal : undefined,
    };

    try {
      if (hasProfile) {
        await updateProfile({ employeeId, body }).unwrap();
      } else {
        await createProfile({ employeeId, body }).unwrap();
      }
      toast.success("Statutory details saved");
    } catch {
      toast.error("Could not save statutory details");
    }
  }

  if (profileQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading statutory details...</p>;
  }

  if (profileQuery.isError && !isNotFound(profileQuery.error)) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        Statutory details could not be loaded.
      </p>
    );
  }

  return (
    <section className="border-t pt-6">
      <div>
        <h2 className="text-sm font-semibold">Statutory details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          India PF and payroll TDS inputs used for future payroll runs.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="PAN number">
            <Input {...form.register("panNumber")} placeholder="ABCDE1234F" />
          </Field>
          <Field label="UAN">
            <Input {...form.register("uan")} placeholder="12-digit UAN" />
          </Field>
          <Field label="PF account number">
            <Input {...form.register("pfAccountNumber")} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField
            checked={Boolean(form.watch("pfEnabled"))}
            label="PF enabled for this employee"
            onChange={(checked) => form.setValue("pfEnabled", checked)}
          />
          <CheckboxField
            checked={Boolean(form.watch("epsMember"))}
            label="EPS member"
            onChange={(checked) => form.setValue("epsMember", checked)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="PF calculation type">
            <Select
              value={pfCalculationType}
              onValueChange={(value) =>
                form.setValue("pfCalculationType", value as PfCalculationType)
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STATUTORY_CEILING">Statutory ceiling</SelectItem>
                <SelectItem value="ACTUAL_WAGES">Actual wages</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {pfCalculationType === "CUSTOM" && (
            <Field label="Custom PF wage">
              <Input
                type="number"
                min={0}
                step="0.01"
                {...form.register("customPfWage", { valueAsNumber: true })}
              />
            </Field>
          )}
        </div>

        <div className="space-y-3">
          <CheckboxField
            checked={Boolean(voluntaryPfEnabled)}
            label="Enable voluntary PF"
            onChange={(checked) => form.setValue("voluntaryPfEnabled", checked)}
          />
          {voluntaryPfEnabled && (
            <Field label="Voluntary PF percentage (0-100)">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...form.register("voluntaryPfPercent", { valueAsNumber: true })}
              />
            </Field>
          )}
        </div>

        <Field label="Tax regime">
          <Select
            value={taxRegime}
            onValueChange={(value) => form.setValue("taxRegime", value as TaxRegime)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">New regime</SelectItem>
              <SelectItem value="OLD">Old regime</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput form={form} name="previousEmployerIncome" label="Previous employer income" />
          <NumberInput form={form} name="otherDeclaredIncome" label="Other declared income" />
          <NumberInput form={form} name="housePropertyIncome" label="House property income (loss allowed)" />
          <NumberInput
            form={form}
            name="declaredDeductionsTotal"
            label="Declared deductions total"
            disabled={taxRegime !== "OLD"}
          />
        </div>
        {taxRegime !== "OLD" && (
          <p className="text-xs text-muted-foreground">
            Declared deductions are ignored under the new tax regime.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canEdit || createState.isLoading || updateState.isLoading}>
            {createState.isLoading || updateState.isLoading ? "Saving..." : "Save statutory details"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function CheckboxField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span>{label}</span>
    </label>
  );
}

function NumberInput({
  form,
  name,
  label,
  disabled = false,
}: {
  form: ReturnType<typeof useForm<EmployeeStatutoryProfileRequest>>;
  name:
    | "previousEmployerIncome"
    | "otherDeclaredIncome"
    | "housePropertyIncome"
    | "declaredDeductionsTotal";
  label: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step="0.01"
        disabled={disabled}
        {...form.register(name, { valueAsNumber: true })}
      />
    </Field>
  );
}
