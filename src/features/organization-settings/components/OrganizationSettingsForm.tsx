"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  CreditCard,
  KeyRound,
  Keyboard,
  LayoutDashboard,
  RefreshCw,
  Send,
} from "lucide-react";
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
  useGetOrganizationPlanOffersQuery,
  useGetOrganizationPlanOptionsQuery,
  useRegenerateAttendanceCaptureKeyMutation,
  useRequestPlanChangeMutation,
  useUpdateOrganizationSettingsMutation,
} from "../api/organizationSettingsApi";
import type {
  OrganizationPlan,
  PlanOffer,
  PlanOption,
} from "../types/organizationSettings.types";
import { toast } from "sonner";
import { stateNameFromGstNumber } from "@/lib/gstState";
import { LocationSuggestionHint } from "@/components/forms/LocationSuggestionHint";
import {
  getBestLocationSuggestion,
  getLocationSuggestions,
  type LocationSuggestion,
} from "@/lib/locationSuggestions";
import {
  type FactoryUiMode,
  getFactoryUiMode,
  getNextFactoryUiModePromptDate,
  setFactoryUiMode,
  UI_MODE_CHANGED_EVENT,
} from "@/lib/uiModePreference";
import { useAppSelector } from "@/lib/hook";

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
  city: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().optional(),
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

const fallbackPlans: PlanOption[] = [
  {
    plan: "FREE",
    label: "Free",
    employeeLimit: 20,
    aiPromptLimit: 10,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 0,
    displayNote: "For a small factory trial",
    serviceOfferings: "All Factory1 modules, Email OTP signup, Standard reports",
  },
  {
    plan: "STARTER",
    label: "Starter",
    employeeLimit: 50,
    aiPromptLimit: 20,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 999,
    displayNote: "For growing daily operations",
    serviceOfferings: "All Factory1 modules, Import and export history, Role-based access",
  },
  {
    plan: "GROWTH",
    label: "Growth",
    employeeLimit: 100,
    aiPromptLimit: 50,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 2499,
    displayNote: "For multi-team factories",
    serviceOfferings: "All Factory1 modules, Advanced dashboard, AI across modules, Priority onboarding help",
  },
  {
    plan: "BUSINESS",
    label: "Business",
    employeeLimit: 250,
    aiPromptLimit: 100,
    aiPromptWindowMinutes: 5,
    aiUnlimited: false,
    defaultMonthlyPrice: 4999,
    displayNote: "For larger operating teams",
    serviceOfferings: "All Factory1 modules, Higher employee limits, Higher AI quota, Priority onboarding help",
  },
  {
    plan: "ENTERPRISE",
    label: "Enterprise",
    employeeLimit: null,
    aiPromptLimit: null,
    aiPromptWindowMinutes: 5,
    aiUnlimited: true,
    defaultMonthlyPrice: 0,
    displayNote: "Unlimited + dedicated support",
    serviceOfferings: "All Factory1 modules, Unlimited employees, Unlimited hosted AI prompts, Dedicated setup support, Plan-level controls",
  },
];

const planOrder: OrganizationPlan[] = ["FREE", "STARTER", "GROWTH", "BUSINESS", "ENTERPRISE"];

