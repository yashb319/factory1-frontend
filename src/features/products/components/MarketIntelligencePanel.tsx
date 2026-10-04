"use client";

import { useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  safeMarketSourceUrl,
  toMarketSearchRequest,
} from "../api/marketIntelligenceAdapters";
import type {
  MarketComparableFilters,
  MarketIntelligenceView,
  MarketSearchRequest,
} from "../types/marketIntelligence.types";
import type { ProfitabilityMoney } from "../types/profitability.types";
import {
  formatMarketDate,
  formatMarketMoney,
  formatMarketPercent,
} from "../utils/marketIntelligencePresentation";
import { formatProfitabilityMoney } from "../utils/profitabilityPresentation";

type Props = {
  productId: string;
  currentRealizedPrice: ProfitabilityMoney;
  currentListPrice?: ProfitabilityMoney | null;
  view: MarketIntelligenceView;
  filters: MarketComparableFilters;
  refreshing?: boolean;
  starting?: boolean;
  onStart: (request: MarketSearchRequest) => void;
  onRetry: (runId?: string) => void;
  onFiltersChange: (filters: MarketComparableFilters) => void;
};

const BLOCKED_STATES = new Set([
  "ENTITLEMENT_REQUIRED",
  "PROVIDER_DISABLED",
  "PROVIDER_MISCONFIGURED",
]);

