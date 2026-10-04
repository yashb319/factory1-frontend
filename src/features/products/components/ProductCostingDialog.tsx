"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CircleAlert, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CostingComponent,
  ProductCostingView,
} from "../types/costing.types";
import {
  costingStatusDescription,
  formatCostingAmount,
  formatCostingDate,
} from "../utils/costingPresentation";
import { CostingStatusBadge } from "./CostingStatusBadge";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProductCostingView | null;
  loading: boolean;
  refreshing: boolean;
  freezing: boolean;
  loadError?: string | null;
  actionError?: string | null;
  onRetry: () => void;
  onFreeze: () => Promise<boolean>;
};

export function ProductCostingDialog({
  open,
  onOpenChange,
  data,
  loading,
  refreshing,
  freezing,
  loadError,
  actionError,
  onRetry,
  onFreeze,
}: Props) {
  const [confirmFreeze, setConfirmFreeze] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={freezing ? undefined : onOpenChange}>
        <DialogContent className="max-h-[92vh] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Costing{data ? ` for ${data.productCode} - ${data.productName}` : ""}
            </DialogTitle>
            <DialogDescription>
              Server-generated preview, completeness, source evidence, and immutable
              snapshot details. The browser does not calculate cost or margin.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p role="status" className="py-10 text-center text-muted-foreground">
              Loading costing evidence...
            </p>
          ) : loadError ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-medium text-red-900">Costing could not be loaded</p>
              <p className="mt-1 text-sm text-red-800">{loadError}</p>
              <Button className="mt-3" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : !data ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">No costing preview is available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure and publish a costing policy, then resolve the required
                product inputs.
              </p>
              <Button className="mt-4" variant="outline" onClick={onRetry}>
                Refresh
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-lg border p-4" aria-labelledby="costing-result-status">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 id="costing-result-status" className="font-semibold">
                        Costing preview
                      </h3>
                      <CostingStatusBadge status={data.completeness} />
                      {refreshing ? <span role="status">Refreshing...</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {costingStatusDescription(data.completeness)}
                    </p>
                  </div>
                  <Button
                    disabled={!data.canFreeze || data.completeness === "BLOCKED" || freezing}
                    onClick={() => setConfirmFreeze(true)}
                  >
                    <Snowflake aria-hidden="true" className="mr-2 h-4 w-4" />
                    {freezing ? "Publishing snapshot..." : "Freeze and publish snapshot"}
                  </Button>
                </div>

                {data.completeness !== "COMPLETE" ? (
                  <div
                    role="note"
                    className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
                  >
                    <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      {data.completeness === "BLOCKED"
                        ? "No authoritative cost is available while this result is blocked."
                        : "Displayed values are estimates from the server and must not be treated as true cost."}
                    </p>
                  </div>
                ) : null}
                {actionError ? (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {actionError}
                  </p>
                ) : null}
              </section>

              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="As of" value={formatCostingDate(data.asOf)} />
                <Detail label="Basis" value={data.basis || "Not available"} />
                <Detail label="Source quality" value={data.sourceQuality || "Not available"} />
                <Detail
                  label="Quantity"
                  value={
                    data.quantity === null || data.quantity === undefined
                      ? "Not available"
                      : `${data.quantity}${data.unit ? ` ${data.unit}` : ""}`
                  }
                />
              </dl>

              {data.missingInputs.length ? (
                <section aria-labelledby="missing-costing-inputs" className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h3 id="missing-costing-inputs" className="font-semibold text-red-900">
                    Missing inputs
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-900">
                    {data.missingInputs.map((input) => (
                      <li key={input}>{input}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {data.warnings.length ? (
                <section
                  aria-labelledby="costing-warnings"
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                >
                  <h3 id="costing-warnings" className="font-semibold text-amber-950">
                    Evidence warnings
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                    {data.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section aria-labelledby="cost-breakdown" className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 id="cost-breakdown" className="font-semibold">
                      Cost component breakdown
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Missing amounts remain unavailable; they are never shown as zero.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-6 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Server-reported total cost</p>
                      <p className="font-semibold">
                        {formatCostingAmount(data.totalCost, "perUnit")} per unit
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCostingAmount(data.totalCost, "total")} total
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Server-reported selling / revenue evidence
                      </p>
                      <p className="font-semibold">
                        {formatCostingAmount(data.sellingPrice, "perUnit")} per unit
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCostingAmount(data.sellingPrice, "total")} total
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="responsive-table w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left">Component</th>
                        <th className="p-3 text-left">Completeness</th>
                        <th className="p-3 text-right">Per unit</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-left">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.components.map((component) => (
                        <ComponentRow key={component.key} component={component} />
                      ))}
                      {!data.components.length ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground">
                            No cost components were returned.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section aria-labelledby="costing-versions" className="space-y-2">
                <h3 id="costing-versions" className="font-semibold">
                  Reproducibility and versions
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Policy version" value={data.policyVersion || "Not available"} />
                  <Detail label="BOM version" value={data.bomVersion || "Not available"} />
                  <Detail label="Snapshot version" value={data.snapshotVersion || "Not available"} />
                  <Detail label="Engine version" value={data.engineVersion || "Not available"} />
                </dl>
                {data.immutableSnapshotId ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="break-all">Immutable snapshot: {data.immutableSnapshotId}</p>
                    <p>Frozen at: {formatCostingDate(data.frozenAt)}</p>
                    {data.inputHash ? <p className="break-all">Input hash: {data.inputHash}</p> : null}
                    {data.supersedesSnapshotId ? (
                      <p className="break-all">Supersedes: {data.supersedesSnapshotId}</p>
                    ) : null}
                    {data.bomId ? (
                      <p className="break-all text-xs text-muted-foreground">
                        Canonical BOM: {data.bomId}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {data.sourceLabels.length ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Source labels</p>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {data.sourceLabels.map((source) => (
                        <li key={source} className="rounded-full border px-2 py-1 text-xs">
                          {source}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmFreeze} onOpenChange={setConfirmFreeze}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Freeze and publish this costing snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              The server will create an immutable record from the current policy,
              BOM, source evidence, and engine versions. Later catalog or policy
              changes will not change that snapshot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={freezing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={freezing}
              onClick={(event) => {
                event.preventDefault();
                void onFreeze().then((published) => {
                  if (published) setConfirmFreeze(false);
                });
              }}
            >
              {freezing ? "Publishing..." : "Freeze and publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ComponentRow({ component }: { component: CostingComponent }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `costing-evidence-${component.key.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <>
      <tr className="border-t">
        <td className="p-3" data-label="Component">
          <p className="font-medium">{component.label}</p>
          {component.explanation ? (
            <p className="mt-1 text-xs text-muted-foreground">{component.explanation}</p>
          ) : null}
        </td>
        <td className="p-3" data-label="Completeness">
          <CostingStatusBadge status={component.completeness} />
        </td>
        <td className="p-3 text-right" data-label="Per unit">
          {formatCostingAmount(component.amount, "perUnit")}
        </td>
        <td className="p-3 text-right" data-label="Total">
          {formatCostingAmount(component.amount, "total")}
        </td>
        <td className="p-3" data-label="Evidence">
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? (
              <ChevronDown aria-hidden="true" className="mr-1 h-4 w-4" />
            ) : (
              <ChevronRight aria-hidden="true" className="mr-1 h-4 w-4" />
            )}
            {component.evidence.length} source{component.evidence.length === 1 ? "" : "s"}
          </Button>
        </td>
      </tr>
      {expanded ? (
        <tr id={detailsId} className="border-t bg-muted/30">
          <td colSpan={5} className="p-3">
            {component.evidence.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {component.evidence.map((evidence) => (
                  <li key={evidence.id} className="rounded-md border bg-background p-3">
                    <p className="font-medium">{evidence.label}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <Detail label="Source" value={evidence.sourceType} />
                      <Detail label="Reference" value={evidence.sourceReference || "Not available"} />
                      <Detail label="Quality" value={evidence.quality || "Not available"} />
                      <Detail label="As of" value={formatCostingDate(evidence.asOf)} />
                      <Detail label="Basis" value={evidence.basis || "Not available"} />
                      <Detail
                        label="Amount"
                        value={formatCostingAmount(evidence.amount, "total")}
                      />
                    </dl>
                    {evidence.notes ? (
                      <p className="mt-2 text-xs text-muted-foreground">{evidence.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No source evidence was returned for this component.
              </p>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{value}</dd>
    </div>
  );
}
