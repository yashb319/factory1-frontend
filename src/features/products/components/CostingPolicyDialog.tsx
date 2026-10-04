"use client";

import { useEffect, useId, useState } from "react";
import { CircleAlert, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CostingPolicyDraft,
  CostingPolicyOptions,
  CostingPolicyView,
  CostingSelectOption,
  MaterialRateDraft,
} from "../types/costing.types";
import { formatCostingDate } from "../utils/costingPresentation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: CostingPolicyView | null;
  options: CostingPolicyOptions;
  materialItems: CostingSelectOption[];
  loading: boolean;
  saving: boolean;
  publishing: boolean;
  creatingVersion: boolean;
  loadError?: string | null;
  actionError?: string | null;
  onRetry: () => void;
  onSave: (draft: CostingPolicyDraft) => Promise<void>;
  onPublish: (draft: CostingPolicyDraft) => Promise<void>;
  onCreateVersion: () => Promise<void>;
};

const EMPTY_DRAFT: CostingPolicyDraft = {
  name: "Default product costing policy",
  currency: "INR",
  materialValuation: "LATEST_POSTED_PURCHASE",
  sellingPriceBasis: "LATEST_POSTED_SALE",
  pinnedBomId: "",
  outputQuantity: "1",
  labourMode: "EXCLUDED",
  labourAmount: "",
  overheadMode: "EXCLUDED",
  overheadAmount: "",
  miscMode: "EXCLUDED",
  miscAmount: "",
  materialRates: [],
};