export function MarketIntelligencePanel({
  productId,
  currentRealizedPrice,
  currentListPrice,
  view,
  filters,
  refreshing = false,
  starting = false,
  onStart,
  onRetry,
  onFiltersChange,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      view.searchAttributes.map((attribute) => [
        attribute.key,
        attribute.initialValue ?? "",
      ])
    )
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const shownSearch = useMemo(
    () =>
      view.searchAttributes
        .map((attribute) => ({
          label: attribute.label,
          value: values[attribute.key]?.trim(),
        }))
        .filter((entry) => entry.value),
    [values, view.searchAttributes]
  );
  const canSearch =
    !BLOCKED_STATES.has(view.availability) &&
    view.availability !== "PROVIDER_UNHEALTHY" &&
    view.availability !== "LOADING";
  const canShowEvidence =
    view.availability !== "LOADING" &&
    view.availability !== "ENTITLEMENT_REQUIRED";

  const startSearch = () => {
    try {
      const request = toMarketSearchRequest(
        productId,
        view.searchAttributes,
        values
      );
      setValidationError(null);
      onStart(request);
    } catch (error) {
      setValidationError(
        error instanceof Error
          ? error.message
          : "The structured search attributes are invalid."
      );
    }
  };

  return (
    <section
      aria-labelledby="market-intelligence-title"
      className="space-y-4 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="market-intelligence-title" className="font-semibold">
            Market Intelligence
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Attributed external observations for comparison only. Market evidence
            is not true cost, a quote, or a pricing instruction.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Results are supplied through SerpApi from Google Shopping; attribution
            does not imply endorsement by Factory1, SerpApi, Google, or a merchant.
          </p>
        </div>
        {canSearch ? (
          <Button
            variant="outline"
            onClick={startSearch}
            disabled={refreshing || starting || view.availability === "RUNNING"}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {refreshing || starting ? "Refreshing..." : "Refresh from provider"}
          </Button>
        ) : null}
      </div>

      <AvailabilityState view={view} onRetry={onRetry} />

      {canSearch ? (
        <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="font-medium">Structured provider search</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Factory1 sends only the product and bounded attributes below. Provider
              addresses and credentials are configured by the server and cannot be
              entered here.
            </p>
            {view.searchAttributes.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {view.searchAttributes.map((attribute) => (
                  <label key={attribute.key} className="grid gap-1 text-sm">
                    <span className="font-medium">
                      {attribute.label}
                      {attribute.required ? " *" : ""}
                    </span>
                    <span className="flex">
                      {attribute.type === "SELECT" ? (
                        <select
                          className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2"
                          value={values[attribute.key] ?? ""}
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              [attribute.key]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Any</option>
                          {attribute.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2"
                          type={attribute.type === "NUMBER" ? "number" : "text"}
                          required={attribute.required}
                          maxLength={
                            attribute.type === "TEXT"
                              ? Math.min(attribute.maxLength ?? 120, 500)
                              : undefined
                          }
                          min={attribute.type === "NUMBER" ? attribute.min : undefined}
                          max={attribute.type === "NUMBER" ? attribute.max : undefined}
                          value={values[attribute.key] ?? ""}
                          onChange={(event) =>
                            setValues((current) => ({
                              ...current,
                              [attribute.key]: event.target.value,
                            }))
                          }
                        />
                      )}
                      {attribute.unit ? (
                        <span className="rounded-r-md border border-l-0 px-2 py-2 text-muted-foreground">
                          {attribute.unit}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                The product record supplies all supported search attributes.
              </p>
            )}
            {shownSearch.length ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Will search:{" "}
                {shownSearch
                  .map((entry) => `${entry.label}: ${entry.value}`)
                  .join(" · ")}
              </p>
            ) : null}
            {validationError ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {validationError}
              </p>
            ) : null}
            <Button
              className="mt-3"
              onClick={startSearch}
              disabled={starting || view.availability === "RUNNING"}
            >
              <Search className="mr-2 h-4 w-4" />
              {starting || view.availability === "RUNNING"
                ? "Search running..."
                : view.runs.length
                  ? "Start new provider search"
                  : "Start provider search"}
            </Button>
        </div>
      ) : null}

      {canShowEvidence ? (
        <>
          <PriceContext
            realized={currentRealizedPrice}
            list={currentListPrice}
            view={view}
          />

          {view.summary ? <MarketSummaryCard view={view} /> : null}

          <ComparableEvidence
            view={view}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />

          {view.advisorEvidence ? (
            <section aria-labelledby="market-advisor-evidence" className="rounded-lg border p-4">
              <h4 id="market-advisor-evidence" className="font-medium">
                Grounded AI Advisor evidence
              </h4>
              <p className="mt-2 text-sm">{view.advisorEvidence.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Sources: {view.advisorEvidence.comparableIds.join(", ")} · Model:{" "}
                {view.advisorEvidence.model || "Not available"} · Generated:{" "}
                {formatMarketDate(view.advisorEvidence.generatedAt)}
              </p>
            </section>
          ) : null}

          <RunHistory runs={view.runs} onRetry={onRetry} />
        </>
      ) : null}
    </section>
  );
}

function AvailabilityState({
  view,
  onRetry,
}: {
  view: MarketIntelligenceView;
  onRetry: (runId?: string) => void;
}) {
  const content: Record<
    MarketIntelligenceView["availability"],
    { title: string; description: string; tone: string }
  > = {
    LOADING: {
      title: "Loading market evidence",
      description: "Factory1 is checking availability and previous provider runs.",
      tone: "border-slate-200 bg-slate-50",
    },
    ENTITLEMENT_REQUIRED: {
      title: "Market Intelligence is not included",
      description:
        "This organization does not have the Market Intelligence entitlement.",
      tone: "border-slate-200 bg-slate-50",
    },
    PROVIDER_DISABLED: {
      title: "Market provider is disabled",
      description:
        "An organization administrator must enable the server-side provider.",
      tone: "border-amber-200 bg-amber-50",
    },
    PROVIDER_MISCONFIGURED: {
      title: "Market provider needs setup",
      description:
        "Provider configuration is incomplete. Credentials and provider addresses are managed on the server.",
      tone: "border-amber-200 bg-amber-50",
    },
    PROVIDER_UNHEALTHY: {
      title: "Market provider is temporarily unavailable",
      description:
        "The server reported an unhealthy provider or open circuit. Existing evidence is preserved; retry later.",
      tone: "border-amber-200 bg-amber-50",
    },
    NO_DATA: {
      title: "No market evidence yet",
      description: "Start a provider search to collect attributed observations.",
      tone: "border-slate-200 bg-slate-50",
    },
    RUNNING: {
      title: "Provider search is running",
      description: "Existing evidence remains visible while the server collects results.",
      tone: "border-blue-200 bg-blue-50",
    },
    FAILED: {
      title: "Market search failed",
      description: "The provider search did not complete. Review the safe error and retry.",
      tone: "border-red-200 bg-red-50",
    },
    STALE: {
      title: "Market evidence is stale",
      description: "Treat these observations cautiously and refresh before relying on them.",
      tone: "border-amber-200 bg-amber-50",
    },
    EXPIRED: {
      title: "Market evidence has expired",
      description: "The observations remain attributed but are outside the valid freshness window.",
      tone: "border-red-200 bg-red-50",
    },
    INSUFFICIENT_COMPARABLES: {
      title: "Insufficient comparable data",
      description:
        "Attributed observations are shown, but the server did not return enough accepted samples for a market range.",
      tone: "border-amber-200 bg-amber-50",
    },
    AVAILABLE: {
      title: "Market evidence available",
      description: "Review source, freshness, confidence, and comparability limitations.",
      tone: "border-emerald-200 bg-emerald-50",
    },
  };
  const state = content[view.availability];

  return (
    <div
      role={view.availability === "FAILED" ? "alert" : "status"}
      className={`rounded-lg border p-3 ${state.tone}`}
    >
      <p className="font-medium">{state.title}</p>
      <p className="mt-1 text-sm">
        {view.message || state.description}
      </p>
      {view.lastUpdatedAt ? (
        <p className="mt-1 text-xs">
          Last observed update: {formatMarketDate(view.lastUpdatedAt)}
          {view.expiresAt
            ? ` · Expires: ${formatMarketDate(view.expiresAt)}`
            : ""}
        </p>
      ) : null}
      {view.availability === "FAILED" ? (
        <Button className="mt-3" variant="outline" onClick={() => onRetry()}>
          Retry search
        </Button>
      ) : null}
    </div>
  );
}

function PriceContext({
  realized,
  list,
  view,
}: {
  realized: ProfitabilityMoney;
  list?: ProfitabilityMoney | null;
  view: MarketIntelligenceView;
}) {
  return (
    <section aria-labelledby="market-price-context">
      <h4 id="market-price-context" className="font-medium">
        Price context
      </h4>
      <dl className="mt-2 grid gap-3 sm:grid-cols-3">
        <Detail label="Current realized unit price" value={formatProfitabilityMoney(realized)} />
        <Detail
          label="Current list price"
          value={list ? formatProfitabilityMoney(list) : "Not available"}
        />
        <Detail
          label="Observed market range"
          value={view.summary ? formatMarketMoney(view.summary.range) : "Not returned by server"}
        />
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        Market observations may differ by taxes, GST, shipping, MOQ, quality,
        specifications, geography, and wholesale or retail channel. They are
        separate from frozen product cost.
      </p>
    </section>
  );
}

function MarketSummaryCard({ view }: { view: MarketIntelligenceView }) {
  const summary = view.summary;
  if (!summary) return null;
  return (
    <section aria-labelledby="market-summary" className="rounded-lg border p-4">
      <h4 id="market-summary" className="font-medium">
        Server-returned market summary
      </h4>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Observed range" value={formatMarketMoney(summary.range)} />
        <Detail label="Observed median" value={formatMarketMoney(summary.median)} />
        <Detail label="Accepted sample count" value={String(summary.sampleCount)} />
        <Detail label="Confidence" value={formatMarketPercent(summary.confidence)} />
        <Detail label="Outlier exclusions" value={String(summary.outlierExclusions)} />
      </dl>
      <p className="mt-3 text-sm">
        Method: {summary.method || "Not returned by server"}
      </p>
      {summary.limitations.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {summary.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ComparableEvidence({
  view,
  filters,
  onFiltersChange,
}: {
  view: MarketIntelligenceView;
  filters: MarketComparableFilters;
  onFiltersChange: (filters: MarketComparableFilters) => void;
}) {
  return (
    <section aria-labelledby="market-comparables" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 id="market-comparables" className="font-medium">
            Comparable evidence
          </h4>
          <p className="text-xs text-muted-foreground">
            {view.totalElements} attributed observations
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="grid gap-1 text-xs">
            Channel
            <select
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              value={filters.channel}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  page: 0,
                  channel: event.target.value as MarketComparableFilters["channel"],
                })
              }
            >
              <option value="ALL">All channels</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="RETAIL">Retail</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            Freshness
            <select
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              value={filters.freshness}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  page: 0,
                  freshness: event.target
                    .value as MarketComparableFilters["freshness"],
                })
              }
            >
              <option value="ALL">All freshness</option>
              <option value="FRESH">Fresh</option>
              <option value="STALE">Stale</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            Review result
            <select
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              value={filters.decision}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  page: 0,
                  decision: event.target.value as MarketComparableFilters["decision"],
                })
              }
            >
              <option value="ALL">All results</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="EXCLUDED">Excluded</option>
            </select>
          </label>
        </div>
      </div>
      {view.comparables.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="responsive-table w-full text-sm">
            <caption className="sr-only">
              Attributed external market observations and comparability evidence
            </caption>
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left" scope="col">Source and item</th>
                <th className="p-3 text-left" scope="col">Price and channel</th>
                <th className="p-3 text-left" scope="col">Comparable attributes</th>
                <th className="p-3 text-left" scope="col">Quality and decision</th>
                <th className="p-3 text-left" scope="col">Versions</th>
              </tr>
            </thead>
            <tbody>
              {view.comparables.map((comparable) => {
                const sourceUrl = safeMarketSourceUrl(comparable.sourceUrl);
                return (
                  <tr key={comparable.id} className="border-t align-top">
                    <th className="p-3 text-left font-normal" scope="row">
                      <p className="font-medium">
                        {comparable.title || "Untitled observation"}
                      </p>
                      <p>{comparable.model || "Model not available"}</p>
                      {sourceUrl ? (
                        <a
                          className="mt-1 inline-flex items-center text-blue-700 underline"
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${comparable.sourceName} (opens outside Factory1)`}
                        >
                          {comparable.sourceName}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      ) : (
                        <p className="mt-1">{comparable.sourceName}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Observed {formatMarketDate(comparable.observedAt)} ·{" "}
                        {comparable.freshness || "Freshness not available"}
                      </p>
                    </th>
                    <td className="p-3" data-label="Price and channel">
                      <p>Original: {formatMarketMoney(comparable.originalPrice)}</p>
                      <p>
                        Normalized: {formatMarketMoney(comparable.normalizedPrice)}
                      </p>
                      <p>MOQ: {comparable.moq ?? "Not available"}</p>
                      <p>Channel: {comparable.channel?.toLowerCase() || "Not available"}</p>
                    </td>
                    <td className="p-3" data-label="Comparable attributes">
                      <p>Material: {comparable.material || "Not available"}</p>
                      <p>Dimensions: {comparable.dimensions || "Not available"}</p>
                      <p>
                        Features:{" "}
                        {comparable.features.length
                          ? comparable.features.join(", ")
                          : "Not available"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Missing:{" "}
                        {comparable.missingFields.length
                          ? comparable.missingFields.join(", ")
                          : "None reported"}
                      </p>
                    </td>
                    <td className="p-3" data-label="Quality and decision">
                      <p>Similarity: {formatMarketPercent(comparable.similarity)}</p>
                      <p>Confidence: {formatMarketPercent(comparable.confidence)}</p>
                      <p className="mt-1 font-medium">
                        {comparable.decision === "ACCEPTED" ? "Accepted" : "Excluded"}
                      </p>
                      <p>{comparable.decisionReason || "No reason returned"}</p>
                      {comparable.limitations.length ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Limitations: {comparable.limitations.join("; ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3" data-label="Versions">
                      <p>Provider: {comparable.provider || "Not available"}</p>
                      <p>Provider version: {comparable.providerVersion || "Not returned"}</p>
                      <p>Algorithm: {comparable.algorithmVersion || "Not available"}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No comparable observations match these filters.
        </p>
      )}
      {view.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {view.page + 1} of {view.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={view.page === 0}
              onClick={() => onFiltersChange({ ...filters, page: view.page - 1 })}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={view.page + 1 >= view.totalPages}
              onClick={() => onFiltersChange({ ...filters, page: view.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RunHistory({
  runs,
  onRetry,
}: {
  runs: MarketIntelligenceView["runs"];
  onRetry: (runId?: string) => void;
}) {
  return (
    <section aria-labelledby="market-run-history">
      <h4 id="market-run-history" className="font-medium">
        Provider run history
      </h4>
      {runs.length ? (
        <ul className="mt-2 grid gap-2">
          {runs.map((run) => (
            <li key={run.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {run.status.toLowerCase()} · {run.provider || "Provider not available"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Started {formatMarketDate(run.startedAt)} · Completed{" "}
                    {formatMarketDate(run.completedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Results: {run.resultCount ?? "Not available"} · Accepted:{" "}
                    {run.acceptedCount ?? "Not available"} · Error code:{" "}
                    {run.errorCode || "None"}
                  </p>
                </div>
                {run.status === "FAILED" ? (
                  <Button size="sm" variant="outline" onClick={() => onRetry(run.id)}>
                    Retry run
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-xs">
                Searched:{" "}
                {Object.entries(run.searchedAttributes)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" · ") || "Product attributes only"}
              </p>
              {run.safeError ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {run.safeError}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Provider version: {run.providerVersion || "Not available"} ·
                Algorithm version: {run.algorithmVersion || "Not available"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No provider runs have been recorded.
        </p>
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
