"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useAppSelector } from "@/lib/hook";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  useGetOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "@/features/organization-settings/api/organizationSettingsApi";
import type { OrganizationSettingsRequest } from "@/features/organization-settings/types/organizationSettings.types";
import {
  getFactoryUiMode,
  setFactoryUiMode,
  type FactoryUiMode,
} from "@/lib/uiModePreference";

type Part = { key: string; label: string; id: string };

const PARTS: Part[] = [
  { key: "O", label: "Company", id: "company" },
  { key: "F", label: "Financial Year", id: "financial" },
  { key: "P", label: "Payroll & Attendance", id: "payroll" },
  { key: "E", label: "Features", id: "features" },
  { key: "M", label: "Interface", id: "interface" },
  { key: "L", label: "Plan & Subscription", id: "plan" },
];

type FieldType = "text" | "number" | "date" | "checkbox";

type Field = {
  key: keyof OrganizationSettingsRequest;
  label: string;
  type: FieldType;
};

const FIELDS: Record<string, Field[]> = {
  company: [
    { key: "organizationName", label: "Organization Name", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "state", label: "State", type: "text" },
    { key: "pincode", label: "Pincode", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "gstNumber", label: "GST Number", type: "text" },
    { key: "businessType", label: "Business Type", type: "text" },
    { key: "industryType", label: "Industry Type", type: "text" },
    { key: "employeeCountEstimate", label: "Employee Count Estimate", type: "number" },
  ],
  financial: [
    { key: "financialYearStartMonth", label: "Financial Year Start Month", type: "number" },
    { key: "activeAccountingPeriodStart", label: "Active Period Start", type: "date" },
    { key: "activeAccountingPeriodEnd", label: "Active Period End", type: "date" },
    { key: "currency", label: "Currency", type: "text" },
    { key: "timezone", label: "Timezone", type: "text" },
    { key: "weekStartDay", label: "Week Start Day", type: "text" },
  ],
  payroll: [
    { key: "workingHoursPerDay", label: "Working Hours / Day", type: "number" },
    { key: "workingDaysPerMonth", label: "Working Days / Month", type: "number" },
    { key: "overtimeMultiplier", label: "Overtime Multiplier", type: "number" },
  ],
  features: [
    { key: "accountingMastersEnabled", label: "Accounting Masters", type: "checkbox" },
    { key: "accountingVouchersEnabled", label: "Accounting Vouchers", type: "checkbox" },
    { key: "accountingTaxationEnabled", label: "Accounting Taxation", type: "checkbox" },
    { key: "accountingReportsEnabled", label: "Accounting Reports", type: "checkbox" },
    { key: "tdsEnabled", label: "TDS", type: "checkbox" },
    { key: "tcsEnabled", label: "TCS", type: "checkbox" },
  ],
  plan: [],
  interface: [],
};

function stripSettings(
  data: import("@/features/organization-settings/types/organizationSettings.types").OrganizationSettingsResponse,
): OrganizationSettingsRequest {
  const {
    id: _id,
    organizationId: _orgId,
    organizationEmail: _email,
    phone: _phone,
    plan: _plan,
    planMonthlyPrice: _price,
    employeeLimit: _limit,
    aiExternalPromptLimit: _aiLimit,
    aiExternalPromptWindowMinutes: _aiWindow,
    aiExternalPromptUnlimited: _aiUnlimited,
    subscriptionStartDate: _subStart,
    subscriptionEndDate: _subEnd,
    ...rest
  } = data;
  return rest as OrganizationSettingsRequest;
}

