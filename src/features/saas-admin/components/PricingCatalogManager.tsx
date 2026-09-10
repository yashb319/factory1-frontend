"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  IndianRupee,
  Pencil,
  Plus,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import {
  useCreateModuleAddonMutation,
  useCreatePricingPlanMutation,
  useDeleteModuleAddonMutation,
  useDeletePricingPlanMutation,
  useGetModuleAddonsQuery,
  useGetPricingPlansQuery,
  useReorderModuleAddonsMutation,
  useReorderPricingPlansMutation,
  useUpdateModuleAddonMutation,
  useUpdatePricingPlanMutation,
} from "../api/saasAdminApi";
import type {
  ModuleAddon,
  ModuleAddonRequest,
  PricingPlan,
  PricingPlanRequest,
} from "../types/saasAdmin.types";

type DeleteTarget =
  | { kind: "plan"; item: PricingPlan }
  | { kind: "addon"; item: ModuleAddon };

export function PricingCatalogManager() {
  const plansQuery = useGetPricingPlansQuery();
  const addonsQuery = useGetModuleAddonsQuery();
  const [createPlan, createPlanState] = useCreatePricingPlanMutation();
  const [updatePlan, updatePlanState] = useUpdatePricingPlanMutation();
  const [deletePlan, deletePlanState] = useDeletePricingPlanMutation();
  const [reorderPlans, reorderPlansState] = useReorderPricingPlansMutation();
  const [createAddon, createAddonState] = useCreateModuleAddonMutation();
  const [updateAddon, updateAddonState] = useUpdateModuleAddonMutation();
  const [deleteAddon, deleteAddonState] = useDeleteModuleAddonMutation();
  const [reorderAddons, reorderAddonsState] = useReorderModuleAddonsMutation();
  const [planEditor, setPlanEditor] = useState<PricingPlan | "new" | null>(null);
  const [addonEditor, setAddonEditor] = useState<ModuleAddon | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const plans = sortByDisplayOrder(plansQuery.data?.data ?? []);
  const addons = sortByDisplayOrder(addonsQuery.data?.data ?? []);
  const deleting = deletePlanState.isLoading || deleteAddonState.isLoading;

  async function movePlan(index: number, offset: -1 | 1) {
    const reordered = moveItem(plans, index, offset);
    if (!reordered) return;

    try {
      await reorderPlans({ ids: reordered.map((plan) => plan.id) }).unwrap();
      toast.success("Plan order updated");
    } catch {
      toast.error("Could not update plan order");
    }
  }

  async function moveAddon(index: number, offset: -1 | 1) {
    const reordered = moveItem(addons, index, offset);
    if (!reordered) return;

    try {
      await reorderAddons({ ids: reordered.map((addon) => addon.id) }).unwrap();
      toast.success("Add-on order updated");
    } catch {
      toast.error("Could not update add-on order");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.kind === "plan") {
        await deletePlan(deleteTarget.item.id).unwrap();
        toast.success(`${deleteTarget.item.name} deleted`);
      } else {
        await deleteAddon(deleteTarget.item.id).unwrap();
        toast.success(`${deleteTarget.item.name} deleted`);
      }
      setDeleteTarget(null);
    } catch {
      toast.error(`Could not delete ${deleteTarget.kind === "plan" ? "plan" : "add-on"}`);
    }
  }

  return (
    <section className="space-y-5 rounded-xl border bg-slate-50/60 p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <IndianRupee size={19} />
          Public pricing catalog
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Control the plans, add-ons, badges, visibility, and order shown to customers.
        </p>
      </div>

      <CatalogSection
        title="Pricing plans"
        description="Monthly and annual packages shown as cards on the public homepage."
        actionLabel="Create plan"
        onCreate={() => setPlanEditor("new")}
      >
        {plansQuery.isLoading ? (
          <CatalogMessage>Loading pricing plans...</CatalogMessage>
        ) : plansQuery.isError ? (
          <CatalogError onRetry={plansQuery.refetch}>
            Pricing plans could not be loaded.
          </CatalogError>
        ) : plans.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Annual</TableHead>
                <TableHead>What it covers</TableHead>
                <TableHead>Ideal customer</TableHead>
                <TableHead>Allowance</TableHead>
                <TableHead>GST & scale</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan, index) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <OrderControls
                      name={plan.name}
                      index={index}
                      count={plans.length}
                      loading={reorderPlansState.isLoading}
                      onMove={(offset) => void movePlan(index, offset)}
                    />
                  </TableCell>
                  <TableCell className="min-w-52 whitespace-normal">
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-slate-500">{plan.code}</p>
                  </TableCell>
                  <TableCell>{formatCatalogPrice(plan.monthlyPrice, plan.currency, plan.monthlyPriceFrom)}</TableCell>
                  <TableCell>{formatCatalogPrice(plan.annualPrice, plan.currency, plan.annualPriceFrom)}</TableCell>
                  <TableCell className="max-w-64 whitespace-normal text-xs text-slate-600">
                    {plan.includedModules || "—"}
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal text-xs text-slate-600">
                    {plan.idealFor || "—"}
                  </TableCell>
                  <TableCell className="min-w-36 whitespace-normal text-xs">
                    {plan.employeeLimit} employees
                    <br />
                    {plan.userLimit} users
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal text-xs text-slate-600">
                    <p>{plan.gstExtra ? "GST extra" : "GST included"}</p>
                    {plan.higherScaleCopy ? <p className="mt-1">{plan.higherScaleCopy}</p> : null}
                  </TableCell>
                  <TableCell>
                    {plan.badge ? <Badge variant="secondary">{plan.badge}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.active ? "default" : "outline"}>
                      {plan.active ? "Visible" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RowActions
                      name={plan.name}
                      onEdit={() => setPlanEditor(plan)}
                      onDelete={() => setDeleteTarget({ kind: "plan", item: plan })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CatalogMessage>No pricing plans yet. Create one to get started.</CatalogMessage>
        )}
      </CatalogSection>

      <CatalogSection
        title="Module add-ons"
        description="Optional modules customers can add to a package."
        actionLabel="Create add-on"
        onCreate={() => setAddonEditor("new")}
      >
        {addonsQuery.isLoading ? (
          <CatalogMessage>Loading module add-ons...</CatalogMessage>
        ) : addonsQuery.isError ? (
          <CatalogError onRetry={addonsQuery.refetch}>
            Module add-ons could not be loaded.
          </CatalogError>
        ) : addons.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Annual</TableHead>
                <TableHead>Recommended positioning</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addons.map((addon, index) => (
                <TableRow key={addon.id}>
                  <TableCell>
                    <OrderControls
                      name={addon.name}
                      index={index}
                      count={addons.length}
                      loading={reorderAddonsState.isLoading}
                      onMove={(offset) => void moveAddon(index, offset)}
                    />
                  </TableCell>
                  <TableCell className="min-w-48">
                    <p className="font-medium">{addon.name}</p>
                    <p className="text-xs text-slate-500">{addon.code}</p>
                  </TableCell>
                  <TableCell>{formatCatalogPrice(addon.monthlyPrice, addon.currency)}</TableCell>
                  <TableCell>{formatCatalogPrice(addon.annualPrice, addon.currency)}</TableCell>
                  <TableCell className="max-w-72 whitespace-normal text-xs text-slate-600">
                    {addon.positioningText || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={addon.active ? "default" : "outline"}>
                      {addon.active ? "Visible" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RowActions
                      name={addon.name}
                      onEdit={() => setAddonEditor(addon)}
                      onDelete={() => setDeleteTarget({ kind: "addon", item: addon })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CatalogMessage>No module add-ons yet. Create one to get started.</CatalogMessage>
        )}
      </CatalogSection>

      {planEditor !== null ? (
        <PlanEditorDialog
          key={planEditor === "new" ? "new" : planEditor.id}
          open
          plan={planEditor === "new" ? null : planEditor}
          nextDisplayOrder={(plans.at(-1)?.displayOrder ?? 0) + 10}
          saving={createPlanState.isLoading || updatePlanState.isLoading}
          onOpenChange={(open) => {
            if (!open) setPlanEditor(null);
          }}
          onSave={async (body) => {
            try {
              if (planEditor !== "new") {
                await updatePlan({ id: planEditor.id, body }).unwrap();
                toast.success(`${body.name} updated`);
              } else {
                await createPlan(body).unwrap();
                toast.success(`${body.name} created`);
              }
              setPlanEditor(null);
            } catch {
              toast.error(`Could not ${planEditor === "new" ? "create" : "update"} plan`);
            }
          }}
        />
      ) : null}

      {addonEditor !== null ? (
        <AddonEditorDialog
          key={addonEditor === "new" ? "new" : addonEditor.id}
          open
          addon={addonEditor === "new" ? null : addonEditor}
          nextDisplayOrder={(addons.at(-1)?.displayOrder ?? 0) + 10}
          saving={createAddonState.isLoading || updateAddonState.isLoading}
          onOpenChange={(open) => {
            if (!open) setAddonEditor(null);
          }}
          onSave={async (body) => {
            try {
              if (addonEditor !== "new") {
                await updateAddon({ id: addonEditor.id, body }).unwrap();
                toast.success(`${body.name} updated`);
              } else {
                await createAddon(body).unwrap();
                toast.success(`${body.name} created`);
              }
              setAddonEditor(null);
            } catch {
              toast.error(`Could not ${addonEditor === "new" ? "create" : "update"} add-on`);
            }
          }}
        />
      ) : null}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.item.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {deleteTarget?.kind === "plan" ? "plan" : "add-on"}.
              Hide it instead if you may need this configuration later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function CatalogSection({
  title,
  description,
  actionLabel,
  onCreate,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onCreate: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <Button type="button" size="sm" onClick={onCreate}>
          <Plus size={14} />
          {actionLabel}
        </Button>
      </div>
      {children}
    </div>
  );
}

function CatalogMessage({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-sm text-slate-500">{children}</p>;
}

function CatalogError({
  children,
  onRetry,
}: {
  children: React.ReactNode;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 p-6 text-sm text-slate-600">
      <span>{children}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function OrderControls({
  name,
  index,
  count,
  loading,
  onMove,
}: {
  name: string;
  index: number;
  count: number;
  loading: boolean;
  onMove: (offset: -1 | 1) => void;
}) {
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title={`Move ${name} up`}
        disabled={loading || index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={14} />
        <span className="sr-only">Move {name} up</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title={`Move ${name} down`}
        disabled={loading || index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={14} />
        <span className="sr-only">Move {name} down</span>
      </Button>
    </div>
  );
}

function RowActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="icon-sm" title={`Edit ${name}`} onClick={onEdit}>
        <Pencil size={14} />
        <span className="sr-only">Edit {name}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-red-600 hover:text-red-700"
        title={`Delete ${name}`}
        onClick={onDelete}
      >
        <Trash2 size={14} />
        <span className="sr-only">Delete {name}</span>
      </Button>
    </div>
  );
}

type PlanFormState = {
  code: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  monthlyPriceFrom: boolean;
  annualPriceFrom: boolean;
  currency: string;
  gstExtra: boolean;
  employeeLimit: string;
  userLimit: string;
  aiPromptLimit: string;
  aiPromptWindowMinutes: string;
  includedModules: string;
  idealFor: string;
  badge: string;
  higherScaleCopy: string;
  active: boolean;
  displayOrder: string;
};

function PlanEditorDialog({
  open,
  plan,
  nextDisplayOrder,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  plan: PricingPlan | null;
  nextDisplayOrder: number;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (body: PricingPlanRequest) => Promise<void>;
}) {
  const [form, setForm] = useState<PlanFormState>(() => planFormState(plan, nextDisplayOrder));

  function submit() {
    const monthlyPrice = requiredNumber(form.monthlyPrice);
    const annualPrice = requiredNumber(form.annualPrice);
    const employeeLimit = requiredNumber(form.employeeLimit);
    const userLimit = requiredNumber(form.userLimit);
    const displayOrder = requiredNumber(form.displayOrder);
    const hasAiLimit = form.aiPromptLimit.trim() !== "";
    const hasAiWindow = form.aiPromptWindowMinutes.trim() !== "";

    const code = normalizeCode(form.code);

    if (!code || !form.name.trim()) {
      toast.error("Plan code and name are required");
      return;
    }
    if ([monthlyPrice, annualPrice, employeeLimit, userLimit, displayOrder].some((value) => value === null)) {
      toast.error("Enter valid plan prices, allowances, and display order");
      return;
    }
    if (employeeLimit! < 1 || userLimit! < 1) {
      toast.error("Employee and user allowances must be at least 1");
      return;
    }
    if (
      !Number.isInteger(employeeLimit) ||
      !Number.isInteger(userLimit) ||
      !Number.isInteger(displayOrder)
    ) {
      toast.error("Allowances and display order must be whole numbers");
      return;
    }
    if ((hasAiLimit || hasAiWindow) && !(hasAiLimit && hasAiWindow)) {
      toast.error("AI prompt limit and window must both be set or both be blank");
      return;
    }

    const aiPromptLimit = hasAiLimit ? requiredNumber(form.aiPromptLimit) : null;
    const aiPromptWindowMinutes = hasAiWindow
      ? requiredNumber(form.aiPromptWindowMinutes)
      : null;

    if ((hasAiLimit && aiPromptLimit === null) || (hasAiWindow && aiPromptWindowMinutes === null)) {
      toast.error("Enter valid AI quota values");
      return;
    }
    if (
      (aiPromptLimit !== null && !Number.isInteger(aiPromptLimit)) ||
      (aiPromptWindowMinutes !== null && !Number.isInteger(aiPromptWindowMinutes))
    ) {
      toast.error("AI quota values must be whole numbers");
      return;
    }

    void onSave({
      code,
      name: form.name.trim(),
      monthlyPrice: monthlyPrice!,
      annualPrice: annualPrice!,
      monthlyPriceFrom: form.monthlyPriceFrom,
      annualPriceFrom: form.annualPriceFrom,
      currency: form.currency.trim().toUpperCase() || "INR",
      gstExtra: form.gstExtra,
      employeeLimit: employeeLimit!,
      userLimit: userLimit!,
      aiPromptLimit,
      aiPromptWindowMinutes,
      includedModules: form.includedModules.trim(),
      idealFor: form.idealFor.trim(),
      badge: form.badge.trim() || null,
      higherScaleCopy: form.higherScaleCopy.trim(),
      active: form.active,
      displayOrder: displayOrder!,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name}` : "Create pricing plan"}</DialogTitle>
          <DialogDescription>
            Configure the copy and commercial details shown on the public pricing card.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan code">
            <Input
              value={form.code}
              placeholder="OPERATIONS"
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </Field>
          <Field label="Plan name">
            <Input
              value={form.name}
              placeholder="Operations"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <PriceField
            label="Monthly price"
            value={form.monthlyPrice}
            from={form.monthlyPriceFrom}
            onValueChange={(monthlyPrice) => setForm({ ...form, monthlyPrice })}
            onFromChange={(monthlyPriceFrom) => setForm({ ...form, monthlyPriceFrom })}
          />
          <PriceField
            label="Annual price"
            value={form.annualPrice}
            from={form.annualPriceFrom}
            onValueChange={(annualPrice) => setForm({ ...form, annualPrice })}
            onFromChange={(annualPriceFrom) => setForm({ ...form, annualPriceFrom })}
          />
          <Field label="Employee allowance">
            <Input
              type="number"
              min={1}
              value={form.employeeLimit}
              onChange={(event) => setForm({ ...form, employeeLimit: event.target.value })}
            />
          </Field>
          <Field label="User allowance">
            <Input
              type="number"
              min={1}
              value={form.userLimit}
              onChange={(event) => setForm({ ...form, userLimit: event.target.value })}
            />
          </Field>
          <Field label="AI prompts (optional)">
            <Input
              type="number"
              min={0}
              placeholder="Leave both AI fields blank"
              value={form.aiPromptLimit}
              onChange={(event) => setForm({ ...form, aiPromptLimit: event.target.value })}
            />
          </Field>
          <Field label="AI window in minutes (optional)">
            <Input
              type="number"
              min={1}
              placeholder="Leave both AI fields blank"
              value={form.aiPromptWindowMinutes}
              onChange={(event) => setForm({ ...form, aiPromptWindowMinutes: event.target.value })}
            />
          </Field>
          <Field label="Badge">
            <Input
              value={form.badge}
              placeholder="Most Popular"
              onChange={(event) => setForm({ ...form, badge: event.target.value })}
            />
          </Field>
          <Field label="Currency">
            <Input
              value={form.currency}
              placeholder="INR"
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
            />
          </Field>
          <Field label="Ideal customer" className="sm:col-span-2">
            <Textarea
              value={form.idealFor}
              placeholder="Best for growing factories..."
              onChange={(event) => setForm({ ...form, idealFor: event.target.value })}
            />
          </Field>
          <Field label="What it covers" className="sm:col-span-2">
            <Textarea
              value={form.includedModules}
              placeholder="Attendance, Leave, Payroll"
              onChange={(event) => setForm({ ...form, includedModules: event.target.value })}
            />
          </Field>
          <Field label="Higher-scale note" className="sm:col-span-2">
            <Textarea
              value={form.higherScaleCopy}
              placeholder="Contact us for higher employee and user allowances."
              onChange={(event) => setForm({ ...form, higherScaleCopy: event.target.value })}
            />
          </Field>
          <Field label="Display order">
            <Input
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(event) => setForm({ ...form, displayOrder: event.target.value })}
            />
          </Field>
          <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <SwitchField
              label="GST extra"
              checked={form.gstExtra}
              onCheckedChange={(gstExtra) => setForm({ ...form, gstExtra })}
            />
            <SwitchField
              label="Visible"
              checked={form.active}
              onCheckedChange={(active) => setForm({ ...form, active })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Saving..." : plan ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AddonFormState = {
  code: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  currency: string;
  gstExtra: boolean;
  positioningText: string;
  active: boolean;
  displayOrder: string;
};

function AddonEditorDialog({
  open,
  addon,
  nextDisplayOrder,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  addon: ModuleAddon | null;
  nextDisplayOrder: number;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (body: ModuleAddonRequest) => Promise<void>;
}) {
  const [form, setForm] = useState<AddonFormState>(() => addonFormState(addon, nextDisplayOrder));

  function submit() {
    const monthlyPrice = requiredNumber(form.monthlyPrice);
    const annualPrice = requiredNumber(form.annualPrice);
    const displayOrder = requiredNumber(form.displayOrder);

    const code = normalizeCode(form.code);

    if (!code || !form.name.trim()) {
      toast.error("Add-on code and name are required");
      return;
    }
    if (monthlyPrice === null || annualPrice === null || displayOrder === null) {
      toast.error("Enter valid add-on prices and display order");
      return;
    }
    if (!Number.isInteger(displayOrder)) {
      toast.error("Display order must be a whole number");
      return;
    }

    void onSave({
      code,
      name: form.name.trim(),
      monthlyPrice,
      annualPrice,
      currency: form.currency.trim().toUpperCase() || "INR",
      gstExtra: form.gstExtra,
      positioningText: form.positioningText.trim(),
      active: form.active,
      displayOrder,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{addon ? `Edit ${addon.name}` : "Create module add-on"}</DialogTitle>
          <DialogDescription>
            Configure optional module pricing and the recommendation shown publicly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Module code">
            <Input
              value={form.code}
              placeholder="PRODUCTION_TRACKING"
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </Field>
          <Field label="Module name">
            <Input
              value={form.name}
              placeholder="Production Tracking"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Monthly add-on">
            <Input
              type="number"
              min={0}
              value={form.monthlyPrice}
              onChange={(event) => setForm({ ...form, monthlyPrice: event.target.value })}
            />
          </Field>
          <Field label="Annual add-on">
            <Input
              type="number"
              min={0}
              value={form.annualPrice}
              onChange={(event) => setForm({ ...form, annualPrice: event.target.value })}
            />
          </Field>
          <Field label="Currency">
            <Input
              value={form.currency}
              placeholder="INR"
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
            />
          </Field>
          <Field label="Display order">
            <Input
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(event) => setForm({ ...form, displayOrder: event.target.value })}
            />
          </Field>
          <Field label="Recommended positioning" className="sm:col-span-2">
            <Textarea
              value={form.positioningText}
              placeholder="Recommended for teams that..."
              onChange={(event) => setForm({ ...form, positioningText: event.target.value })}
            />
          </Field>
          <div className="grid gap-3 rounded-lg border p-3 sm:col-span-2 sm:grid-cols-2">
            <SwitchField
              label="GST extra"
              checked={form.gstExtra}
              onCheckedChange={(gstExtra) => setForm({ ...form, gstExtra })}
            />
            <SwitchField
              label="Visible"
              checked={form.active}
              onCheckedChange={(active) => setForm({ ...form, active })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={submit}>
            {saving ? "Saving..." : addon ? "Save changes" : "Create add-on"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`space-y-1.5 text-xs font-medium text-slate-600 ${className ?? ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function PriceField({
  label,
  value,
  from,
  onValueChange,
  onFromChange,
}: {
  label: string;
  value: string;
  from: boolean;
  onValueChange: (value: string) => void;
  onFromChange: (value: boolean) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <label className="flex shrink-0 items-center gap-2 font-normal">
          <Switch checked={from} onCheckedChange={onFromChange} />
          From
        </label>
      </div>
    </Field>
  );
}

function SwitchField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-medium">
      {label}
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function planFormState(plan: PricingPlan | null, displayOrder: number): PlanFormState {
  return {
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    monthlyPrice: String(plan?.monthlyPrice ?? 0),
    annualPrice: String(plan?.annualPrice ?? 0),
    monthlyPriceFrom: plan?.monthlyPriceFrom ?? false,
    annualPriceFrom: plan?.annualPriceFrom ?? false,
    currency: plan?.currency ?? "INR",
    gstExtra: plan?.gstExtra ?? true,
    employeeLimit: String(plan?.employeeLimit ?? 1),
    userLimit: String(plan?.userLimit ?? 1),
    aiPromptLimit: plan?.aiPromptLimit == null ? "" : String(plan.aiPromptLimit),
    aiPromptWindowMinutes:
      plan?.aiPromptWindowMinutes == null ? "" : String(plan.aiPromptWindowMinutes),
    includedModules: plan?.includedModules ?? "",
    idealFor: plan?.idealFor ?? "",
    badge: plan?.badge ?? "",
    higherScaleCopy: plan?.higherScaleCopy ?? "",
    active: plan?.active ?? true,
    displayOrder: String(plan?.displayOrder ?? displayOrder),
  };
}

function addonFormState(addon: ModuleAddon | null, displayOrder: number): AddonFormState {
  return {
    code: addon?.code ?? "",
    name: addon?.name ?? "",
    monthlyPrice: String(addon?.monthlyPrice ?? 0),
    annualPrice: String(addon?.annualPrice ?? 0),
    currency: addon?.currency ?? "INR",
    gstExtra: addon?.gstExtra ?? true,
    positioningText: addon?.positioningText ?? "",
    active: addon?.active ?? true,
    displayOrder: String(addon?.displayOrder ?? displayOrder),
  };
}

function requiredNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function sortByDisplayOrder<T extends { displayOrder: number }>(items: T[]) {
  return [...items].sort((first, second) => first.displayOrder - second.displayOrder);
}

function moveItem<T>(items: T[], index: number, offset: -1 | 1) {
  const destination = index + offset;
  if (destination < 0 || destination >= items.length) return null;

  const reordered = [...items];
  [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
  return reordered;
}

function formatCatalogPrice(price: number, currency: string, from = false) {
  const currencyCode = /^[A-Z]{3}$/.test(currency) ? currency : "INR";
  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(Number(price));

  return `${from ? "From " : ""}${amount}`;
}
