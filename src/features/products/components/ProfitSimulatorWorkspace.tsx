"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROFIT_SIMULATOR_BOUNDS,
  PROFIT_SIMULATOR_MAX_MATERIAL_OVERRIDES,
} from "../config/profitSimulator";
import type {
  ProfitSimulationResult,
  ProfitSimulatorBaseline,
  ProfitSimulatorDraft,
  ProfitSimulatorMaterialDraft,
  ProfitSimulatorMetric,
} from "../types/profitSimulator.types";
import {
  formatProfitabilityDate,
  formatProfitabilityPercent,
} from "../utils/profitabilityPresentation";

type Props = {
  baselines: ProfitSimulatorBaseline[];
  initialSnapshotId?: string | null;
  result?: ProfitSimulationResult | null;
  loading: boolean;
  error?: string | null;
  onCalculate: (draft: ProfitSimulatorDraft) => void;
  onRetry: () => void;
};

type NumericBounds = {
  min: number;
  max: number;
  step: number;
};

export function ProfitSimulatorWorkspace({
  baselines,
  initialSnapshotId,
  result,
  loading,
  error,
  onCalculate,
  onRetry,
}: Props) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(
    baselines.some((entry) => entry.snapshot.id === initialSnapshotId)
      ? initialSnapshotId!
      : baselines[0]?.snapshot.id ?? ""
  );
  const baseline =
    baselines.find((entry) => entry.snapshot.id === selectedSnapshotId) ??
    baselines[0];

  if (!baseline) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No frozen baseline is available for simulation. Freeze a defensible
        costing snapshot before testing assumptions.
      </div>
    );
  }

  return (
    <SimulatorForBaseline
      key={baseline.snapshot.id}
      baseline={baseline}
      baselines={baselines}
      selectedSnapshotId={baseline.snapshot.id}
      onSelectSnapshot={setSelectedSnapshotId}
      result={
        result?.baselineSnapshotId === baseline.snapshot.id ? result : null
      }
      loading={loading}
      error={error}
      onCalculate={onCalculate}
      onRetry={onRetry}
    />
  );
}

