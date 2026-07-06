"use client";

import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  AppForm,
  FormActions,
  NumberField,
  SelectField,
  TextField,
} from "@/components/forms";

import {
  useGetOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "../api/organizationSettingsApi";
import { toast } from "sonner";

const schema = z.object({
  workingHoursPerDay: z.number().min(1, "Required"),
  workingDaysPerMonth: z.number().min(1, "Required"),
  overtimeMultiplier: z.number().min(1, "Required"),
  currency: z.string().min(1, "Required"),
  timezone: z.string().min(1, "Required"),
  weekStartDay: z.string().min(1, "Required"),
  financialYearStartMonth: z.string().min(1, "Required"),
  organizationName: z.string().min(2, "Required"),
  location: z.string().optional(),
  industryType: z.string().optional(),
  employeeCountEstimate: z.number().optional(),
  gstNumber: z
    .string()
    .optional()
    .refine((value) => !value || /^[0-9A-Z]{15}$/.test(value.trim().toUpperCase()), {
      message: "GST number must be 15 characters",
    }),
  businessType: z.string().optional(),
  state: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function OrganizationSettingsForm() {
  const { data, isLoading } = useGetOrganizationSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] =
    useUpdateOrganizationSettingsMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      workingHoursPerDay: 8,
      workingDaysPerMonth: 26,
      overtimeMultiplier: 1.5,
      currency: "INR",
      timezone: "Asia/Kolkata",
      weekStartDay: "MONDAY",
      financialYearStartMonth: "4",
      organizationName: "",
      location: "",
      industryType: "",
      employeeCountEstimate: undefined,
      gstNumber: "",
      businessType: "MANUFACTURING",
      state: "",
    },
  });

  useEffect(() => {
    if (!data?.data) return;

    form.reset({
      workingHoursPerDay: Number(data.data.workingHoursPerDay),
      workingDaysPerMonth: Number(data.data.workingDaysPerMonth),
      overtimeMultiplier: Number(data.data.overtimeMultiplier),
      currency: data.data.currency ?? "INR",
      timezone: data.data.timezone ?? "Asia/Kolkata",
      weekStartDay: data.data.weekStartDay ?? "MONDAY",
      financialYearStartMonth: String(
        data.data.financialYearStartMonth ?? 4
      ),
      organizationName: data.data.organizationName ?? "",
      location: data.data.location ?? "",
      industryType: data.data.industryType ?? "",
      employeeCountEstimate: data.data.employeeCountEstimate ?? undefined,
      gstNumber: data.data.gstNumber ?? "",
      businessType: data.data.businessType ?? "MANUFACTURING",
      state: data.data.state ?? "",
    });
  }, [data, form]);

  async function onSubmit(values: FormValues) {
    try {
      await updateSettings({
        workingHoursPerDay: values.workingHoursPerDay,
        workingDaysPerMonth: values.workingDaysPerMonth,
        overtimeMultiplier: values.overtimeMultiplier,
        currency: values.currency,
        timezone: values.timezone,
        weekStartDay: values.weekStartDay,
        financialYearStartMonth: Number(values.financialYearStartMonth),
        organizationName: values.organizationName,
        location: values.location,
        industryType: values.industryType,
        employeeCountEstimate: values.employeeCountEstimate,
        gstNumber: values.gstNumber?.trim().toUpperCase(),
        businessType: values.businessType,
        state: values.state,
      }).unwrap();
      toast.success("Organization settings updated successfully");
    } catch {
      toast.error("Failed to update organization settings");
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading settings...</p>;
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <AppForm form={form} onSubmit={onSubmit}>
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Factory Profile
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            These details power onboarding, GST context, dashboard setup and AI answers.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <TextField<FormValues>
            name="organizationName"
            label="Factory Name"
            placeholder="ABC Manufacturing"
            required
          />

          <TextField<FormValues>
            name="location"
            label="Factory Location"
            placeholder="Peenya, Bengaluru"
          />

          <TextField<FormValues>
            name="industryType"
            label="Industry Type"
            placeholder="Textile, fabrication, food processing"
          />

          <NumberField<FormValues>
            name="employeeCountEstimate"
            label="Employee Estimate"
            min={1}
          />

          <TextField<FormValues>
            name="gstNumber"
            label="GST Number"
            placeholder="Optional"
          />

          <SelectField<FormValues>
            name="businessType"
            label="Business Type"
            options={[
              { label: "Manufacturing", value: "MANUFACTURING" },
              { label: "Trading", value: "TRADING" },
              { label: "Job work", value: "JOB_WORK" },
              { label: "Services", value: "SERVICES" },
            ]}
          />

          <TextField<FormValues>
            name="state"
            label="State"
            placeholder="Karnataka"
          />
        </div>

        <div className="mb-6 border-t pt-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Operations Settings
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Payroll and reporting defaults for this organization.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <NumberField<FormValues>
            name="workingHoursPerDay"
            label="Working Hours Per Day"
            required
          />

          <NumberField<FormValues>
            name="workingDaysPerMonth"
            label="Working Days Per Month"
            required
          />

          <NumberField<FormValues>
            name="overtimeMultiplier"
            label="Overtime Multiplier"
            required
          />

          <TextField<FormValues>
            name="currency"
            label="Currency"
            placeholder="INR"
            required
          />

          <TextField<FormValues>
            name="timezone"
            label="Timezone"
            placeholder="Asia/Kolkata"
            required
          />

          <SelectField<FormValues>
            name="weekStartDay"
            label="Week Start Day"
            required
            options={[
              { label: "Monday", value: "MONDAY" },
              { label: "Tuesday", value: "TUESDAY" },
              { label: "Wednesday", value: "WEDNESDAY" },
              { label: "Thursday", value: "THURSDAY" },
              { label: "Friday", value: "FRIDAY" },
              { label: "Saturday", value: "SATURDAY" },
              { label: "Sunday", value: "SUNDAY" },
            ]}
          />

          <SelectField<FormValues>
            name="financialYearStartMonth"
            label="Financial Year Start Month"
            required
            options={[
              { label: "January", value: "1" },
              { label: "February", value: "2" },
              { label: "March", value: "3" },
              { label: "April", value: "4" },
              { label: "May", value: "5" },
              { label: "June", value: "6" },
              { label: "July", value: "7" },
              { label: "August", value: "8" },
              { label: "September", value: "9" },
              { label: "October", value: "10" },
              { label: "November", value: "11" },
              { label: "December", value: "12" },
            ]}
          />
        </div>

        <FormActions
          submitLabel="Save Settings"
          loading={isSaving}
        />
      </AppForm>
    </div>
  );
}