export function OrganizationSettingsForm() {
  const user = useAppSelector((state) => state.auth.user);
  const { data, isLoading } = useGetOrganizationSettingsQuery();
  const { data: plansResponse } = useGetOrganizationPlanOptionsQuery();
  const { data: offersResponse } = useGetOrganizationPlanOffersQuery();
  const [updateSettings, { isLoading: isSaving }] =
    useUpdateOrganizationSettingsMutation();
  const [regenerateCaptureKey, { isLoading: isGeneratingKey }] =
    useRegenerateAttendanceCaptureKeyMutation();
  const [requestPlanChange, { isLoading: isRequestingPlan }] =
    useRequestPlanChangeMutation();
  const [tab, setTab] = useState<"plan" | "profile" | "operations" | "interface">("plan");
  const [uiMode, setUiMode] = useState<FactoryUiMode>("modern");
  const [nextPromptDate, setNextPromptDate] = useState<Date | null>(null);

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
      city: "",
      pincode: "",
      country: "India",
      industryType: "",
      employeeCountEstimate: undefined,
      gstNumber: "",
      businessType: "MANUFACTURING",
      state: "",
    },
  });
  const gstNumber = form.watch("gstNumber");
  const city = form.watch("city");
  const location = form.watch("location");
  const locationSuggestions = getLocationSuggestions(city || location);

  useEffect(() => {
    setUiMode(getFactoryUiMode(user));
    setNextPromptDate(getNextFactoryUiModePromptDate(user));

    function handleModeChange() {
      setUiMode(getFactoryUiMode(user));
      setNextPromptDate(getNextFactoryUiModePromptDate(user));
    }

    window.addEventListener(UI_MODE_CHANGED_EVENT, handleModeChange);

    return () =>
      window.removeEventListener(UI_MODE_CHANGED_EVENT, handleModeChange);
  }, [user]);

  const applyLocationSuggestion = (suggestion: LocationSuggestion) => {
    form.setValue("city", suggestion.city, { shouldDirty: true });
    form.setValue("state", suggestion.state, { shouldDirty: true });
    form.setValue("pincode", suggestion.pincode, { shouldDirty: true });
    form.setValue("country", suggestion.country, { shouldDirty: true });
  };

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
      city: data.data.city ?? "",
      pincode: data.data.pincode ?? "",
      country: data.data.country ?? "India",
      industryType: data.data.industryType ?? "",
      employeeCountEstimate: data.data.employeeCountEstimate ?? undefined,
      gstNumber: data.data.gstNumber ?? "",
      businessType: data.data.businessType ?? "MANUFACTURING",
      state: data.data.state ?? "",
    });
  }, [data, form]);

  useEffect(() => {
    const state = stateNameFromGstNumber(gstNumber);
    if (state && !form.getValues("state")) {
      form.setValue("state", state, { shouldDirty: true });
    }
  }, [form, gstNumber]);

  useEffect(() => {
    const suggestion = getBestLocationSuggestion(city || location);
    if (!suggestion) {
      return;
    }

    if (!form.getValues("city")) {
      form.setValue("city", suggestion.city, { shouldDirty: true });
    }
    if (!form.getValues("state")) {
      form.setValue("state", suggestion.state, { shouldDirty: true });
    }
    if (!form.getValues("pincode")) {
      form.setValue("pincode", suggestion.pincode, { shouldDirty: true });
    }
    if (!form.getValues("country")) {
      form.setValue("country", suggestion.country, { shouldDirty: true });
    }
  }, [city, form, location]);

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
        city: values.city,
        pincode: values.pincode,
        country: values.country || "India",
        industryType: values.industryType,
        employeeCountEstimate: values.employeeCountEstimate,
        gstNumber: values.gstNumber?.trim().toUpperCase(),
        businessType: values.businessType,
        state: values.state || stateNameFromGstNumber(values.gstNumber),
      }).unwrap();
      toast.success("Organization settings updated successfully");
    } catch {
      toast.error("Failed to update organization settings");
    }
  }

  async function handleGenerateCaptureKey() {
    try {
      await regenerateCaptureKey().unwrap();
      toast.success("Attendance capture key generated");
    } catch {
      toast.error("Could not generate capture key");
    }
  }

  async function handleCopyCaptureKey() {
    const key = data?.data.attendanceCaptureKey;
    if (!key) return;

    await navigator.clipboard.writeText(key);
    toast.success("Capture key copied");
  }

  async function handleRequestPlanChange(plan: PlanOption) {
    try {
      await requestPlanChange({
        requestedPlan: plan.plan,
        note: `Requested from organization settings. Current plan: ${data?.data.plan ?? "UNKNOWN"}`,
      }).unwrap();
      toast.success("Plan change request sent. Factory1 team will contact you for payment.");
    } catch {
      toast.error("Could not send plan change request");
    }
  }

  function updateUiMode(mode: FactoryUiMode) {
    setFactoryUiMode(mode, user);
    setUiMode(mode);
    setNextPromptDate(getNextFactoryUiModePromptDate(user));
    toast.success(
      mode === "tally"
        ? "Tally-like workspace enabled"
        : "New Factory1 workspace enabled"
    );
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading settings...</p>;
  }

  const settings = data?.data;
  const plans = mergePlans(plansResponse?.data);
  const offers = offersResponse?.data ?? [];
  const currentPlan =
    plans.find((plan) => plan.plan === settings?.plan) ??
    plans.find((plan) => plan.plan === "FREE") ??
    fallbackPlans[0];

  const tabs = [
    { id: "plan" as const, label: "Plan & Billing" },
    { id: "profile" as const, label: "Profile" },
    { id: "operations" as const, label: "Operations" },
    { id: "interface" as const, label: "Interface" },
  ];

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === item.id
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <AppForm form={form} onSubmit={onSubmit}>
        {tab === "plan" && (
          <div>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <CreditCard className="h-4 w-4" />
                  Plan & Billing
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your current plan is active until Factory1 confirms any requested change.
                </p>
              </div>
              <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-500">Current plan: </span>
                <span className="font-semibold text-slate-950">{currentPlan.label}</span>
                {settings?.subscriptionEndDate ? (
                  <span className="ml-2 text-slate-500">
                    · renews {settings.subscriptionEndDate}
                  </span>
                ) : (
                  <span className="ml-2 text-slate-500">· no end date set</span>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {plans.map((plan) => {
                const isCurrent = plan.plan === settings?.plan;
                const offer = bestDiscountOffer(offers);

                return (
                  <div
                    key={plan.plan}
                    className={`rounded-lg border p-4 ${
                      isCurrent ? "border-blue-200 bg-blue-50" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{plan.label}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">
                          <PlanPrice plan={plan} offer={offer} />
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>{formatEmployeeLimit(plan.employeeLimit)}</p>
                      <p>{formatAiLimit(plan)}</p>
                      <p>{plan.displayNote}</p>
                    </div>

                    <button
                      type="button"
                      className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isCurrent || isRequestingPlan}
                      onClick={() => handleRequestPlanChange(plan)}
                    >
                      <Send className="h-4 w-4" />
                      {isCurrent ? "Current Plan" : "Request Change"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Factory Profile
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              These details power onboarding, GST context, dashboard setup and AI answers.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
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

              <div>
                <TextField<FormValues>
                  name="city"
                  label="City"
                  placeholder="Bengaluru"
                />
                <LocationSuggestionHint
                  suggestions={locationSuggestions}
                  onApply={applyLocationSuggestion}
                />
              </div>

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

              <TextField<FormValues>
                name="pincode"
                label="Pincode"
                placeholder="560001"
              />

              <TextField<FormValues>
                name="country"
                label="Country"
                placeholder="India"
              />
            </div>
          </div>
        )}

        {tab === "operations" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Operations Settings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Payroll and reporting defaults for this organization.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            </div>

            <div className="border-t pt-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <KeyRound className="h-4 w-4" />
                    Attendance Capture Key
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Put this key in the Factory1 capture app. Rotate it if a phone or kiosk is lost.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                    onClick={handleCopyCaptureKey}
                    disabled={!data?.data.attendanceCaptureKey}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    onClick={handleGenerateCaptureKey}
                    disabled={isGeneratingKey}
                  >
                    <RefreshCw className={`h-4 w-4 ${isGeneratingKey ? "animate-spin" : ""}`} />
                    {data?.data.attendanceCaptureKey ? "Regenerate" : "Generate"}
                  </button>
                </div>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 font-mono text-xs text-slate-700">
                {data?.data.attendanceCaptureKey || "No key generated yet"}
              </div>
            </div>
          </div>
        )}

        {tab === "interface" && (
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Workspace Interface
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose the layout that feels natural for your operators. Factory1 will ask again once a week.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => updateUiMode("modern")}
                className={`rounded-lg border p-4 text-left transition ${
                  uiMode === "modern"
                    ? "border-blue-200 bg-blue-50"
                    : "bg-white hover:border-blue-200 hover:bg-blue-50/60"
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-base font-semibold text-slate-950">
                  New UI
                </span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  Left navigation, modern dashboards, guided screens and visual workflows for new users.
                </span>
                {uiMode === "modern" ? (
                  <span className="mt-4 inline-flex rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                    Active
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => updateUiMode("tally")}
                className={`rounded-lg border p-4 text-left transition ${
                  uiMode === "tally"
                    ? "border-emerald-300 bg-emerald-50"
                    : "bg-white hover:border-emerald-300 hover:bg-emerald-50/60"
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Keyboard className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-base font-semibold text-slate-950">
                  Tally-like UI
                </span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  Gateway home screen, function-key shortcuts and keyboard-first voucher entry for Tally users.
                </span>
                {uiMode === "tally" ? (
                  <span className="mt-4 inline-flex rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                    Active
                  </span>
                ) : null}
              </button>
            </div>

            <div className="mt-4 rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
              Weekly chooser:{" "}
              <span className="font-medium text-slate-950">
                {nextPromptDate
                  ? `next shown around ${nextPromptDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}`
                  : "will appear on next login"}
              </span>
            </div>
          </div>
        )}

        <FormActions
          submitLabel="Save Settings"
          loading={isSaving}
        />
      </AppForm>
    </div>
  );
}

function mergePlans(remotePlans?: PlanOption[]) {
  const planMap = new Map<OrganizationPlan, PlanOption>();

  fallbackPlans.forEach((plan) => planMap.set(plan.plan, plan));
  remotePlans?.forEach((plan) => planMap.set(plan.plan, plan));

  return planOrder
    .map((plan) => planMap.get(plan))
    .filter(Boolean) as PlanOption[];
}

function formatPlanPrice(plan: PlanOption) {
  const price = Number(plan.defaultMonthlyPrice ?? 0);

  if (plan.plan === "ENTERPRISE" && price <= 0) {
    return "Custom";
  }

  if (price <= 0) {
    return "₹0";
  }

  return `₹${price.toLocaleString("en-IN")}/mo`;
}

function PlanPrice({
  plan,
  offer,
}: {
  plan: PlanOption;
  offer?: PlanOffer;
}) {
  const price = Number(plan.defaultMonthlyPrice ?? 0);
  const discount = Number(offer?.discountPercent ?? 0);

  if (plan.plan === "ENTERPRISE" && price <= 0) {
    return <span>Custom</span>;
  }

  if (price <= 0 || discount <= 0) {
    return <span>{formatPlanPrice(plan)}</span>;
  }

  const discountedPrice = Math.max(0, Math.round(price * (1 - discount / 100)));
  const code = offer?.code?.trim();
  const validUntil = offer?.validUntil?.trim();
  const tooltip = [
    offer?.title?.trim(),
    code ? `Code: ${code}` : undefined,
    validUntil ? `Valid till: ${validUntil}` : undefined,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <span className="inline-flex flex-wrap items-baseline gap-2" title={tooltip}>
      <span className="text-sm text-slate-400 line-through">
        {formatCurrency(price)}
      </span>
      <span>{formatCurrency(discountedPrice)}/mo</span>
    </span>
  );
}

function bestDiscountOffer(offers: PlanOffer[]) {
  return offers
    .filter((offer) => Number(offer.discountPercent ?? 0) > 0)
    .sort(
      (first, second) =>
        Number(second.discountPercent ?? 0) - Number(first.discountPercent ?? 0)
    )[0];
}

function formatCurrency(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatEmployeeLimit(limit: number | null) {
  return limit == null ? "Unlimited employees" : `Up to ${limit} employees`;
}

function formatAiLimit(plan: PlanOption) {
  if (plan.aiUnlimited) {
    return "Unlimited hosted AI prompts";
  }

  return `${plan.aiPromptLimit ?? 0} hosted AI prompts every ${
    plan.aiPromptWindowMinutes ?? 5
  } minutes`;
}