function SimulatorForBaseline({
  baseline,
  baselines,
  selectedSnapshotId,
  onSelectSnapshot,
  result,
  loading,
  error,
  onCalculate,
  onRetry,
}: {
  baseline: ProfitSimulatorBaseline;
  baselines: ProfitSimulatorBaseline[];
  selectedSnapshotId: string;
  onSelectSnapshot: (snapshotId: string) => void;
  result: ProfitSimulationResult | null;
  loading: boolean;
  error?: string | null;
  onCalculate: (draft: ProfitSimulatorDraft) => void;
  onRetry: () => void;
}) {
  const initial = useMemo(() => draftFromBaseline(baseline), [baseline]);
  const [draft, setDraft] = useState(initial);
  const [submittedDraft, setSubmittedDraft] = useState<string | null>(null);
  const errors = validateProfitSimulatorDraft(draft, baseline);
  const changes = changedAssumptions(initial, draft, baseline);
  const resultIsCurrent =
    submittedDraft === JSON.stringify(draft) &&
    result &&
    result.hypothetical &&
    !result.persisted;

  const updateMaterial = (
    evidenceId: string,
    field: keyof Omit<ProfitSimulatorMaterialDraft, "evidenceId">,
    value: string
  ) => {
    setDraft((current) => ({
      ...current,
      materials: current.materials.map((material) =>
        material.evidenceId === evidenceId
          ? { ...material, [field]: value }
          : material
      ),
    }));
  };

  return (
    <section
      className="space-y-5 rounded-lg border border-blue-200 bg-blue-50/30 p-4"
      aria-labelledby="profit-simulator-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="profit-simulator-title" className="font-semibold">
            Profit Simulator
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Hypothetical, non-persistent scenario. Calculate sends assumptions
            to the server and cannot change product prices, BOMs, inventory,
            snapshots, accounting, production, or recommendations.
          </p>
        </div>
        <span className="rounded-full border border-blue-300 bg-white px-2 py-1 text-xs font-medium text-blue-900">
          No side effects
        </span>
      </div>

      <fieldset className="space-y-3 rounded-lg border bg-background p-4">
        <legend className="px-1 font-medium">Frozen baseline</legend>
        <label className="block max-w-xl space-y-1 text-sm">
          <span className="font-medium">Snapshot and date</span>
          <select
            className="h-9 w-full rounded-md border bg-background px-3"
            value={selectedSnapshotId}
            onChange={(event) => onSelectSnapshot(event.target.value)}
          >
            {baselines.map((entry) => (
              <option key={entry.snapshot.id} value={entry.snapshot.id}>
                {entry.snapshot.id} -{" "}
                {formatProfitabilityDate(entry.snapshot.asOf)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          You may also select the effective-date baseline below. The server
          deterministically chooses the latest immutable snapshot whose as-of
          date is on or before that date.
        </p>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Snapshot ID" value={baseline.snapshot.id} />
          <Detail
            label="Snapshot as of"
            value={formatProfitabilityDate(baseline.snapshot.asOf)}
          />
          <Detail
            label="Frozen at"
            value={formatProfitabilityDate(baseline.snapshot.frozenAt)}
          />
          <Detail
            label="Completeness"
            value={baseline.completeness.toLowerCase()}
          />
        </dl>
        {baseline.warnings.length ? (
          <WarningList title="Baseline warnings" warnings={baseline.warnings} />
        ) : null}
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border bg-background p-4">
        <legend className="px-1 font-medium">Scenario assumptions</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Baseline selector</span>
            <select
              className="h-8 w-full rounded-md border bg-background px-2"
              value={draft.selectorMode}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  selectorMode: event.target.value as
                    | "SNAPSHOT"
                    | "EFFECTIVE_DATE",
                }))
              }
            >
              <option value="SNAPSHOT">Frozen snapshot ID</option>
              <option value="EFFECTIVE_DATE">Effective on date</option>
            </select>
          </label>
          {draft.selectorMode === "EFFECTIVE_DATE" ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium">Effective on date</span>
              <input
                type="date"
                value={draft.effectiveOnDate}
                aria-invalid={Boolean(errors.effectiveOnDate)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    effectiveOnDate: event.target.value,
                  }))
                }
                className="h-8 w-full rounded-md border bg-background px-2"
              />
              {errors.effectiveOnDate ? (
                <p role="alert" className="text-xs text-destructive">
                  {errors.effectiveOnDate}
                </p>
              ) : null}
            </label>
          ) : (
            <Detail label="Selected snapshot ID" value={draft.snapshotId} />
          )}
          <BoundedDecimalInput
            id="simulator-selling-price"
            label="Selling price per unit"
            value={draft.sellingPrice}
            bounds={PROFIT_SIMULATOR_BOUNDS.sellingPrice}
            error={errors.sellingPrice}
            onChange={(sellingPrice) =>
              setDraft((current) => ({ ...current, sellingPrice }))
            }
          />
          <BoundedDecimalInput
            id="simulator-output-quantity"
            label="Planned / sales volume"
            value={draft.outputQuantity}
            bounds={PROFIT_SIMULATOR_BOUNDS.outputQuantity}
            error={errors.outputQuantity}
            onChange={(outputQuantity) =>
              setDraft((current) => ({ ...current, outputQuantity }))
            }
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Material source assumptions</h4>
          {errors.materials ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.materials}
            </p>
          ) : null}
          {baseline.materials.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <table
                className="responsive-table w-full text-sm"
                aria-label="Material quantity, rate, waste, and source evidence"
              >
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left" scope="col">
                      Material / source
                    </th>
                    <th className="p-3 text-left" scope="col">
                      Quantity
                    </th>
                    <th className="p-3 text-left" scope="col">
                      Rate
                    </th>
                    <th className="p-3 text-left" scope="col">
                      Waste %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {baseline.materials.map((material) => {
                    const materialDraft = draft.materials.find(
                      (entry) => entry.evidenceId === material.evidenceId
                    )!;
                    return (
                      <tr key={material.evidenceId} className="border-t align-top">
                        <th className="min-w-56 p-3 text-left" scope="row">
                          <p>{material.label}</p>
                          <p className="mt-1 text-xs font-normal text-muted-foreground">
                            {material.sourceLabel || "Source unavailable"} ·{" "}
                            {material.sourceReference || "No reference"} ·{" "}
                            {formatProfitabilityDate(material.asOf)}
                          </p>
                        </th>
                        <td className="min-w-48 p-3" data-label="Quantity">
                          {material.quantitySupported ? (
                            <BoundedDecimalInput
                              id={`material-${material.evidenceId}-quantity`}
                              label={`Quantity for ${material.label}`}
                              hideLabel
                              suffix={material.unit || undefined}
                              value={materialDraft.quantityPerOutput}
                              bounds={PROFIT_SIMULATOR_BOUNDS.materialQuantity}
                              error={
                                errors[
                                  `materials.${material.evidenceId}.quantityPerOutput`
                                ]
                              }
                              onChange={(value) =>
                                updateMaterial(
                                  material.evidenceId,
                                  "quantityPerOutput",
                                  value
                                )
                              }
                            />
                          ) : (
                            <Unsupported reason="Quantity override unsupported" />
                          )}
                        </td>
                        <td className="min-w-48 p-3" data-label="Rate">
                          {material.rateSupported ? (
                            <BoundedDecimalInput
                              id={`material-${material.evidenceId}-rate`}
                              label={`Rate for ${material.label}`}
                              hideLabel
                              value={materialDraft.rate}
                              bounds={PROFIT_SIMULATOR_BOUNDS.materialRate}
                              error={
                                errors[`materials.${material.evidenceId}.rate`]
                              }
                              onChange={(value) =>
                                updateMaterial(
                                  material.evidenceId,
                                  "rate",
                                  value
                                )
                              }
                            />
                          ) : (
                            <Unsupported reason="Rate override unsupported" />
                          )}
                        </td>
                        <td className="min-w-48 p-3" data-label="Waste %">
                          {material.wasteSupported ? (
                            <BoundedDecimalInput
                              id={`material-${material.evidenceId}-waste-change`}
                              label={`Waste percent change for ${material.label}`}
                              hideLabel
                              suffix="%"
                              value={materialDraft.wastePercentChange}
                              bounds={
                                PROFIT_SIMULATOR_BOUNDS.wastePercentChange
                              }
                              error={
                                errors[
                                  `materials.${material.evidenceId}.wastePercentChange`
                                ]
                              }
                              onChange={(value) =>
                                updateMaterial(
                                  material.evidenceId,
                                  "wastePercentChange",
                                  value
                                )
                              }
                            />
                          ) : (
                            <Unsupported reason="Waste override unsupported" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No material evidence rows were returned. Missing material data is
              not treated as zero.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <AllocationInput
            id="simulator-labour"
            label="Labour"
            input={baseline.labour}
            value={draft.labour}
            error={errors.labour}
            onChange={(labour) =>
              setDraft((current) => ({ ...current, labour }))
            }
          />
          <AllocationInput
            id="simulator-overhead"
            label="Overhead"
            input={baseline.overhead}
            value={draft.overhead}
            error={errors.overhead}
            onChange={(overhead) =>
              setDraft((current) => ({ ...current, overhead }))
            }
          />
          <AllocationInput
            id="simulator-misc"
            label="Miscellaneous"
            input={baseline.misc}
            value={draft.misc}
            error={errors.misc}
            onChange={(misc) =>
              setDraft((current) => ({ ...current, misc }))
            }
          />
        </div>
      </fieldset>

      <section aria-labelledby="changed-assumptions-title">
        <h4 id="changed-assumptions-title" className="font-medium">
          Changed assumptions
        </h4>
        {changes.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No assumptions differ from this frozen baseline.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setSubmittedDraft(JSON.stringify(draft));
            onCalculate(draft);
          }}
          disabled={loading || Object.keys(errors).length > 0}
        >
          {loading ? "Calculating..." : "Calculate simulation"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setDraft(initial)}
          disabled={loading || !changes.length}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to baseline
        </Button>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">
            Simulation could not be calculated
          </p>
          <p className="mt-1 text-sm text-red-800">{error}</p>
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}

      {resultIsCurrent ? <SimulationComparison result={result} /> : null}
    </section>
  );
}

function AllocationInput({
  id,
  label,
  input,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  input: ProfitSimulatorBaseline["labour"];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  if (!input.supported) {
    return (
      <div className="rounded-lg border border-dashed p-3">
        <p className="font-medium">{label}</p>
        <Unsupported reason={input.reason || `${label} override unsupported`} />
      </div>
    );
  }

  return (
    <BoundedDecimalInput
      id={id}
      label={`${label} (${
        input.mode === "TOTAL_ALLOCATION" ? "total" : "per output"
      })`}
      value={value}
      bounds={PROFIT_SIMULATOR_BOUNDS.allocation}
      error={error}
      onChange={onChange}
    />
  );
}

function BoundedDecimalInput({
  id,
  label,
  hideLabel,
  suffix,
  value,
  bounds,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hideLabel?: boolean;
  suffix?: string;
  value: string;
  bounds: NumericBounds;
  error?: string;
  onChange: (value: string) => void;
}) {
  const adjust = (direction: -1 | 1) => {
    const current = decimal(value);
    const next = Math.min(
      bounds.max,
      Math.max(bounds.min, (current ?? bounds.min) + direction * bounds.step)
    );
    onChange(String(Number(next.toFixed(decimalPlaces(bounds.step)))));
  };
  const descriptionId = `${id}-bounds`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "block text-sm font-medium"}
      >
        {label}
      </label>
      <div className="flex">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-r-none"
          aria-label={`Decrease ${label} by ${bounds.step}`}
          onClick={() => adjust(-1)}
          disabled={decimal(value) !== undefined && decimal(value)! <= bounds.min}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={value}
            aria-invalid={Boolean(error)}
            aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
            onChange={(event) => onChange(event.target.value)}
            className="h-8 w-full border-y bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-l-none"
          aria-label={`Increase ${label} by ${bounds.step}`}
          onClick={() => adjust(1)}
          disabled={decimal(value) !== undefined && decimal(value)! >= bounds.max}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p id={descriptionId} className="text-xs text-muted-foreground">
        {bounds.min} to {bounds.max}; step {bounds.step}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SimulationComparison({ result }: { result: ProfitSimulationResult }) {
  return (
    <section className="space-y-4" aria-labelledby="simulation-results-title">
      <div>
        <h4 id="simulation-results-title" className="font-semibold">
          Baseline vs hypothetical scenario
        </h4>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Server-calculated result · {result.status.toLowerCase()} ·{" "}
          {result.completeness.toLowerCase()} evidence
        </p>
      </div>

      {result.blockedReasons.length ? (
        <WarningList
          title="Blocked or incomplete result"
          warnings={result.blockedReasons}
        />
      ) : null}
      {result.warnings.length ? (
        <WarningList title="Simulation warnings" warnings={result.warnings} />
      ) : null}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table
          className="responsive-table w-full text-sm"
          aria-label="Server-calculated baseline and hypothetical scenario comparison"
        >
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left" scope="col">
                Metric
              </th>
              <th className="p-3 text-right" scope="col">
                Baseline
              </th>
              <th className="p-3 text-right" scope="col">
                Scenario
              </th>
              <th className="p-3 text-right" scope="col">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {result.metrics.map((metric) => (
              <tr key={metric.key} className="border-t">
                <th className="p-3 text-left" scope="row">
                  {metric.label}
                </th>
                <td className="p-3 text-right" data-label="Baseline">
                  {formatMetric(metric, metric.baseline, false)}
                </td>
                <td className="p-3 text-right" data-label="Scenario">
                  {formatMetric(metric, metric.scenario, true)}
                </td>
                <td className="p-3 text-right" data-label="Delta">
                  {formatMetric(metric, metric.delta, false)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <AssumptionList
          title="Applied assumptions"
          entries={result.appliedAssumptions.map(
            (entry) =>
              `${entry.label}${entry.reason ? `: ${entry.reason}` : ""}`
          )}
          empty="The server applied no overrides."
        />
        <AssumptionList
          title="Ignored assumptions"
          entries={result.ignoredAssumptions.map(
            (entry) => `${entry.label}: ${entry.reason}`
          )}
          empty="The server ignored no submitted overrides."
        />
      </div>
      {result.assumptions.length ? (
        <AssumptionList
          title="Server assumptions"
          entries={result.assumptions}
          empty=""
        />
      ) : null}
      <section className="rounded-lg border bg-background p-3">
        <h5 className="font-medium">Immutable simulation provenance</h5>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Snapshot ID" value={result.provenance.snapshotId} />
          <Detail
            label="Snapshot version"
            value={result.provenance.snapshotVersion || "Not available"}
          />
          <Detail
            label="Snapshot as of"
            value={formatProfitabilityDate(result.provenance.snapshotAsOf)}
          />
          <Detail
            label="Frozen at"
            value={formatProfitabilityDate(result.provenance.snapshotFrozenAt)}
          />
          <Detail
            label="Policy"
            value={`${result.provenance.policyId || "Not available"} · v${
              result.provenance.policyVersion || "?"
            }`}
          />
          <Detail
            label="BOM"
            value={`${result.provenance.bomId || "Not available"} · v${
              result.provenance.bomVersion || "?"
            }`}
          />
          <Detail
            label="Source cost engine"
            value={
              result.provenance.sourceCostEngineVersion || "Not available"
            }
          />
          <Detail
            label="Simulation engine"
            value={result.provenance.simulationEngineVersion}
          />
          <Detail
            label="Baseline selector"
            value={result.provenance.selectorLabel}
          />
        </dl>
      </section>
    </section>
  );
}

function WarningList({
  title,
  warnings,
}: {
  title: string;
  warnings: string[];
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
      <p className="font-medium">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function AssumptionList({
  title,
  entries,
  empty,
}: {
  title: string;
  entries: string[];
  empty: string;
}) {
  return (
    <section className="rounded-lg border bg-background p-3">
      <h5 className="font-medium">{title}</h5>
      {entries.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {entries.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
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

function Unsupported({ reason }: { reason: string }) {
  return <p className="text-xs text-muted-foreground">{reason}</p>;
}

function formatMetric(
  metric: ProfitSimulatorMetric,
  value: number | undefined,
  showUndefinedReason: boolean
) {
  if (value === undefined) {
    return showUndefinedReason
      ? metric.undefinedReason || "Not available"
      : "Not available";
  }
  if (metric.key === "marginPercent" || metric.key === "markupPercent") {
    return formatProfitabilityPercent(value);
  }
  if (metric.currency) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: metric.currency,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(value)}${metric.unit ? ` ${metric.unit}` : ""}`;
}

export function draftFromBaseline(
  baseline: ProfitSimulatorBaseline
): ProfitSimulatorDraft {
  return {
    selectorMode: "SNAPSHOT",
    snapshotId: baseline.snapshot.id,
    effectiveOnDate: baseline.snapshot.asOf ?? "",
    sellingPrice: optionalString(baseline.sellingPrice),
    outputQuantity: optionalString(baseline.outputQuantity),
    materials: baseline.materials.map((material) => ({
      evidenceId: material.evidenceId,
      quantityPerOutput: optionalString(material.quantityPerOutput),
      rate: optionalString(material.rate),
      wastePercentChange: "",
    })),
    labour: optionalString(baseline.labour.amount),
    overhead: optionalString(baseline.overhead.amount),
    misc: optionalString(baseline.misc.amount),
  };
}

export function validateProfitSimulatorDraft(
  draft: ProfitSimulatorDraft,
  baseline: ProfitSimulatorBaseline
) {
  const errors: Record<string, string> = {};
  if (draft.materials.length > PROFIT_SIMULATOR_MAX_MATERIAL_OVERRIDES) {
    errors.materials = "A simulation can include at most 100 material overrides.";
  }
  if (
    draft.selectorMode === "EFFECTIVE_DATE" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveOnDate)
  ) {
    errors.effectiveOnDate = "Choose a valid effective date.";
  }
  validateBounded(
    draft.sellingPrice,
    PROFIT_SIMULATOR_BOUNDS.sellingPrice,
    "Selling price",
    errors,
    "sellingPrice"
  );
  validateBounded(
    draft.outputQuantity,
    PROFIT_SIMULATOR_BOUNDS.outputQuantity,
    "Sales volume",
    errors,
    "outputQuantity"
  );
  validateBounded(
    draft.labour,
    PROFIT_SIMULATOR_BOUNDS.allocation,
    "Labour",
    errors,
    "labour",
    !baseline.labour.supported
  );
  validateBounded(
    draft.overhead,
    PROFIT_SIMULATOR_BOUNDS.allocation,
    "Overhead",
    errors,
    "overhead",
    !baseline.overhead.supported
  );
  validateBounded(
    draft.misc,
    PROFIT_SIMULATOR_BOUNDS.allocation,
    "Miscellaneous",
    errors,
    "misc",
    !baseline.misc.supported
  );
  for (const material of draft.materials) {
    const support = baseline.materials.find(
      (entry) => entry.evidenceId === material.evidenceId
    );
    if (!support) {
      errors[`materials.${material.evidenceId}`] =
        "Material source is not part of the selected baseline.";
      continue;
    }
    validateBounded(
      material.quantityPerOutput,
      PROFIT_SIMULATOR_BOUNDS.materialQuantity,
      "Material quantity",
      errors,
      `materials.${material.evidenceId}.quantityPerOutput`,
      !support.quantitySupported
    );
    validateBounded(
      material.rate,
      PROFIT_SIMULATOR_BOUNDS.materialRate,
      "Material rate",
      errors,
      `materials.${material.evidenceId}.rate`,
      !support.rateSupported
    );
    validateBounded(
      material.wastePercentChange,
      PROFIT_SIMULATOR_BOUNDS.wastePercentChange,
      "Waste percent change",
      errors,
      `materials.${material.evidenceId}.wastePercentChange`,
      !support.wasteSupported
    );
  }
  return errors;
}

function validateBounded(
  value: string,
  bounds: NumericBounds,
  label: string,
  errors: Record<string, string>,
  key: string,
  ignored = false
) {
  if (ignored || value === "") return;
  if (!/^-?\d+(?:\.\d{1,6})?$/.test(value.trim())) {
    errors[key] = `${label} must use at most 6 decimal places.`;
    return;
  }
  const parsed = decimal(value);
  if (parsed === undefined) {
    errors[key] = `${label} must be a number.`;
  } else if (parsed < bounds.min || parsed > bounds.max) {
    errors[key] = `${label} must be between ${bounds.min} and ${bounds.max}.`;
  }
}

function changedAssumptions(
  initial: ProfitSimulatorDraft,
  draft: ProfitSimulatorDraft,
  baseline: ProfitSimulatorBaseline
) {
  const changes: string[] = [];
  if (draft.sellingPrice !== initial.sellingPrice) changes.push("Selling price");
  if (draft.selectorMode !== initial.selectorMode) {
    changes.push(
      draft.selectorMode === "EFFECTIVE_DATE"
        ? "Effective-date baseline selector"
        : "Frozen snapshot baseline selector"
    );
  }
  if (
    draft.selectorMode === "EFFECTIVE_DATE" &&
    draft.effectiveOnDate !== initial.effectiveOnDate
  ) {
    changes.push("Effective baseline date");
  }
  if (draft.outputQuantity !== initial.outputQuantity) {
    changes.push("Sales volume");
  }
  if (draft.labour !== initial.labour && baseline.labour.supported) {
    changes.push("Labour allocation");
  }
  if (draft.overhead !== initial.overhead && baseline.overhead.supported) {
    changes.push("Overhead allocation");
  }
  if (draft.misc !== initial.misc && baseline.misc.supported) {
    changes.push("Miscellaneous allocation");
  }
  for (const material of draft.materials) {
    const original = initial.materials.find(
      (entry) => entry.evidenceId === material.evidenceId
    );
    const source = baseline.materials.find(
      (entry) => entry.evidenceId === material.evidenceId
    );
    if (!original || !source) continue;
    if (
      source.quantitySupported &&
      material.quantityPerOutput !== original.quantityPerOutput
    ) {
      changes.push(`${source.label} quantity`);
    }
    if (source.rateSupported && material.rate !== original.rate) {
      changes.push(`${source.label} rate`);
    }
    if (
      source.wasteSupported &&
      material.wastePercentChange !== original.wastePercentChange
    ) {
      changes.push(`${source.label} waste`);
    }
  }
  return changes;
}

function decimal(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalString(value?: number) {
  return value === undefined ? "" : String(value);
}

function decimalPlaces(value: number) {
  return (String(value).split(".")[1] || "").length;
}
