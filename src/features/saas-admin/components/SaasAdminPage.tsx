"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Database,
  IndianRupee,
  RefreshCw,
  Save,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSelector } from "@/lib/hook";
import {
  useGetSaasAdminDashboardQuery,
  useUpdateSaasFactoryMutation,
  useUpdateSaasPlanMutation,
} from "../api/saasAdminApi";
import type {
  OrganizationPlan,
  SaasFactory,
  SaasPlanOption,
} from "../types/saasAdmin.types";

type Draft = {
  plan: OrganizationPlan;
  planMonthlyPrice: string;
};

type PlanDraft = {
  employeeLimit: string;
  aiPromptLimit: string;
  aiPromptWindowMinutes: string;
  aiUnlimited: boolean;
  defaultMonthlyPrice: string;
};

export function SaasAdminPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { data, isFetching, refetch } = useGetSaasAdminDashboardQuery(
    undefined,
    {
      skip: !user?.platformAdmin,
    }
  );
  const [updateFactory, updateState] = useUpdateSaasFactoryMutation();
  const [updatePlan, updatePlanState] = useUpdateSaasPlanMutation();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [planDrafts, setPlanDrafts] = useState<Record<string, PlanDraft>>({});

  const dashboard = data?.data;

  useEffect(() => {
    if (!dashboard?.factories) return;

    setDrafts((current) => {
      const next = { ...current };

      for (const factory of dashboard.factories) {
        if (!next[factory.organizationId]) {
          next[factory.organizationId] = {
            plan: factory.plan,
            planMonthlyPrice: String(Number(factory.planMonthlyPrice ?? 0)),
          };
        }
      }

      return next;
    });
  }, [dashboard?.factories]);

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

  async function saveFactory(factory: SaasFactory) {
    const draft = drafts[factory.organizationId];

    if (!draft) return;

    try {
      await updateFactory({
        organizationId: factory.organizationId,
        body: {
          plan: draft.plan,
          planMonthlyPrice: Number(draft.planMonthlyPrice || 0),
        },
      }).unwrap();

      toast.success("Factory plan updated");
    } catch {
      toast.error("Could not update factory plan");
    }
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
        },
      }).unwrap();

      toast.success(`${plan.label} plan updated`);
    } catch {
      toast.error("Could not update plan settings");
    }
  }

  function updateDraft(
    organizationId: string,
    patch: Partial<Draft>
  ) {
    setDrafts((current) => ({
      ...current,
      [organizationId]: {
        plan: current[organizationId]?.plan ?? "FREE",
        planMonthlyPrice: current[organizationId]?.planMonthlyPrice ?? "0",
        ...patch,
      },
    }));
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
        ...patch,
      },
    }));
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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

      <div className="grid gap-3 sm:grid-cols-2">
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

      <div className="grid gap-3 md:grid-cols-4">
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

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Registered Factories</h2>
          <p className="text-xs text-slate-500">
            Plan changes apply limits immediately for new employee creation and hosted AI quota.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Factory</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>AI Usage</TableHead>
              <TableHead>Software / DB</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFetching && !dashboard ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-slate-500">
                  Loading factories...
                </TableCell>
              </TableRow>
            ) : null}

            {(dashboard?.factories ?? []).map((factory) => {
              const draft = drafts[factory.organizationId] ?? {
                plan: factory.plan,
                planMonthlyPrice: String(Number(factory.planMonthlyPrice ?? 0)),
              };
              const selectedPlan = plansByKey.get(draft.plan);
              const dirty =
                draft.plan !== factory.plan ||
                Number(draft.planMonthlyPrice || 0) !==
                  Number(factory.planMonthlyPrice ?? 0);

              return (
                <TableRow key={factory.organizationId}>
                  <TableCell className="min-w-56">
                    <div className="font-medium">{factory.name}</div>
                    <div className="text-xs text-slate-500">
                      {factory.email || "No email"} {factory.phone ? `| ${factory.phone}` : ""}
                    </div>
                    <div className="text-xs text-slate-400">
                      Registered {formatDate(factory.registeredAt)}
                    </div>
                  </TableCell>

                  <TableCell className="min-w-52">
                    <div className="font-medium">
                      {factory.owner?.name ?? "No owner"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {factory.owner?.email ?? "Owner missing"}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">
                      {factory.employeeCount}
                      <span className="text-slate-400">
                        /{limitLabel(factory.employeeLimit)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {usagePercent(factory.employeeCount, factory.employeeLimit)}
                    </div>
                  </TableCell>

                  <TableCell className="min-w-44">
                    <div className="font-medium">
                      {factory.aiUsage.totalPrompts} total
                    </div>
                    <div className="text-xs text-slate-500">
                      {factory.aiUsage.externalPrompts} hosted,{" "}
                      {factory.aiUsage.localFallbackPrompts} local
                    </div>
                    <div className="text-xs text-slate-500">
                      {factory.aiUnlimited
                        ? "Unlimited hosted AI"
                        : `${factory.aiPromptLimit} prompts / ${factory.aiPromptWindowMinutes} min`}
                    </div>
                  </TableCell>

                  <TableCell className="min-w-44">
                    <div className="font-medium">
                      {factory.dbUsage.activeUsers}/{factory.dbUsage.users} active users
                    </div>
                    <div className="text-xs text-slate-500">
                      {factory.dbUsage.totalRecords} tenant records
                    </div>
                    <div className="text-xs text-slate-500">
                      {factory.dbUsage.bills} bills, {factory.dbUsage.importExportJobs} jobs
                    </div>
                  </TableCell>

                  <TableCell>{formatDate(factory.lastLoginAt)}</TableCell>

                  <TableCell>
                    <Select
                      value={draft.plan}
                      onValueChange={(value) =>
                        updateDraft(factory.organizationId, {
                          plan: value as OrganizationPlan,
                        })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(dashboard?.plans ?? []).map((plan) => (
                          <SelectItem key={plan.plan} value={plan.plan}>
                            {plan.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedPlan ? planLimitText(selectedPlan) : ""}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-28"
                      value={draft.planMonthlyPrice}
                      onChange={(event) =>
                        updateDraft(factory.organizationId, {
                          planMonthlyPrice: event.target.value,
                        })
                      }
                    />
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!dirty || updateState.isLoading}
                      onClick={() => saveFactory(factory)}
                    >
                      <Save size={14} />
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {!isFetching && dashboard?.factories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-slate-500">
                  No factories registered yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
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
    <Card className="rounded-lg">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
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
  };

  const dirty =
    currentDraft.employeeLimit !== (plan.employeeLimit == null ? "" : String(plan.employeeLimit)) ||
    currentDraft.aiPromptLimit !== (plan.aiPromptLimit == null ? "" : String(plan.aiPromptLimit)) ||
    Number(currentDraft.aiPromptWindowMinutes || 5) !== Number(plan.aiPromptWindowMinutes ?? 5) ||
    currentDraft.aiUnlimited !== Boolean(plan.aiUnlimited) ||
    Number(currentDraft.defaultMonthlyPrice || 0) !== Number(plan.defaultMonthlyPrice ?? 0);

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
