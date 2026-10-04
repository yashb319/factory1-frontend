import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  AiProfitContext,
  AiProfitProvenance,
} from "../types/ai.types";
import {
  productCostingRoute,
  productProfitabilityRoute,
} from "../lib/profitAdvisor";

type Props = {
  profit?: AiProfitContext | null;
  provenance?: AiProfitProvenance | null;
};

export function AiProfitAdvisorView({ profit, provenance }: Props) {
  if (!profit && !provenance) return null;

  const lowCoverage =
    isLowCoverage(profit?.summary.attributionCoveragePercent) ||
    isLowCoverage(profit?.summary.costCoveragePercent) ||
    isLowCoverage(provenance?.attributionCoveragePercent) ||
    isLowCoverage(provenance?.costCoveragePercent);
  const warningState =
    profit?.status === "BLOCKED" ||
    profit?.status === "INCOMPLETE" ||
    profit?.status === "ESTIMATED" ||
    lowCoverage;

  return (
    <div className="space-y-3" aria-label="Grounded profit advisor evidence">
      {profit && warningState ? (
        <section
          role="alert"
          className={`rounded-lg border p-3 ${
            profit.status === "BLOCKED" || profit.status === "INCOMPLETE"
              ? "border-red-300 bg-red-50 text-red-950"
              : "border-amber-300 bg-amber-50 text-amber-950"
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">
                {profit.status === "BLOCKED"
                  ? "Blocked contribution profitability answer"
                  : profit.status === "INCOMPLETE"
                    ? "Incomplete contribution profitability evidence"
                    : "Estimated contribution profitability evidence"}
              </p>
              <p className="mt-1 text-xs">
                This is product contribution/gross profitability, not company
                net profit. Treat the answer as directional until the listed
                evidence gaps and coverage warnings are resolved.
              </p>
            </div>
          </div>
          {profit.warnings.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {profit.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {profit ? (
        <section className="rounded-lg border bg-background p-3">
          <h3 className="text-sm font-semibold">Profit fact coverage</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {profit.from} to {profit.to} · {profit.status.toLowerCase()} ·
            product contribution/gross profitability
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <EvidenceDetail
              label="Attribution coverage"
              value={formatPercent(
                profit.summary.attributionCoveragePercent ??
                  provenance?.attributionCoveragePercent
              )}
            />
            <EvidenceDetail
              label="Cost coverage"
              value={formatPercent(
                profit.summary.costCoveragePercent ??
                  provenance?.costCoveragePercent
              )}
            />
          </dl>
        </section>
      ) : null}

      {profit?.products.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            Backend-returned product facts
          </h3>
          {profit.products.map((product) => (
            <article
              key={product.productId}
              className="rounded-lg border bg-background p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {product.productCode} - {product.productName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {product.completeness.toLowerCase()} evidence
                    {product.snapshotAsOfDate
                      ? ` · as of ${product.snapshotAsOfDate}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={productProfitabilityRoute(product.productId)}>
                      View profitability
                    </Link>
                  </Button>
                  {product.snapshotId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={productCostingRoute(
                          product.productId,
                          product.snapshotId
                        )}
                      >
                        View costing record
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <EvidenceDetail
                  label="Contribution margin"
                  value={formatPercent(product.contributionMarginPercent)}
                />
                <EvidenceDetail
                  label="Total contribution"
                  value={formatMoney(
                    product.currency,
                    product.totalContribution
                  )}
                />
                <EvidenceDetail
                  label="Realized gross product profit"
                  value={formatMoney(product.currency, product.realizedProfit)}
                />
                <EvidenceDetail
                  label="Realized gross margin"
                  value={formatPercent(product.realizedMarginPercent)}
                />
                <EvidenceDetail
                  label="Attribution coverage"
                  value={formatPercent(product.attributionCoveragePercent)}
                />
                <EvidenceDetail
                  label="Cost coverage"
                  value={formatPercent(product.costCoveragePercent)}
                />
              </dl>
            </article>
          ))}
        </section>
      ) : null}

      {profit?.materialDrivers.length ? (
        <section className="rounded-lg border bg-background p-3">
          <h3 className="text-sm font-semibold">
            Backend-returned material cost drivers
          </h3>
          <ul className="mt-2 space-y-2">
            {profit.materialDrivers.map((driver) => (
              <li key={driver.evidenceId} className="rounded-md bg-muted/40 p-2">
                <p className="font-medium">
                  {driver.label}
                  {driver.estimate ? " · estimated" : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(driver.currency, driver.amount)} ·{" "}
                  {formatPercent(driver.percentOfMaterialCost)} of material
                  cost · evidence {driver.evidenceId}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {provenance ? (
        <ProfitProvenancePanel provenance={provenance} />
      ) : null}

      {profit?.unsupportedClaims.length ? (
        <section className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Unsupported boundaries</p>
          <p className="mt-1">
            The backend explicitly excluded:{" "}
            {profit.unsupportedClaims.map(humanizeToken).join(", ")}. No
            conclusion or action is presented for those areas.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ProfitProvenancePanel({
  provenance,
}: {
  provenance: AiProfitProvenance;
}) {
  return (
    <details className="rounded-lg border border-dashed bg-muted/20 p-3" open>
      <summary className="cursor-pointer text-sm font-semibold">
        Profit evidence and provenance
      </summary>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <EvidenceDetail label="Revenue basis" value={provenance.revenueBasis} />
        <EvidenceDetail label="Cost basis" value={provenance.costBasis} />
        <EvidenceDetail
          label="Health rule"
          value={provenance.healthRuleVersion}
        />
        <EvidenceDetail
          label="Simulation engine"
          value={provenance.simulationEngineVersion}
        />
      </dl>
      {provenance.snapshotReferences.length ? (
        <div className="mt-3 space-y-2">
          {provenance.snapshotReferences.map((snapshot) => (
            <div
              key={`${snapshot.snapshotId}:${snapshot.snapshotVersion ?? ""}`}
              className="rounded-md border bg-background p-2 text-xs"
            >
              <p className="font-medium">Snapshot {snapshot.snapshotId}</p>
              <p className="mt-1 text-muted-foreground">
                Version {formatValue(snapshot.snapshotVersion)} · policy{" "}
                {formatReference(snapshot.policyId, snapshot.policyVersion)} ·
                BOM {formatReference(snapshot.bomId, snapshot.bomVersion)}
              </p>
              <p className="mt-1 text-muted-foreground">
                Engine {formatValue(snapshot.costEngineVersion)} · as of{" "}
                {formatValue(snapshot.asOfDate)} · frozen{" "}
                {formatValue(snapshot.frozenAt)} ·{" "}
                {snapshot.completeness.toLowerCase()} · cost coverage{" "}
                {formatPercent(snapshot.costCoveragePercent)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {provenance.simulationAssumptions.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium">Simulation assumptions</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {provenance.simulationAssumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {provenance.appliedOverrides.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium">Applied simulation overrides</p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {provenance.appliedOverrides.map((override) => (
              <li key={`${override.category}:${override.key}:${override.field}`}>
                {override.category} · {override.key} · {override.field}:{" "}
                {formatValue(override.scenarioValue)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </details>
  );
}

function EvidenceDetail({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-xs font-medium">{formatValue(value)}</dd>
    </div>
  );
}

function formatMoney(currency: string | null | undefined, value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  return `${currency || "Currency unavailable"} ${String(value)}`;
}

function formatPercent(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  return `${String(value)}%`;
}

function formatValue(value: unknown) {
  return value === null || value === undefined || value === ""
    ? "Not available"
    : String(value);
}

function formatReference(id?: string | null, version?: string | number | null) {
  if (!id) return "not available";
  return version === null || version === undefined ? id : `${id} v${version}`;
}

function humanizeToken(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function isLowCoverage(value: unknown) {
  if (typeof value === "number") return value < 80;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed < 80;
  }
  return false;
}
