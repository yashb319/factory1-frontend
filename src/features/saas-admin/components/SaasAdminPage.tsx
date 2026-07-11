"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  Database,
  IndianRupee,
  RefreshCw,
  Save,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/lib/hook";
import {
  useCreateSaasOfferMutation,
  useGetSaasAdminDashboardQuery,
  useGetSaasAdminInsightsQuery,
  useUpdateSaasPlanMutation,
} from "../api/saasAdminApi";
import type {
  OrganizationPlan,
  OrganizationStatus,
  SaasPlanOption,
} from "../types/saasAdmin.types";

type PlanDraft = {
  employeeLimit: string;
  aiPromptLimit: string;
  aiPromptWindowMinutes: string;
  aiUnlimited: boolean;
  defaultMonthlyPrice: string;
  displayNote: string;
  serviceOfferings: string;
};

type OfferDraft = {
  title: string;
  code: string;
  description: string;
  discountPercent: string;
  validUntil: string;
  active: boolean;
};

export function SaasAdminPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { data, isFetching, refetch } = useGetSaasAdminDashboardQuery(
    undefined,
    {
      skip: !user?.platformAdmin,
    }
  );
  const [updatePlan, updatePlanState] = useUpdateSaasPlanMutation();
  const [createOffer, createOfferState] = useCreateSaasOfferMutation();
  const { data: insightsData } =
    useGetSaasAdminInsightsQuery(undefined, {
      skip: !user?.platformAdmin,
    });
  const [planDrafts, setPlanDrafts] = useState<Record<string, PlanDraft>>({});
  const [offerDraft, setOfferDraft] = useState<OfferDraft>({
    title: "",
    code: "",
    description: "",
    discountPercent: "",
    validUntil: "",
    active: true,
  });

  const dashboard = data?.data;

  useEffect(() => {
    if (!dashboard?.plans) return;

    setPlanDrafts((current) => {
      const next = { ...current };

      for (const plan of dashboard.plans) {
        if (!next[plan.plan]) {
          next[plan.plan] = {
            employeeLimit: plan.employeeLimit == null ? "" : String(plan.employeeLimit),
            aiPromptLimit: plan.aiPromptLimit == null ? "" : String(plan.aiPromptLimit),
            aiPromptWindowMinutes: String(plan.aiPromptWindowMinutes ?? 5),
            aiUnlimited: Boolean(plan.aiUnlimited),
            defaultMonthlyPrice: String(Number(plan.defaultMonthlyPrice ?? 0)),
            displayNote: plan.displayNote ?? "",
            serviceOfferings: plan.serviceOfferings ?? "",
          };
        }
      }

      return next;
    });
  }, [dashboard?.plans]);

  const plansByKey = useMemo(
    () =>
      new Map(
        (dashboard?.plans ?? []).map((plan) => [
          plan.plan,
          plan,
        ])
      ),
    [dashboard?.plans]
  );

  if (!user?.platformAdmin) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold">SaaS Admin</h1>
        <p className="mt-2 text-sm text-slate-500">
          This area is only available for Factory1 platform administrators.
        </p>
      </div>
    );
  }

  async function savePlan(plan: SaasPlanOption) {
    const draft = planDrafts[plan.plan];

    if (!draft) return;

    try {
      await updatePlan({
        plan: plan.plan,
        body: {
          employeeLimit:
            plan.plan === "ENTERPRISE" || draft.employeeLimit === ""
              ? null
              : Number(draft.employeeLimit),
          aiPromptLimit:
            draft.aiUnlimited || draft.aiPromptLimit === ""
              ? null
              : Number(draft.aiPromptLimit),
          aiPromptWindowMinutes: Number(draft.aiPromptWindowMinutes || 5),
          aiUnlimited: draft.aiUnlimited,
          defaultMonthlyPrice: Number(draft.defaultMonthlyPrice || 0),
          displayNote: draft.displayNote,
          serviceOfferings: draft.serviceOfferings,
        },
      }).unwrap();

      toast.success(`${plan.label} plan updated`);
    } catch {
      toast.error("Could not update plan settings");
    }
  }

  function updatePlanDraft(
    plan: OrganizationPlan,
    patch: Partial<PlanDraft>
  ) {
    setPlanDrafts((current) => ({
      ...current,
      [plan]: {
        employeeLimit: current[plan]?.employeeLimit ?? "",
        aiPromptLimit: current[plan]?.aiPromptLimit ?? "",
        aiPromptWindowMinutes: current[plan]?.aiPromptWindowMinutes ?? "5",
        aiUnlimited: current[plan]?.aiUnlimited ?? plan === "ENTERPRISE",
        defaultMonthlyPrice: current[plan]?.defaultMonthlyPrice ?? "0",
        displayNote: current[plan]?.displayNote ?? "",
        serviceOfferings: current[plan]?.serviceOfferings ?? "",
        ...patch,
      },
    }));
  }

  async function generateOffer() {
    if (!offerDraft.title.trim() || !offerDraft.code.trim()) {
      toast.error("Offer title and code are required");
      return;
    }

    try {
      await createOffer({
        title: offerDraft.title,
        code: offerDraft.code,
        description: offerDraft.description,
        discountPercent: offerDraft.discountPercent
          ? Number(offerDraft.discountPercent)
          : undefined,
        validUntil: offerDraft.validUntil || undefined,
        active: offerDraft.active,
      }).unwrap();

      toast.success("Offer generated");
      setOfferDraft({
        title: "",
        code: "",
        description: "",
        discountPercent: "",
        validUntil: "",
        active: true,
      });
    } catch {
      toast.error("Could not generate offer");
    }
  }

  const factories = dashboard?.factories ?? [];
  const overLimitFactories = factories.filter(
    (factory) =>
      factory.employeeLimit != null &&
      factory.employeeCount > factory.employeeLimit
  ).length;
  const quotaBlockedPrompts = factories.reduce(
    (total, factory) => total + factory.aiUsage.quotaLimitedPrompts,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            SaaS Admin
          </h1>
          <p className="text-sm text-slate-500">
            Review registered factories, usage, owners, plans and pricing.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Factories"
          value={dashboard?.totalFactories ?? 0}
          icon={Building2}
        />
        <MetricCard
          label="Employees"
          value={dashboard?.totalEmployees ?? 0}
          icon={Users}
        />
        <MetricCard
          label="AI prompts"
          value={dashboard?.totalAiPrompts ?? 0}
          icon={Sparkles}
        />
        <MetricCard
          label="Hosted AI"
          value={dashboard?.totalHostedAiPrompts ?? 0}
          icon={IndianRupee}
        />
        <MetricCard
          label="DB records"
          value={dashboard?.totalDbRecords ?? 0}
          icon={Database}
        />
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Link
          href="/saas-admin/insights"
          className="rounded-lg border bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50"
        >
          <p className="text-xs font-medium uppercase text-slate-500">
            Renewals due (30d)
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {insightsData?.data?.expiringIn30Days ?? 0}
          </p>
          <p className="text-xs text-slate-500">factories expiring soon</p>
        </Link>
        <Link
          href="/saas-admin/insights"
          className="rounded-lg border bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50"
        >
          <p className="text-xs font-medium uppercase text-slate-500">
            Renewals due (14d)
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {insightsData?.data?.expiringIn14Days ?? 0}
          </p>
          <p className="text-xs text-slate-500">final reminder window</p>
        </Link>
        <Link
          href="/saas-admin/insights"
          className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100"
        >
          <div>
            <p className="text-xs font-medium uppercase text-blue-600">
              Revenue & Usage
            </p>
            <p className="mt-1 text-sm font-semibold text-blue-900">
              Open insights
            </p>
          </div>
          <BarChart3 size={28} className="text-blue-600" />
        </Link>
      </div>

      <div className="grid gap-3 grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Plan attention
          </p>
          <p className="mt-1 text-2xl font-semibold">{overLimitFactories}</p>
          <p className="text-xs text-slate-500">
            factories are above their current employee limit.
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Quota blocked
          </p>
          <p className="mt-1 text-2xl font-semibold">{quotaBlockedPrompts}</p>
          <p className="text-xs text-slate-500">
            AI prompts were answered locally after hosted quota was reached.
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
        {(dashboard?.plans ?? []).map((plan) => (
          <PlanSummary
            key={plan.plan}
            plan={plan}
            draft={planDrafts[plan.plan]}
            onChange={(patch) => updatePlanDraft(plan.plan, patch)}
            onSave={() => savePlan(plan)}
            saving={updatePlanState.isLoading}
          />
        ))}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Tag size={16} />
              Offer Generator
            </h2>
            <p className="text-xs text-slate-500">
              Create manual sales offers while payment gateway integration is pending.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={generateOffer}
            disabled={createOfferState.isLoading}
          >
            <Save size={14} />
            Generate Offer
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-6">
          <Input
            className="h-9 md:col-span-2"
            placeholder="Offer title"
            value={offerDraft.title}
            onChange={(event) =>
              setOfferDraft((current) => ({ ...current, title: event.target.value }))
            }
          />
          <Input
            className="h-9"
            placeholder="Code"
            value={offerDraft.code}
            onChange={(event) =>
              setOfferDraft((current) => ({ ...current, code: event.target.value }))
            }
          />
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9"
            placeholder="Discount %"
            value={offerDraft.discountPercent}
            onChange={(event) =>
              setOfferDraft((current) => ({
                ...current,
                discountPercent: event.target.value,
              }))
            }
          />
          <Input
            type="date"
            className="h-9"
            value={offerDraft.validUntil}
            onChange={(event) =>
              setOfferDraft((current) => ({ ...current, validUntil: event.target.value }))
            }
          />
          <div className="flex items-center gap-2">
            <Checkbox
              checked={offerDraft.active}
              onCheckedChange={(checked) =>
                setOfferDraft((current) => ({ ...current, active: Boolean(checked) }))
              }
            />
            <span className="text-xs font-medium text-slate-600">Active</span>
          </div>
          <Input
            className="h-9 md:col-span-6"
            placeholder="Description or sales note"
            value={offerDraft.description}
            onChange={(event) =>
              setOfferDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </div>

        <div className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-3">
          {(dashboard?.offers ?? []).map((offer) => (
            <div key={offer.id} className="rounded-md border bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{offer.title}</p>
                  <p className="text-xs text-slate-500">{offer.code}</p>
                </div>
                <Badge variant={offer.active ? "default" : "outline"}>
                  {offer.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {offer.discountPercent ?? 0}% off
                {offer.validUntil ? ` until ${offer.validUntil}` : ""}
              </p>
              {offer.description ? (
                <p className="mt-2 text-xs text-slate-500">{offer.description}</p>
              ) : null}
            </div>
          ))}
          {!dashboard?.offers?.length ? (
            <p className="text-sm text-slate-500">No offers generated yet.</p>
          ) : null}
        </div>
      </div>

      <Link
        href="/saas-admin/factories"
        className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100"
      >
        <div>
          <p className="text-xs font-medium uppercase text-blue-600">
            Registered Factories
          </p>
          <p className="mt-1 text-sm font-semibold text-blue-900">
            {factories.length} onboarded
            {factories.length === 1 ? "" : "s"} • open full directory
          </p>
          <p className="text-xs text-blue-700">
            Manage plans, lifecycle and view each company&apos;s complete
            entitlement breakdown.
          </p>
        </div>
        <Building2 size={28} className="text-blue-600" />
      </Link>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="flex items-center justify-between p-3 sm:p-4">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Icon size={18} />
        </div>
      </CardContent>
    </Card>
  );
}

function PlanSummary({
  plan,
  draft,
  onChange,
  onSave,
  saving,
}: {
  plan: SaasPlanOption;
  draft?: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const currentDraft = draft ?? {
    employeeLimit: plan.employeeLimit == null ? "" : String(plan.employeeLimit),
    aiPromptLimit: plan.aiPromptLimit == null ? "" : String(plan.aiPromptLimit),
    aiPromptWindowMinutes: String(plan.aiPromptWindowMinutes ?? 5),
    aiUnlimited: Boolean(plan.aiUnlimited),
    defaultMonthlyPrice: String(Number(plan.defaultMonthlyPrice ?? 0)),
    displayNote: plan.displayNote ?? "",
    serviceOfferings: plan.serviceOfferings ?? "",
  };

  const dirty =
    currentDraft.employeeLimit !== (plan.employeeLimit == null ? "" : String(plan.employeeLimit)) ||
    currentDraft.aiPromptLimit !== (plan.aiPromptLimit == null ? "" : String(plan.aiPromptLimit)) ||
    Number(currentDraft.aiPromptWindowMinutes || 5) !== Number(plan.aiPromptWindowMinutes ?? 5) ||
    currentDraft.aiUnlimited !== Boolean(plan.aiUnlimited) ||
    Number(currentDraft.defaultMonthlyPrice || 0) !== Number(plan.defaultMonthlyPrice ?? 0) ||
    currentDraft.displayNote !== (plan.displayNote ?? "") ||
    currentDraft.serviceOfferings !== (plan.serviceOfferings ?? "");

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{plan.label}</h3>
        <Badge variant={plan.plan === "ENTERPRISE" ? "default" : "outline"}>
          {currentDraft.aiUnlimited
            ? "Unlimited"
            : `${currentDraft.aiPromptLimit || 0}/${currentDraft.aiPromptWindowMinutes || 5}m`}
        </Badge>
      </div>

      <div className="mt-3 grid gap-3">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Monthly Price</span>
          <Input
            type="number"
            min={0}
            className="h-8"
            value={currentDraft.defaultMonthlyPrice}
            onChange={(event) =>
              onChange({ defaultMonthlyPrice: event.target.value })
            }
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Employee Limit</span>
          <Input
            type="number"
            min={0}
            className="h-8"
            disabled={plan.plan === "ENTERPRISE"}
            placeholder={plan.plan === "ENTERPRISE" ? "Unlimited" : "20"}
            value={plan.plan === "ENTERPRISE" ? "" : currentDraft.employeeLimit}
            onChange={(event) =>
              onChange({ employeeLimit: event.target.value })
            }
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Display Note</span>
          <Input
            className="h-8"
            placeholder="For growing daily operations"
            value={currentDraft.displayNote}
            onChange={(event) =>
              onChange({ displayNote: event.target.value })
            }
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Service Offered</span>
          <Input
            className="h-8"
            placeholder="All modules, Role-based access"
            value={currentDraft.serviceOfferings}
            onChange={(event) =>
              onChange({ serviceOfferings: event.target.value })
            }
          />
        </label>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={currentDraft.aiUnlimited}
            onCheckedChange={(checked) =>
              onChange({ aiUnlimited: Boolean(checked) })
            }
          />
          <span className="text-xs font-medium text-slate-600">
            Unlimited hosted AI
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>AI Prompts</span>
            <Input
              type="number"
              min={0}
              className="h-8"
              disabled={currentDraft.aiUnlimited}
              placeholder={currentDraft.aiUnlimited ? "Unlimited" : "10"}
              value={currentDraft.aiUnlimited ? "" : currentDraft.aiPromptLimit}
              onChange={(event) =>
                onChange({ aiPromptLimit: event.target.value })
              }
            />
          </label>

          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Window Min</span>
            <Input
              type="number"
              min={1}
              className="h-8"
              value={currentDraft.aiPromptWindowMinutes}
              onChange={(event) =>
                onChange({ aiPromptWindowMinutes: event.target.value })
              }
            />
          </label>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={!dirty || saving}
          onClick={onSave}
        >
          <Save size={14} />
          Save Plan
        </Button>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function limitLabel(limit: number | null) {
  return limit == null ? "Unlimited" : limit;
}

function usagePercent(count: number, limit: number | null) {
  if (limit == null) return "Unlimited plan";

  return `${Math.round((count / Math.max(limit, 1)) * 100)}% used`;
}

function planLimitText(plan: SaasPlanOption) {
  const employees = plan.employeeLimit
    ? `${plan.employeeLimit} employees`
    : "Unlimited employees";
  const ai = plan.aiUnlimited
    ? "unlimited AI"
    : `${plan.aiPromptLimit}/${plan.aiPromptWindowMinutes}m AI`;

  return `${employees}, ${ai}`;
}

export function StatusBadge({ status }: { status: OrganizationStatus }) {
  const map: Record<
    OrganizationStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    ACTIVE: { label: "Active", variant: "default" },
    SUSPENDED: { label: "Suspended", variant: "secondary" },
    TERMINATED: { label: "Terminated", variant: "destructive" },
  };

  const { label, variant } = map[status];

  return (
    <Badge variant={variant} className="gap-1">
      <Activity size={12} />
      {label}
    </Badge>
  );
}