export function TallyOrgSettingsView() {  const router = useRouter();
  const searchParams = useSearchParams();
  const partParam = searchParams.get("part");
  const user = useAppSelector((state) => state.auth.user);

  const { data: response, isLoading } = useGetOrganizationSettingsQuery();
  const [updateSettings, updateState] = useUpdateOrganizationSettingsMutation();

  const [draft, setDraft] = useState<OrganizationSettingsRequest | null>(null);
  const [selected, setSelected] = useState(() => {
    const idx = PARTS.findIndex((p) => p.id === partParam);
    return idx >= 0 ? idx : 0;
  });
  const fieldRefs = useRef<Array<HTMLElement | null>>([]);

  if (response?.data && !draft) {
    setDraft(stripSettings(response.data));
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key.toLowerCase() === "q") {
        event.preventDefault();
        router.push("/gateway");
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((c) => Math.min(c + 1, PARTS.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((c) => Math.max(c - 1, 0));
      } else if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        void save();
      } else if (event.key === "Enter") {
        const tag = (event.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
        event.preventDefault();
        router.push("/organization-settings");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router, draft, save]);

  function setField(key: keyof OrganizationSettingsRequest, value: unknown) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!draft) return;
    try {
      await updateSettings(draft).unwrap();
      toast.success("Organization settings saved");
    } catch {
      toast.error("Could not save settings");
    }
  }

  function changeInterface(mode: FactoryUiMode) {
    setFactoryUiMode(mode, user);
    toast.success(
      mode === "tally" ? "Tally-like workspace enabled" : "New Factory1 workspace enabled",
    );
  }

  const active = PARTS[selected];
  const currentMode = getFactoryUiMode(user);

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden border border-[#0F766E] bg-[#FEFCE8] font-mono text-[13px] text-[#0F172A]">
      <div className="w-64 shrink-0 overflow-auto border-r border-[#0F766E] bg-[#C8E6C9]">
        <div className="border-b border-[#0F766E] bg-[#0F172A] px-2 py-1 text-center font-bold text-white">
          Org Settings
        </div>
        {PARTS.map((part, index) => (
          <button
            key={part.id}
            type="button"
            onClick={() => setSelected(index)}
            className={[
              "flex w-full items-center gap-2 border-b border-[#94A3B8]/40 px-2 py-1.5 text-left",
              index === selected
                ? "bg-[#0F172A] text-white"
                : "hover:bg-[#6366F1]/10",
            ].join(" ")}
          >
            <span className="font-bold text-[#EF4444]">{part.key}</span>
            <span>{part.label}</span>
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[#0F766E] bg-[#0F172A] px-3 py-1 text-center font-bold text-white">
          {active.label}
        </div>

        <div className="flex-1 overflow-auto px-4 py-3">
          {isLoading && !draft ? (
            <div className="text-slate-500">Loading…</div>
          ) : active.id === "interface" ? (
            <InterfacePanel currentMode={currentMode} onChange={changeInterface} />
          ) : active.id === "plan" ? (
            <PlanPanel settings={response?.data} />
          ) : (
            <FieldForm
              fields={FIELDS[active.id] ?? []}
              draft={draft}
              setField={setField}
              fieldRefs={fieldRefs}
            />
          )}
        </div>

        <div className="grid grid-cols-4 border-t border-[#0F766E] bg-[#BBF7D0] text-xs">
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left font-bold hover:bg-[#6366F1] hover:text-white disabled:opacity-60"
            disabled={updateState.isLoading || !draft}
            onClick={() => void save()}
          >
            A: Save
          </button>
          <span className="border-r border-[#0F766E] px-2 py-1 text-slate-600">
            ↑/↓: Parts
          </span>
          <button
            type="button"
            className="border-r border-[#0F766E] px-2 py-1 text-left hover:bg-[#6366F1] hover:text-white"
            onClick={() => router.push("/organization-settings")}
          >
            Enter: Full Editor
          </button>
          <span className="px-2 py-1 text-slate-600">Q/Esc: Back</span>
        </div>
      </div>
    </div>
  );
}

function FieldForm({
  fields,
  draft,
  setField,
  fieldRefs,
}: {
  fields: Field[];
  draft: OrganizationSettingsRequest | null;
  setField: (key: keyof OrganizationSettingsRequest, value: unknown) => void;
  fieldRefs: MutableRefObject<Array<HTMLElement | null>>;
}) {
  if (!draft) return null;
  return (
    <div className="mx-auto max-w-xl space-y-2">
      {fields.map((field, index) => {
        const value = draft[field.key];
        return (
          <label
            key={String(field.key)}
            className="grid grid-cols-[200px_1fr] items-center gap-3"
          >
            <span className="text-right text-[12px] text-slate-700">{field.label}</span>
            {field.type === "checkbox" ? (
              <input
                ref={(el) => {
                  fieldRefs.current[index] = el;
                }}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => setField(field.key, e.target.checked)}
                className="h-4 w-4"
              />
            ) : (
              <input
                ref={(el) => {
                  fieldRefs.current[index] = el;
                }}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                value={
                  value == null
                    ? ""
                    : field.type === "number"
                      ? String(value)
                      : String(value)
                }
                onChange={(e) =>
                  setField(
                    field.key,
                    field.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
                className="h-6 w-full border-0 border-b border-[#0F766E] bg-transparent px-1 outline-none focus:bg-[#FFF7C2]"
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

function InterfacePanel({
  currentMode,
  onChange,
}: {
  currentMode: FactoryUiMode;
  onChange: (mode: FactoryUiMode) => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <p className="text-[12px] text-slate-600">
        Switch the entire Factory1 interface between the new workspace and the
        Tally-like workspace. Your choice is saved per user.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange("modern")}
          className={[
            "flex-1 rounded border px-3 py-3 text-left",
            currentMode === "modern"
              ? "border-[#0F766E] bg-[#0F172A] text-white"
              : "border-[#0F766E] hover:bg-[#6366F1]/10",
          ].join(" ")}
        >
          <div className="font-bold">New Factory1</div>
          <div className="text-[11px] opacity-80">Modern dashboard & forms</div>
        </button>
        <button
          type="button"
          onClick={() => onChange("tally")}
          className={[
            "flex-1 rounded border px-3 py-3 text-left",
            currentMode === "tally"
              ? "border-[#0F766E] bg-[#0F172A] text-white"
              : "border-[#0F766E] hover:bg-[#6366F1]/10",
          ].join(" ")}
        >
          <div className="font-bold">Tally-like</div>
          <div className="text-[11px] opacity-80">Keyboard-driven gateway</div>
        </button>
      </div>
      <p className="text-[12px]">
        Current mode:{" "}
        <span className="font-bold">
          {currentMode === "tally" ? "Tally-like" : "New Factory1"}
        </span>
      </p>
    </div>
  );
}

function PlanPanel({
  settings,
}: {
  settings?: import("@/features/organization-settings/types/organizationSettings.types").OrganizationSettingsResponse;
}) {
  if (!settings) return null;
  const rows: Array<[string, string]> = [
    ["Plan", settings.plan ?? "—"],
    ["Plan Monthly Price", settings.planMonthlyPrice != null ? `₹${settings.planMonthlyPrice}` : "—"],
    ["Employee Limit", settings.employeeLimit != null ? String(settings.employeeLimit) : "Unlimited"],
    [
      "AI Prompt Limit",
      settings.aiExternalPromptUnlimited
        ? "Unlimited"
        : settings.aiExternalPromptLimit != null
          ? String(settings.aiExternalPromptLimit)
          : "—",
    ],
    ["AI Prompt Window (min)", String(settings.aiExternalPromptWindowMinutes ?? "—")],
    ["Subscription Start", settings.subscriptionStartDate ?? "—"],
    ["Subscription End", settings.subscriptionEndDate ?? "—"],
    ["Organization Email", settings.organizationEmail ?? "—"],
    ["Phone", settings.phone ?? "—"],
  ];
  return (
    <table className="w-full max-w-2xl border-collapse text-[12px]">
      <tbody>
        {rows.map(([label, value], index) => (
          <tr key={index} className="border-b border-[#94A3B8]/60">
            <td className="w-1/3 px-2 py-1 font-semibold">{label}</td>
            <td className="px-2 py-1">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
