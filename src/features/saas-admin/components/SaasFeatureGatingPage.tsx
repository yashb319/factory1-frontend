"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
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
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FEATURE_KEYS, FEATURE_LABELS } from "@/config/featureGating";
import type { FeatureKey } from "@/config/featureGating";
import { useAppSelector } from "@/lib/hook";
import {
  useClearOrgFeatureOverrideMutation,
  useGetFeatureCatalogQuery,
  useGetOrgFeatureDetailQuery,
  useGetOrgFeatureSummariesQuery,
  useSetOrgFeatureMutation,
} from "../api/featureGatingApi";
import type {
  FeatureCatalogItem,
  FeatureSource,
  OrganizationFeatureState,
  OrganizationFeatureSummary,
} from "../types/featureGating.types";
import { StatusBadge } from "./SaasAdminPage";

type PendingToggle = {
  feature: OrganizationFeatureState;
  nextEnabled: boolean;
};

export function SaasFeatureGatingPage() {
  const user = useAppSelector((state) => state.auth.user);
  const skip = !user?.platformAdmin;

  const summariesQuery = useGetOrgFeatureSummariesQuery(undefined, { skip });
  const catalogQuery = useGetFeatureCatalogQuery(undefined, { skip });

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const catalogByKey = useMemo(() => {
    const map = new Map<string, FeatureCatalogItem>();
    for (const item of catalogQuery.data?.data ?? []) {
      map.set(item.key, item);
    }
    return map;
  }, [catalogQuery.data?.data]);

  const organizations = useMemo(
    () => summariesQuery.data?.data ?? [],
    [summariesQuery.data?.data]
  );
  const plans = useMemo(
    () => Array.from(new Set(organizations.map((org) => org.plan))),
    [organizations]
  );

  const filteredOrganizations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return organizations.filter((org) => {
      if (planFilter !== "ALL" && org.plan !== planFilter) return false;
      if (!term) return true;

      return `${org.name} ${org.organizationId}`
        .toLowerCase()
        .includes(term);
    });
  }, [organizations, search, planFilter]);

  if (!user?.platformAdmin) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="text-xl font-semibold">Feature Gating</h1>
        <p className="mt-2 text-sm text-slate-500">
          This area is only available for Factory1 platform administrators.
        </p>
      </div>
    );
  }

  const loading = summariesQuery.isLoading;
  const loadError = summariesQuery.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Feature Gating
          </h1>
          <p className="text-sm text-slate-500">
            Control which Factory1 features are enabled for each organization.
            Overrides apply immediately and owners are notified by email.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => summariesQuery.refetch()}
          disabled={summariesQuery.isFetching}
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Organizations</h2>
          <p className="text-xs text-slate-500">
            Every registered organization with its plan and currently enabled
            features. Open one to review or override feature access.
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
              placeholder="Search organization"
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
              {plans.map((plan) => (
                <SelectItem key={plan} value={plan}>
                  {plan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enabled Features</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-slate-500"
                >
                  Loading organizations...
                </TableCell>
              </TableRow>
            ) : null}

            {loadError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-red-600"
                >
                  Could not load organizations. Try refreshing.
                </TableCell>
              </TableRow>
            ) : null}

            {!loading &&
              !loadError &&
              filteredOrganizations.map((org) => (
                <OrganizationRow
                  key={org.organizationId}
                  organization={org}
                  catalogByKey={catalogByKey}
                  onSelect={() => setSelectedOrgId(org.organizationId)}
                />
              ))}

            {!loading && !loadError && filteredOrganizations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-slate-500"
                >
                  {organizations.length === 0
                    ? "No organizations registered yet."
                    : "No organizations match your filters."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={selectedOrgId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrgId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedOrgId ? (
            <OrganizationFeatureDetail
              organizationId={selectedOrgId}
              catalogByKey={catalogByKey}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type OrganizationRowProps = {
  organization: OrganizationFeatureSummary;
  catalogByKey: Map<string, FeatureCatalogItem>;
  onSelect: () => void;
};

function OrganizationRow({
  organization,
  catalogByKey,
  onSelect,
}: OrganizationRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{organization.name}</p>
            <p className="truncate text-xs text-slate-500">
              {organization.organizationId}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{organization.plan}</Badge>
      </TableCell>
      <TableCell>
        <StatusBadge status={organization.status} />
      </TableCell>
      <TableCell>
        <div className="flex max-w-md flex-wrap gap-1">
          {organization.enabledFeatures.length === 0 ? (
            <span className="text-xs text-slate-400">None enabled</span>
          ) : (
            organization.enabledFeatures.map((key) => (
              <Badge key={key} variant="outline" className="text-xs">
                {featureLabel(key, catalogByKey)}
              </Badge>
            ))
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button type="button" variant="outline" size="sm" onClick={onSelect}>
          <SlidersHorizontal size={14} />
          Manage
        </Button>
      </TableCell>
    </TableRow>
  );
}

type OrganizationFeatureDetailProps = {
  organizationId: string;
  catalogByKey: Map<string, FeatureCatalogItem>;
};

function OrganizationFeatureDetail({
  organizationId,
  catalogByKey,
}: OrganizationFeatureDetailProps) {
  const detailQuery = useGetOrgFeatureDetailQuery(organizationId);
  const [setOrgFeature, setOrgFeatureState] = useSetOrgFeatureMutation();
  const [clearOverride, clearOverrideState] =
    useClearOrgFeatureOverrideMutation();

  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(
    null
  );
  const [toggleReason, setToggleReason] = useState("");
  const [pendingClear, setPendingClear] =
    useState<OrganizationFeatureState | null>(null);

  const detail = detailQuery.data?.data;

  const features = useMemo(() => {
    const source = detail?.features ?? [];
    const order = new Map<string, number>(
      FEATURE_KEYS.map((key, index) => [key, index])
    );

    return [...source].sort(
      (a, b) =>
        (order.get(a.key as FeatureKey) ?? FEATURE_KEYS.length) -
        (order.get(b.key as FeatureKey) ?? FEATURE_KEYS.length)
    );
  }, [detail?.features]);

  function openToggle(feature: OrganizationFeatureState, nextEnabled: boolean) {
    setToggleReason("");
    setPendingToggle({ feature, nextEnabled });
  }

  async function runToggle() {
    if (!pendingToggle) return;

    const reason = toggleReason.trim();

    if (!reason) {
      toast.error("A reason is required to change feature access");
      return;
    }

    const { feature, nextEnabled } = pendingToggle;
    const label = featureLabel(feature.key, catalogByKey);

    try {
      await setOrgFeature({
        organizationId,
        featureKey: feature.key,
        body: { enabled: nextEnabled, reason },
      }).unwrap();
      toast.success(
        `${label} ${nextEnabled ? "enabled" : "disabled"} for ${detail?.name ?? "organization"}`
      );
    } catch {
      toast.error(`Could not update ${label}`);
    } finally {
      setPendingToggle(null);
      setToggleReason("");
    }
  }

  async function runClearOverride() {
    if (!pendingClear) return;

    const label = featureLabel(pendingClear.key, catalogByKey);

    try {
      await clearOverride({
        organizationId,
        featureKey: pendingClear.key,
      }).unwrap();
      toast.success(`${label} restored to plan default`);
    } catch {
      toast.error(`Could not clear the ${label} override`);
    } finally {
      setPendingClear(null);
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Loading feature access...
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-red-600">
          Could not load feature access for this organization.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => detailQuery.refetch()}
        >
          <RefreshCw size={16} />
          Retry
        </Button>
      </div>
    );
  }

  const busy = setOrgFeatureState.isLoading || clearOverrideState.isLoading;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{detail.name}</SheetTitle>
        <SheetDescription>
          Plan <Badge variant="secondary">{detail.plan}</Badge> — toggle a
          feature to override the plan default, or clear an override to restore
          it.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-3 px-4 pb-6">
        {features.map((feature) => (
          <div key={feature.key} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {featureLabel(feature.key, catalogByKey)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {featureDescription(feature.key, catalogByKey)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={feature.enabled ? "default" : "outline"}>
                    {feature.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <SourceBadge source={feature.source} />
                </div>
                {feature.source === "OVERRIDE" ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {feature.overrideReason
                      ? `Reason: ${feature.overrideReason}`
                      : "Override active"}
                    {feature.overrideUpdatedAt
                      ? ` • updated ${formatDateTime(feature.overrideUpdatedAt)}`
                      : ""}
                  </p>
                ) : null}
              </div>

              <Switch
                checked={feature.enabled}
                disabled={busy}
                aria-label={`Toggle ${featureLabel(feature.key, catalogByKey)}`}
                onCheckedChange={(checked) => openToggle(feature, checked)}
              />
            </div>

            {feature.source === "OVERRIDE" ? (
              <div className="mt-3 border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setPendingClear(feature)}
                >
                  <RotateCcw size={14} />
                  Clear override
                </Button>
              </div>
            ) : null}
          </div>
        ))}

        {features.length === 0 ? (
          <p className="text-sm text-slate-500">
            No features returned for this organization.
          </p>
        ) : null}
      </div>

      <AlertDialog
        open={pendingToggle !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingToggle(null);
            setToggleReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.nextEnabled ? "Enable" : "Disable"}{" "}
              {pendingToggle
                ? featureLabel(pendingToggle.feature.key, catalogByKey)
                : ""}{" "}
              for {detail.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This creates an admin override and takes effect immediately.
              Organization owners will be notified by email.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Reason (required)</span>
            <Textarea
              value={toggleReason}
              onChange={(event) => setToggleReason(event.target.value)}
              placeholder="Why is this feature access changing?"
              rows={3}
            />
          </label>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={setOrgFeatureState.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                setOrgFeatureState.isLoading || !toggleReason.trim()
              }
              className={
                pendingToggle?.nextEnabled
                  ? undefined
                  : "bg-red-600 hover:bg-red-700"
              }
              onClick={(event) => {
                event.preventDefault();
                runToggle();
              }}
            >
              {setOrgFeatureState.isLoading
                ? "Please wait..."
                : pendingToggle?.nextEnabled
                  ? "Enable feature"
                  : "Disable feature"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingClear !== null}
        onOpenChange={(open) => {
          if (!open) setPendingClear(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Clear override for{" "}
              {pendingClear
                ? featureLabel(pendingClear.key, catalogByKey)
                : ""}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The admin override is removed and {detail.name} falls back to the
              {` ${detail.plan} `}
              plan default for this feature.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearOverrideState.isLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={clearOverrideState.isLoading}
              onClick={(event) => {
                event.preventDefault();
                runClearOverride();
              }}
            >
              {clearOverrideState.isLoading ? "Please wait..." : "Clear override"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SourceBadge({ source }: { source: FeatureSource }) {
  if (source === "OVERRIDE") {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
        Admin override
      </Badge>
    );
  }

  if (source === "TIER_DEFAULT") {
    return <Badge variant="outline">Plan default</Badge>;
  }

  return <Badge variant="outline">Default policy</Badge>;
}

function featureLabel(
  key: string,
  catalogByKey: Map<string, FeatureCatalogItem>
) {
  return (
    catalogByKey.get(key)?.label ??
    FEATURE_LABELS[key as FeatureKey] ??
    key
  );
}

function featureDescription(
  key: string,
  catalogByKey: Map<string, FeatureCatalogItem>
) {
  return catalogByKey.get(key)?.description ?? "No description available.";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
