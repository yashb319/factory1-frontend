"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  Ban,
  Building2,
  CircleCheck,
  Database,
  Eye,
  IndianRupee,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  useMarkPaidSaasFactoryMutation,
  useTerminateSaasFactoryMutation,
  useUpdateSaasFactoryMutation,
  useUpdateSaasFactoryStatusMutation,
} from "../api/saasAdminApi";
import { StatusBadge } from "./SaasAdminPage";
import { formatBytes, formatDuration } from "../utils/metrics";
import type {
  OrganizationPlan,
  OrganizationStatus,
  SaasFactory,
  SaasPlanOption,
} from "../types/saasAdmin.types";

type FactoryAction = {
  factory: SaasFactory;
  kind: "approve" | "suspend" | "activate" | "terminate";
};

type Draft = {
  plan: OrganizationPlan;
  planMonthlyPrice: string;
};

export function SaasFactoriesPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { data, isFetching, refetch } = useGetSaasAdminDashboardQuery(
    undefined,
    {
      skip: !user?.platformAdmin,
    }
  );
  const [updateFactory, updateState] = useUpdateSaasFactoryMutation();
  const [updateStatus, updateStatusState] =
    useUpdateSaasFactoryStatusMutation();
  const [terminateFactory, terminateState] = useTerminateSaasFactoryMutation();
  const [markPaid, markPaidState] = useMarkPaidSaasFactoryMutation();
  const [markPaidTarget, setMarkPaidTarget] = useState<SaasFactory | null>(
    null
  );
  const [markPaidMonths, setMarkPaidMonths] = useState("1");
  const [markPaidDate, setMarkPaidDate] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [factoryAction, setFactoryAction] = useState<FactoryAction | null>(
    null
  );
  const [selected, setSelected] = useState<SaasFactory | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const dashboard = data?.data;

  const onSelectFactory = setSelected;
  const updateDraft = useCallback(
    (organizationId: string, patch: Partial<Draft>) => {
      setDrafts((current) => ({
        ...current,
        [organizationId]: {
          plan: current[organizationId]?.plan ?? "FREE",
          planMonthlyPrice: current[organizationId]?.planMonthlyPrice ?? "0",
          ...patch,
        },
      }));
    },
    []
  );
  const onActionFactory = useCallback(
    (factory: SaasFactory, kind: FactoryAction["kind"]) =>
      setFactoryAction({ factory, kind }),
    []
  );
  const onOpenMarkPaid = useCallback((factory: SaasFactory) => {
    setMarkPaidMonths("1");
    setMarkPaidDate("");
    setMarkPaidTarget(factory);
  }, []);
  const onSaveFactory = useCallback((factory: SaasFactory) => {
    const draft = drafts[factory.organizationId] ?? {
      plan: factory.plan,
      planMonthlyPrice: String(Number(factory.planMonthlyPrice ?? 0)),
    };

    updateFactory({
      organizationId: factory.organizationId,
      body: {
        plan: draft.plan,
        planMonthlyPrice: Number(draft.planMonthlyPrice || 0),
      },
    })
      .unwrap()
      .then(() => toast.success("Factory plan updated"))
      .catch(() => toast.error("Could not update factory plan"));
  }, [drafts, updateFactory]);

  const filteredFactories = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = dashboard?.factories ?? [];

    return source.filter((factory) => {
      if (planFilter !== "ALL" && factory.plan !== planFilter) return false;

      if (!term) return true;

      const haystack = [
        factory.name,
        factory.email ?? "",
        factory.phone ?? "",
        factory.owner?.name ?? "",
        factory.owner?.email ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [dashboard?.factories, search, planFilter]);

  if (!user?.platformAdmin) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold">Registered Factories</h1>
        <p className="mt-2 text-sm text-slate-500">
          This area is only available for Factory1 platform administrators.
        </p>
      </div>
    );
  }

  const updatingAction =
    updateStatusState.isLoading || terminateState.isLoading;

  async function runFactoryAction() {
    if (!factoryAction) return;

    const { factory, kind } = factoryAction;

    try {
      if (kind === "terminate") {
        await terminateFactory(factory.organizationId).unwrap();
        toast.success(`${factory.name} terminated`);
      } else {
        const status: OrganizationStatus =
          kind === "suspend" ? "SUSPENDED" : "ACTIVE";
        await updateStatus({
          organizationId: factory.organizationId,
          body: { status },
        }).unwrap();
        toast.success(
          kind === "approve"
            ? `${factory.name} approved`
            : kind === "suspend"
            ? `${factory.name} suspended`
            : `${factory.name} activated`
        );
      }

      setFactoryAction(null);
    } catch {
      toast.error("Could not complete the action");
    }
  }

  async function runMarkPaid() {
    if (!markPaidTarget) return;

    try {
      await markPaid({
        organizationId: markPaidTarget.organizationId,
        body: {
          months: Number(markPaidMonths || "1"),
          paidDate: markPaidDate || undefined,
        },
      }).unwrap();

      toast.success(`${markPaidTarget.name} marked as paid`);
      setMarkPaidTarget(null);
      setMarkPaidMonths("1");
      setMarkPaidDate("");
    } catch {
      toast.error("Could not mark factory as paid");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Registered Factories
          </h1>
          <p className="text-sm text-slate-500">
            Manage every onboarded factory, its plan and full entitlement usage.
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

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">All Factories</h2>
          <p className="text-xs text-slate-500">
            Plan changes apply limits immediately for new employee creation and
            hosted AI quota. Open a factory to see its full entitlement breakdown.
          </p>
        </div>

        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              className="h-9 pl-9"
              placeholder="Search factory, email or owner"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All plans</SelectItem>
              {(dashboard?.plans ?? []).map((plan) => (
                <SelectItem key={plan.plan} value={plan.plan}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Factory</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell colSpan={10} className="py-8 text-center text-slate-500">
                  Loading factories...
                </TableCell>
              </TableRow>
            ) : null}

            {filteredFactories.map((factory) => {
              const draft = drafts[factory.organizationId];

              return (
                <FactoryRow
                  key={factory.organizationId}
                  factory={factory}
                  draftPlan={draft?.plan ?? factory.plan}
                  draftPrice={
                    draft?.planMonthlyPrice ??
                    String(Number(factory.planMonthlyPrice ?? 0))
                  }
                  plans={dashboard?.plans ?? []}
                  isStatusLoading={
                    updateStatusState.isLoading || terminateState.isLoading
                  }
                  isMarkPaidLoading={markPaidState.isLoading}
                  isUpdateLoading={updateState.isLoading}
                  onSelect={onSelectFactory}
                  onAction={onActionFactory}
                  onOpenMarkPaid={onOpenMarkPaid}
                  onSave={onSaveFactory}
                  onDraftChange={updateDraft}
                />
              );
            })}

            {!isFetching && filteredFactories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-slate-500">
                  No factories match your filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected ? (
            <FactoryDetail
              factory={selected}
              plans={dashboard?.plans ?? []}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={factoryAction !== null}
        onOpenChange={(open) => {
          if (!open) setFactoryAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {factoryAction?.kind === "terminate"
                ? "Terminate factory?"
                : factoryAction?.kind === "approve"
                  ? "Approve factory?"
                : factoryAction?.kind === "suspend"
                  ? "Suspend factory?"
                  : "Activate factory?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {factoryAction?.kind === "terminate"
                ? `This permanently terminates ${factoryAction.factory.name}. The organization is marked TERMINATED and cannot log in. This cannot be undone.`
                : factoryAction?.kind === "approve"
                  ? `${factoryAction?.factory.name ?? ""} will get dashboard access and the owner will receive the approval email.`
                : factoryAction?.kind === "suspend"
                  ? `${factoryAction?.factory.name ?? ""} will be suspended and unable to log in until reactivated.`
                  : `${factoryAction?.factory.name ?? ""} will be reactivated and able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={updatingAction}
              className={
                factoryAction?.kind === "terminate"
                  ? "bg-red-600 hover:bg-red-700"
                  : undefined
              }
              onClick={runFactoryAction}
            >
              {updatingAction
                ? "Please wait..."
                : factoryAction?.kind === "terminate"
                  ? "Terminate"
                  : factoryAction?.kind === "approve"
                    ? "Approve"
                  : factoryAction?.kind === "suspend"
                    ? "Suspend"
                    : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={markPaidTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMarkPaidTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark {markPaidTarget?.name ?? "factory"} as paid
            </AlertDialogTitle>
            <AlertDialogDescription>
              This sets the subscription end date to the paid date plus the
              chosen duration. Renewal reminder emails will be sent 30 and 14 days
              before it ends.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-3">
            <label className="space-y-1 text-xs font-medium text-slate-600">
              <span>Duration (months)</span>
              <Select value={markPaidMonths} onValueChange={setMarkPaidMonths}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 month</SelectItem>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              <span>Paid date (optional, defaults to today)</span>
              <Input
                type="date"
                className="h-9"
                value={markPaidDate}
                onChange={(event) => setMarkPaidDate(event.target.value)}
              />
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={markPaidState.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={markPaidState.isLoading}
              onClick={runMarkPaid}
            >
              {markPaidState.isLoading ? "Please wait..." : "Mark Paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type FactoryRowProps = {
  factory: SaasFactory;
  draftPlan: OrganizationPlan;
  draftPrice: string;
  plans: SaasPlanOption[];
  isStatusLoading: boolean;
  isMarkPaidLoading: boolean;
  isUpdateLoading: boolean;
  onSelect: (factory: SaasFactory) => void;
  onAction: (factory: SaasFactory, kind: FactoryAction["kind"]) => void;
  onOpenMarkPaid: (factory: SaasFactory) => void;
  onSave: (factory: SaasFactory) => void;
  onDraftChange: (organizationId: string, patch: Partial<Draft>) => void;
};

const FactoryRow = memo(function FactoryRow({
  factory,
  draftPlan,
  draftPrice,
  plans,
  isStatusLoading,
  isMarkPaidLoading,
  isUpdateLoading,
  onSelect,
  onAction,
  onOpenMarkPaid,
  onSave,
  onDraftChange,
}: FactoryRowProps) {
  const selectedPlan = plans.find((option) => option.plan === draftPlan);
  const status = factory.status ?? "ACTIVE";
  const dirty =
    draftPlan !== factory.plan ||
    Number(draftPrice || 0) !== Number(factory.planMonthlyPrice ?? 0);

  return (
    <TableRow>
      <TableCell className="min-w-56">
        <div className="font-medium">{factory.name}</div>
        <div className="text-xs text-slate-500">
          {factory.email || "No email"}{" "}
          {factory.phone ? `| ${factory.phone}` : ""}
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
        <StatusBadge status={status} />
        {factory.subscriptionEndDate ? (
          <p className="mt-1 text-xs text-slate-500">
            renews {factory.subscriptionEndDate}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">no end date</p>
        )}
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
          value={draftPlan}
          onValueChange={(value) =>
            onDraftChange(factory.organizationId, {
              plan: value as OrganizationPlan,
              planMonthlyPrice: draftPrice,
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
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
          value={draftPrice}
          onChange={(event) =>
            onDraftChange(factory.organizationId, {
              plan: draftPlan,
              planMonthlyPrice: event.target.value,
            })
          }
        />
      </TableCell>

      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSelect(factory)}
          >
            <Eye size={14} />
            View
          </Button>
          {status === "PENDING_APPROVAL" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isStatusLoading}
              onClick={() => onAction(factory, "approve")}
            >
              <CircleCheck size={14} />
              Approve
            </Button>
          ) : status === "ACTIVE" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isStatusLoading}
              onClick={() => onAction(factory, "suspend")}
            >
              <Ban size={14} />
              Suspend
            </Button>
          ) : status === "SUSPENDED" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isStatusLoading}
              onClick={() => onAction(factory, "activate")}
            >
              <CircleCheck size={14} />
              Activate
            </Button>
          ) : null}
          {status !== "TERMINATED" && factory.plan !== "FREE" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isMarkPaidLoading}
              onClick={() => onOpenMarkPaid(factory)}
            >
              <CircleCheck size={14} />
              Mark Paid
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!dirty || isUpdateLoading}
            onClick={() => onSave(factory)}
          >
            <Save size={14} />
            Save
          </Button>
          {status !== "TERMINATED" ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isStatusLoading}
              onClick={() => onAction(factory, "terminate")}
            >
              <Trash2 size={14} />
              Terminate
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
});

function FactoryDetail({
  factory,
  plans,
}: {
  factory: SaasFactory;
  plans: SaasPlanOption[];
}) {
  const plan = plans.find((option) => option.plan === factory.plan);
  const status = factory.status ?? "ACTIVE";
  const db = factory.dbUsage;

  return (
    <div className="space-y-6 py-2">
      <SheetHeader className="px-1">
        <div className="flex items-center gap-2">
          <SheetTitle className="text-xl">{factory.name}</SheetTitle>
          <StatusBadge status={status} />
        </div>
        <SheetDescription>
          {factory.email || "No email"}
          {factory.phone ? ` • ${factory.phone}` : ""}
        </SheetDescription>
      </SheetHeader>

      <Section
        title="Plan & Subscription"
        icon={IndianRupee}
      >
        <Stat label="Plan" value={plan?.label ?? factory.plan} />
        <Stat
          label="Monthly price"
          value={`₹${Number(factory.planMonthlyPrice ?? 0).toLocaleString("en-IN")}`}
        />
        <Stat
          label="Renews"
          value={factory.subscriptionEndDate ?? "No end date"}
        />
        <Stat label="Registered" value={formatDate(factory.registeredAt)} />
        <Stat label="Last login" value={formatDate(factory.lastLoginAt)} />
      </Section>

      <Section title="Owner & Contact" icon={Users}>
        <Stat label="Owner" value={factory.owner?.name ?? "No owner"} />
        <Stat label="Owner email" value={factory.owner?.email ?? "Missing"} />
        <Stat
          label="Owner last login"
          value={formatDate(factory.owner?.lastLoginAt ?? null)}
        />
        <Stat label="Factory email" value={factory.email ?? "No email"} />
        <Stat label="Phone" value={factory.phone ?? "—"} />
      </Section>

      <Section title="Employees" icon={Users}>
        <Stat
          label="Employees"
          value={`${factory.employeeCount} / ${limitLabel(factory.employeeLimit)}`}
          hint={usagePercent(factory.employeeCount, factory.employeeLimit)}
        />
        <Stat
          label="Plan employee limit"
          value={limitLabel(factory.employeeLimit)}
        />
      </Section>

      <Section title="AI Usage Entitlements" icon={Sparkles}>
        <Stat
          label="Hosted AI limit"
          value={
            factory.aiUnlimited
              ? "Unlimited"
              : `${factory.aiPromptLimit} prompts / ${factory.aiPromptWindowMinutes} min`
          }
        />
        <Stat label="Total prompts" value={factory.aiUsage.totalPrompts} />
        <Stat label="Hosted (external)" value={factory.aiUsage.externalPrompts} />
        <Stat
          label="Local fallback"
          value={factory.aiUsage.localFallbackPrompts}
        />
        <Stat
          label="Quota limited"
          value={factory.aiUsage.quotaLimitedPrompts}
        />
        <Stat
          label="Prompts (last 24h)"
          value={factory.aiUsage.promptsLast24Hours}
        />
      </Section>

      <Section title="Software & Database Entitlements" icon={Database}>
        <Stat
          label="Active users"
          value={`${db.activeUsers} / ${db.users}`}
        />
        <Stat label="Tenant records" value={db.totalRecords} />
        <Stat label="Employees" value={db.employees} />
        <Stat label="Inventory items" value={db.inventoryItems} />
        <Stat label="Stock movements" value={db.stockMovements} />
        <Stat label="Products" value={db.products} />
        <Stat label="Production entries" value={db.productionEntries} />
        <Stat label="Suppliers" value={db.suppliers} />
        <Stat label="Customers" value={db.customers} />
        <Stat label="Bills" value={db.bills} />
        <Stat label="Import / Export jobs" value={db.importExportJobs} />
      </Section>

      <Section title="Backend Usage (metered)" icon={Building2}>
        <Stat
          label="Service time"
          value={formatDuration(factory.serviceTimeMs)}
        />
        <Stat
          label="Data volume"
          value={formatBytes(factory.dataVolumeBytes)}
        />
      </Section>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        Plan changes apply limits immediately for new employee creation and
        hosted AI quota. Manage the plan and lifecycle from the factories table.
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon size={16} className="text-slate-500" />
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
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