export function CostingPolicyDialog({
  open,
  onOpenChange,
  policy,
  options,
  materialItems,
  loading,
  saving,
  publishing,
  creatingVersion,
  loadError,
  actionError,
  onRetry,
  onSave,
  onPublish,
  onCreateVersion,
}: Props) {
  const formId = useId();
  const [draft, setDraft] = useState<CostingPolicyDraft>(EMPTY_DRAFT);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setDraft(policy?.draft ?? EMPTY_DRAFT);
      setValidationError(null);
    });
  }, [open, policy]);

  const pending = saving || publishing || creatingVersion;
  const editable = !policy || policy.status === "DRAFT";

  async function submit(action: "save" | "publish") {
    const message = validatePolicy(draft);
    setValidationError(message);
    if (message) return;

    if (action === "publish") {
      await onPublish(draft);
    } else {
      await onSave(draft);
    }
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="max-h-[92vh] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Product costing policy</DialogTitle>
          <DialogDescription>
            Configure explicit evidence and allocation assumptions. Published
            versions are immutable; create a new version to make changes.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p role="status" className="py-8 text-center text-muted-foreground">
            Loading costing policy...
          </p>
        ) : loadError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-900">
              Costing policies could not be loaded
            </p>
            <p className="mt-1 text-sm text-red-800">{loadError}</p>
            <Button className="mt-3" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : (
          <fieldset disabled={!editable || pending} className="space-y-5 disabled:opacity-75">
            {policy ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border px-2 py-1 font-medium text-foreground">
                  {policy.status}
                </span>
                {policy.version ? <span>Policy version {policy.version}</span> : null}
                {policy.publishedAt ? (
                  <span>Published {formatCostingDate(policy.publishedAt)}</span>
                ) : null}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No costing policy exists yet. Saving creates version 1 as a draft.
              </p>
            )}

            <div
              role="note"
              className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p>
                  Labour is an explicit allocation assumption, not a timesheet.
                  Assignment duration is never treated as worked time.
                </p>
                <p>
                  Mutable inventory and catalog prices are estimates. Frozen
                  snapshots preserve the exact evidence used.
                </p>
              </div>
            </div>

            <section aria-labelledby={`${formId}-general`} className="space-y-3">
              <h3 id={`${formId}-general`} className="font-semibold">
                Policy basis
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <LabeledInput
                  id={`${formId}-name`}
                  label="Policy name"
                  value={draft.name}
                  onChange={(name) => setDraft((current) => ({ ...current, name }))}
                />
                <LabeledInput
                  id={`${formId}-currency`}
                  label="Currency (3-letter code)"
                  value={draft.currency}
                  maxLength={3}
                  onChange={(currency) =>
                    setDraft((current) => ({ ...current, currency: currency.toUpperCase() }))
                  }
                />
                <SelectControl
                  id={`${formId}-material`}
                  label="Material valuation"
                  value={draft.materialValuation}
                  options={options.materialValuations}
                  onChange={(materialValuation) =>
                    setDraft((current) => ({ ...current, materialValuation }))
                  }
                />
                <SelectControl
                  id={`${formId}-selling`}
                  label="Selling-price basis"
                  value={draft.sellingPriceBasis}
                  options={options.sellingPriceBases}
                  onChange={(sellingPriceBasis) =>
                    setDraft((current) => ({ ...current, sellingPriceBasis }))
                  }
                />
                <LabeledInput
                  id={`${formId}-quantity`}
                  label="Costing output quantity"
                  value={draft.outputQuantity}
                  inputMode="decimal"
                  onChange={(outputQuantity) =>
                    setDraft((current) => ({ ...current, outputQuantity }))
                  }
                />
                <LabeledInput
                  id={`${formId}-bom`}
                  label="Pinned published BOM ID (optional)"
                  value={draft.pinnedBomId}
                  onChange={(pinnedBomId) =>
                    setDraft((current) => ({ ...current, pinnedBomId }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave BOM ID empty to use the latest active published production
                BOM. Legacy product BOMs are never mixed into costing.
              </p>
            </section>

            <section aria-labelledby={`${formId}-allocations`} className="space-y-3">
              <h3 id={`${formId}-allocations`} className="font-semibold">
                Labour, overhead, and miscellaneous pools
              </h3>
              <p className="text-xs text-muted-foreground">
                Each pool uses an explicit per-output or total allocation driver.
                Excluded components remain unavailable, not zero.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <AllocationControl
                  id={`${formId}-labour`}
                  label="Labour"
                  mode={draft.labourMode}
                  amount={draft.labourAmount}
                  options={options.allocationModes}
                  onChange={(labourMode, labourAmount) =>
                    setDraft((current) => ({
                      ...current,
                      labourMode,
                      labourAmount,
                    }))
                  }
                />
                <AllocationControl
                  id={`${formId}-overhead`}
                  label="Overhead"
                  mode={draft.overheadMode}
                  amount={draft.overheadAmount}
                  options={options.allocationModes}
                  onChange={(overheadMode, overheadAmount) =>
                    setDraft((current) => ({
                      ...current,
                      overheadMode,
                      overheadAmount,
                    }))
                  }
                />
                <AllocationControl
                  id={`${formId}-misc`}
                  label="Miscellaneous"
                  mode={draft.miscMode}
                  amount={draft.miscAmount}
                  options={options.allocationModes}
                  onChange={(miscMode, miscAmount) =>
                    setDraft((current) => ({
                      ...current,
                      miscMode,
                      miscAmount,
                    }))
                  }
                />
              </div>
            </section>

            {draft.materialValuation === "MANUAL_STANDARD" ? (
              <MaterialRatesEditor
                id={`${formId}-rates`}
                rates={draft.materialRates}
                itemOptions={materialItems}
                defaultCurrency={draft.currency}
                onChange={(materialRates) =>
                  setDraft((current) => ({ ...current, materialRates }))
                }
              />
            ) : null}

            {policy ? (
              <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                Tax basis: {policy.taxBasis || "Not available"} · Discount basis:{" "}
                {policy.discountBasis || "Not available"} · Returns basis:{" "}
                {policy.returnsBasis || "Not available"}
              </div>
            ) : null}

            {validationError ? (
              <p role="alert" className="text-sm text-red-700">
                {validationError}
              </p>
            ) : null}
            {actionError ? (
              <p role="alert" className="text-sm text-red-700">
                {actionError}
              </p>
            ) : null}
          </fieldset>
        )}

        {!loading && !loadError ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Close
            </Button>
            {editable ? (
              <>
                <Button variant="outline" onClick={() => void submit("save")} disabled={pending}>
                  {saving ? "Saving draft..." : "Save draft"}
                </Button>
                <Button
                  onClick={() => void submit("publish")}
                  disabled={pending || !policy}
                >
                  {publishing ? "Publishing..." : "Publish policy"}
                </Button>
              </>
            ) : (
              <Button onClick={() => void onCreateVersion()} disabled={pending}>
                {creatingVersion ? "Creating version..." : "Create editable version"}
              </Button>
            )}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SelectControl({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: CostingSelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {options.find((option) => option.value === value)?.description ? (
        <p className="text-xs text-muted-foreground">
          {options.find((option) => option.value === value)?.description}
        </p>
      ) : null}
    </div>
  );
}

function LabeledInput({
  id,
  label,
  value,
  inputMode,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  inputMode?: "decimal";
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function AllocationControl({
  id,
  label,
  mode,
  amount,
  options,
  onChange,
}: {
  id: string;
  label: string;
  mode: string;
  amount: string;
  options: CostingSelectOption[];
  onChange: (mode: string, amount: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <SelectControl
        id={`${id}-mode`}
        label={`${label} allocation`}
        value={mode}
        options={options}
        onChange={(nextMode) => onChange(nextMode, nextMode === "EXCLUDED" ? "" : amount)}
      />
      {mode !== "EXCLUDED" ? (
        <LabeledInput
          id={`${id}-amount`}
          label={`${label} amount`}
          value={amount}
          inputMode="decimal"
          onChange={(nextAmount) => onChange(mode, nextAmount)}
        />
      ) : null}
    </div>
  );
}

function MaterialRatesEditor({
  id,
  rates,
  itemOptions,
  defaultCurrency,
  onChange,
}: {
  id: string;
  rates: MaterialRateDraft[];
  itemOptions: CostingSelectOption[];
  defaultCurrency: string;
  onChange: (rates: MaterialRateDraft[]) => void;
}) {
  function update(index: number, patch: Partial<MaterialRateDraft>) {
    onChange(rates.map((rate, rateIndex) => rateIndex === index ? { ...rate, ...patch } : rate));
  }

  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={id} className="font-semibold">Manual standard material rates</h3>
          <p className="text-xs text-muted-foreground">
            Add a published rate, unit, and currency for each BOM material.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...rates,
              {
                clientId: `rate-${Date.now()}`,
                inventoryItemId: "",
                rate: "",
                unit: "",
                currency: defaultCurrency,
              },
            ])
          }
        >
          <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
          Add material rate
        </Button>
      </div>

      {rates.map((rate, index) => (
        <div key={rate.clientId} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
          <SelectControl
            id={`${id}-${index}-item`}
            label="Inventory material"
            value={rate.inventoryItemId}
            options={itemOptions}
            onChange={(inventoryItemId) => update(index, { inventoryItemId })}
          />
          <LabeledInput
            id={`${id}-${index}-rate`}
            label="Standard rate"
            value={rate.rate}
            inputMode="decimal"
            onChange={(nextRate) => update(index, { rate: nextRate })}
          />
          <LabeledInput
            id={`${id}-${index}-unit`}
            label="Unit"
            value={rate.unit}
            onChange={(unit) => update(index, { unit })}
          />
          <LabeledInput
            id={`${id}-${index}-currency`}
            label="Currency"
            value={rate.currency}
            maxLength={3}
            onChange={(currency) => update(index, { currency: currency.toUpperCase() })}
          />
          <div className="md:col-span-4 md:text-right">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(rates.filter((_, rateIndex) => rateIndex !== index))}
            >
              <Trash2 aria-hidden="true" className="mr-1 h-4 w-4" />
              Remove rate
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}

function validatePolicy(draft: CostingPolicyDraft) {
  if (!draft.name.trim()) return "Enter a policy name.";
  if (!/^[A-Za-z]{3}$/.test(draft.currency)) return "Enter a 3-letter currency code.";
  if (!isPositiveDecimal(draft.outputQuantity)) return "Output quantity must be positive.";

  for (const [label, mode, amount] of [
    ["Labour", draft.labourMode, draft.labourAmount],
    ["Overhead", draft.overheadMode, draft.overheadAmount],
    ["Miscellaneous", draft.miscMode, draft.miscAmount],
  ]) {
    if (mode !== "EXCLUDED" && !isNonNegativeDecimal(amount)) {
      return `${label} amount must be a valid non-negative number.`;
    }
  }

  if (
    draft.materialValuation === "MANUAL_STANDARD" &&
    draft.materialRates.length === 0
  ) {
    return "Manual standard valuation requires at least one material rate.";
  }

  const invalidRate = draft.materialRates.some(
    (rate) =>
      !rate.inventoryItemId ||
      !isNonNegativeDecimal(rate.rate) ||
      !rate.unit.trim() ||
      !/^[A-Za-z]{3}$/.test(rate.currency)
  );
  return invalidRate
    ? "Each material rate needs an inventory item, non-negative rate, unit, and 3-letter currency."
    : null;
}

function isNonNegativeDecimal(value: string) {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
}

function isPositiveDecimal(value: string) {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
}
