"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductProfitabilityDetail } from "../types/profitability.types";
import type { CostingPolicyView } from "../types/costing.types";
import type { ProfitSimulatorDraft } from "../types/profitSimulator.types";
import { getErrorMessage } from "@/lib/apiError";
import {
  toProfitSimulationRequest,
  toProfitSimulatorBaselines,
} from "../api/profitSimulatorAdapters";
import { useSimulateProductProfitMutation } from "../api/profitSimulatorApi";
import {
  formatProfitabilityDate,
  formatProfitabilityMoney,
  formatProfitabilityPercent,
} from "../utils/profitabilityPresentation";
import { ProfitabilityHealthBadge } from "./ProfitabilityHealthBadge";
import { ProfitabilityTrendChart } from "./ProfitabilityTrendChart";
import { ProfitSimulatorWorkspace } from "./ProfitSimulatorWorkspace";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: ProductProfitabilityDetail | null;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  onConfigureCosting: () => void;
  costingPolicy?: CostingPolicyView | null;
};

export function ProductProfitabilityDetailDialog({
  open,
  onOpenChange,
  detail,
  loading,
  error,
  onRetry,
  onConfigureCosting,
  costingPolicy,
}: Props) {
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const baselines = useMemo(
    () => (detail ? toProfitSimulatorBaselines(detail, costingPolicy) : []),
    [costingPolicy, detail]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSimulatorOpen(false);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {detail
              ? `${detail.productCode} - ${detail.productName} profitability`
              : "Product profitability intelligence"}
          </DialogTitle>
          <DialogDescription>
            Server-attributed revenue and gross profit against the immutable
            cost snapshot used for each period. This is not company net profit.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p role="status" className="py-10 text-center text-muted-foreground">
            Loading profitability evidence...
          </p>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-900">
              Profitability intelligence could not be loaded
            </p>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <Button className="mt-3" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : !detail ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">No profitability detail is available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The server did not return a defensible profitability record.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-lg border p-4" aria-labelledby="profitability-summary">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="profitability-summary" className="font-semibold">
                      Gross profitability summary
                    </h3>
                    <ProfitabilityHealthBadge health={detail.health} />
                    <span className="rounded-full border px-2 py-1 text-xs font-medium">
                      {detail.completeness.toLowerCase()} evidence
                    </span>
                  </div>
                  {detail.reasons.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {detail.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {(detail.health === "INCOMPLETE" ||
                  detail.health === "UNKNOWN") ? (
                  <Button variant="outline" onClick={onConfigureCosting}>
                    Resolve costing inputs
                  </Button>
                ) : null}
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Detail
                  label="Attributed revenue"
                  value={formatProfitabilityMoney(detail.attributedRevenue)}
                />
                <Detail
                  label="Realized unit price"
                  value={formatProfitabilityMoney(
                    detail.realizedUnitSellingPrice
                  )}
                />
                <Detail
                  label="Frozen unit cost"
                  value={formatProfitabilityMoney(detail.frozenUnitCost)}
                />
                <Detail
                  label="Gross profit"
                  value={formatProfitabilityMoney(detail.grossProfit)}
                />
                <Detail
                  label="Gross margin"
                  value={formatProfitabilityPercent(detail.marginPercent)}
                />
              </dl>
              <div className="mt-4">
                <Button
                  variant={simulatorOpen ? "secondary" : "outline"}
                  onClick={() => {
                    setSimulatorOpen((current) => !current);
                  }}
                >
                  {simulatorOpen
                    ? "Close Profit Simulator"
                    : "Open Profit Simulator"}
                </Button>
              </div>
            </section>

            {simulatorOpen ? (
              <ConnectedProfitSimulator
                productId={detail.productId}
                baselines={baselines}
              />
            ) : null}

            {detail.warnings.length ? (
              <section
                aria-labelledby="profitability-warnings"
                className="rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <h3 id="profitability-warnings" className="font-semibold text-amber-950">
                  Data-quality warnings
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                  {detail.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section
              aria-labelledby="profitability-coverage"
              className="rounded-lg border p-4"
            >
              <h3 id="profitability-coverage" className="font-semibold">
                Sales allocation coverage
              </h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <Detail
                  label="Allocated sales coverage"
                  value={formatProfitabilityPercent(
                    detail.coverage.allocatedSalesPercent
                  )}
                />
                <Detail
                  label="Allocated revenue"
                  value={formatProfitabilityMoney(
                    detail.coverage.allocatedRevenue
                  )}
                />
                <Detail
                  label="Explicitly unallocated revenue"
                  value={formatProfitabilityMoney(
                    detail.coverage.unallocatedRevenue
                  )}
                />
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">
                {detail.coverage.reason ??
                  "The server did not provide an allocation coverage explanation."}
              </p>
            </section>

            <section aria-labelledby="profitability-components" className="space-y-2">
              <h3 id="profitability-components" className="font-semibold">
                Frozen cost component breakdown
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="responsive-table w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left" scope="col">
                        Component
                      </th>
                      <th className="p-3 text-right" scope="col">
                        Per unit
                      </th>
                      <th className="p-3 text-right" scope="col">
                        Total
                      </th>
                      <th className="p-3 text-left" scope="col">
                        Provenance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.components.map((component) => (
                      <tr key={component.key} className="border-t">
                        <th className="p-3 text-left" scope="row">
                          {component.label}
                        </th>
                        <td className="p-3 text-right" data-label="Per unit">
                          {formatProfitabilityMoney(component.perUnit)}
                        </td>
                        <td className="p-3 text-right" data-label="Total">
                          {formatProfitabilityMoney(component.amount)}
                        </td>
                        <td className="p-3" data-label="Provenance">
                          <p>{component.sourceLabel || "Not available"}</p>
                          <p className="text-xs text-muted-foreground">
                            {component.sourceReference || "Reference unavailable"} ·{" "}
                            {formatProfitabilityDate(component.asOf)}
                          </p>
                        </td>
                      </tr>
                    ))}
                    {!detail.components.length ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground">
                          No cost component evidence was returned.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="profitability-evidence" className="space-y-2">
              <h3 id="profitability-evidence" className="font-semibold">
                Revenue and allocation evidence
              </h3>
              {detail.evidence.length ? (
                <ul className="grid gap-3 md:grid-cols-2">
                  {detail.evidence.map((evidence) => (
                    <li key={evidence.id} className="rounded-lg border p-3">
                      <p className="font-medium">{evidence.label}</p>
                      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        <Detail label="Source" value={evidence.sourceType} />
                        <Detail
                          label="Reference"
                          value={evidence.sourceReference || "Not available"}
                        />
                        <Detail
                          label="As of"
                          value={formatProfitabilityDate(evidence.asOf)}
                        />
                        <Detail
                          label="Quality"
                          value={evidence.quality || "Not available"}
                        />
                      </dl>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No source evidence was returned.
                </p>
              )}
            </section>

            <section
              aria-labelledby="profitability-basis"
              className="rounded-lg border p-4"
            >
              <h3 id="profitability-basis" className="font-semibold">
                Calculation basis
              </h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <Detail
                  label="Revenue basis"
                  value={detail.metadata.revenueBasis || "Not available"}
                />
                <Detail
                  label="Cost basis"
                  value={detail.metadata.costBasis || "Not available"}
                />
                <Detail
                  label="Date boundary"
                  value={detail.metadata.dateBoundary || "Not available"}
                />
              </dl>
            </section>

            <section aria-labelledby="profitability-snapshots" className="space-y-2">
              <h3 id="profitability-snapshots" className="font-semibold">
                Immutable snapshot history
              </h3>
              <p className="text-sm text-muted-foreground">
                Each historical period retains its own cost snapshot reference;
                current costs are not substituted into old periods.
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="responsive-table w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left" scope="col">
                        Period
                      </th>
                      <th className="p-3 text-left" scope="col">
                        Cost snapshot used
                      </th>
                      <th className="p-3 text-left" scope="col">
                        Snapshot as of
                      </th>
                      <th className="p-3 text-left" scope="col">
                        Freshness
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.snapshotHistory.map((entry) => (
                      <tr key={`${entry.asOf}:${entry.id}`} className="border-t">
                        <th className="p-3 text-left" scope="row">
                          {formatProfitabilityDate(entry.asOf)}
                        </th>
                        <td className="p-3" data-label="Cost snapshot used">
                          <p className="break-all">
                            {entry.costingSnapshotId || "Not available"}
                          </p>
                          {entry.current ? (
                            <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-1 text-xs">
                              Current detail snapshot
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3" data-label="Snapshot as of">
                          {formatProfitabilityDate(entry.costingSnapshotAsOf)}
                        </td>
                        <td className="p-3" data-label="Freshness">
                          {entry.freshness
                            ? entry.freshness.toLowerCase()
                            : "Not available"}
                        </td>
                      </tr>
                    ))}
                    {!detail.snapshotHistory.length ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground">
                          No immutable snapshot history was returned.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="profitability-trends" className="space-y-2">
              <h3 id="profitability-trends" className="font-semibold">
                Historical gross profitability
              </h3>
              <ProfitabilityTrendChart trends={detail.trends} />
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConnectedProfitSimulator({
  productId,
  baselines,
}: {
  productId: string;
  baselines: ReturnType<typeof toProfitSimulatorBaselines>;
}) {
  const [requestError, setRequestError] = useState<string | null>(null);
  const lastDraft = useRef<ProfitSimulatorDraft | null>(null);
  const [simulate, simulation] = useSimulateProductProfitMutation();

  const calculate = (draft: ProfitSimulatorDraft) => {
    const baseline = baselines.find(
      (entry) => entry.snapshot.id === draft.snapshotId
    );
    if (!baseline) {
      setRequestError("The selected immutable baseline is no longer available.");
      return;
    }
    setRequestError(null);
    lastDraft.current = draft;
    try {
      const request = toProfitSimulationRequest(productId, draft, baseline);
      void simulate(request).unwrap().catch(() => undefined);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "The simulator assumptions are invalid."
      );
    }
  };

  return (
    <ProfitSimulatorWorkspace
      baselines={baselines}
      result={simulation.data}
      loading={simulation.isLoading}
      error={
        requestError ??
        (simulation.isError
          ? getErrorMessage(
              simulation.error,
              "The server could not calculate this hypothetical scenario."
            )
          : null)
      }
      onCalculate={calculate}
      onRetry={() => {
        if (lastDraft.current) calculate(lastDraft.current);
      }}
    />
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
