"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ProfitCenterDashboard as ProfitCenterDashboardView,
  ProfitCenterAmount,
  ProfitCenterProductRank,
} from "../types/profitRecommendations.types";
import {
  formatProfitabilityDate,
  formatProfitabilityMoney,
  formatProfitabilityPercent,
} from "../utils/profitabilityPresentation";

type Props = {
  dashboard?: ProfitCenterDashboardView;
  loading: boolean;
  fetching: boolean;
  error?: string | null;
  canRefresh: boolean;
  refreshing: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  onPeriodChange: (period: { from: string; to: string }) => void;
  onOpenRecommendations: () => void;
  onOpenProduct: (productId: string) => void;
};

export function ProfitCenterDashboard({
  dashboard,
  loading,
  fetching,
  error,
  canRefresh,
  refreshing,
  onRetry,
  onRefresh,
  onPeriodChange,
  onOpenRecommendations,
  onOpenProduct,
}: Props) {
  if (loading) {
    return (
      <p role="status" className="rounded-lg border p-8 text-center">
        Loading Profit Center dashboard...
      </p>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="font-medium text-red-900">
          Profit Center dashboard could not be loaded
        </p>
        <p className="mt-1 text-sm text-red-800">{error}</p>
        <Button className="mt-3" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <section className="space-y-5" aria-labelledby="profit-center-title">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="profit-center-title" className="text-lg font-semibold">
            Profit Center
          </h2>
          <p className="text-sm text-muted-foreground">
            Server-reconciled contribution facts from attributed revenue and
            frozen product cost. This is not company net profit.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Period {dashboard.from} to {dashboard.to}. {dashboard.freshnessLabel}
            {dashboard.generatedAt
              ? ` Last generated ${formatProfitabilityDate(dashboard.generatedAt)}.`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onOpenRecommendations}>
            Recommendations ({dashboard.openRecommendationCount})
          </Button>
          {canRefresh ? (
            <Button onClick={onRefresh} disabled={refreshing}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {refreshing ? "Generation running" : "Refresh recommendations"}
            </Button>
          ) : null}
        </div>
      </div>

      {fetching ? (
        <p role="status" className="text-xs text-muted-foreground">
          Updating Profit Center facts...
        </p>
      ) : null}

      <div
        className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:max-w-xl sm:grid-cols-2"
        aria-label="Profit Center period"
      >
        <label className="space-y-1">
          <span className="text-xs font-medium">From</span>
          <Input
            type="date"
            value={dashboard.from}
            onChange={(event) =>
              onPeriodChange({ from: event.target.value, to: dashboard.to })
            }
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">To</span>
          <Input
            type="date"
            value={dashboard.to}
            onChange={(event) =>
              onPeriodChange({ from: dashboard.from, to: event.target.value })
            }
          />
        </label>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Attributed revenue"
          value={formatProfitCenterAmount(dashboard.attributedRevenue)}
        />
        <Metric
          label="Frozen product cost"
          value={formatProfitCenterAmount(dashboard.frozenProductCost)}
        />
        <Metric
          label="Contribution profit"
          value={formatProfitCenterAmount(dashboard.contributionProfit)}
        />
        <Metric
          label="Contribution margin"
          value={formatProfitabilityPercent(
            dashboard.contributionMarginPercent
          )}
        />
      </dl>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border p-4" aria-labelledby="coverage-title">
          <h3 id="coverage-title" className="font-semibold">
            Data coverage and reconciliation
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Metric
              label="Revenue attribution coverage"
              value={formatProfitabilityPercent(
                dashboard.attributionCoveragePercent
              )}
              compact
            />
            <Metric
              label="Frozen cost coverage"
              value={formatProfitabilityPercent(dashboard.costCoveragePercent)}
              compact
            />
            <Metric
              label="Unallocated revenue"
              value={formatProfitCenterAmount(dashboard.unallocatedRevenue)}
              note={`${dashboard.unallocatedRevenueLineCount} unallocated line${
                dashboard.unallocatedRevenueLineCount === 1 ? "" : "s"
              }`}
              compact
            />
          </dl>
          {dashboard.dataGapReasons.length ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Data gaps affect interpretation
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {dashboard.dataGapReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section
          className="rounded-lg border p-4"
          aria-labelledby="recommendation-counts-title"
        >
          <h3 id="recommendation-counts-title" className="font-semibold">
            Open recommendation mix
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["HIGH", "WARNING", "INFO"] as const).map((severity) => (
              <Badge key={severity} variant="outline">
                {severity.toLowerCase()}:{" "}
                {dashboard.recommendationSeverityCounts[severity] ?? 0}
              </Badge>
            ))}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.recommendationCategoryCounts.map((entry) => (
              <li
                key={entry.category}
                className="flex items-center justify-between gap-3"
              >
                <span>{entry.category}</span>
                <span className="text-right">
                  <span className="block font-semibold">{entry.count}</span>
                  {entry.deterministicImpact ? (
                    <span className="block text-xs text-muted-foreground">
                      Impact{" "}
                      {formatProfitCenterAmount(entry.deterministicImpact)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-lg border p-4" aria-labelledby="composition-title">
        <h3 id="composition-title" className="font-semibold">
          Frozen cost composition
        </h3>
        {dashboard.costComposition.length ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dashboard.costComposition.map((component) => (
              <Metric
                key={component.label}
                label={component.label}
                value={
                  component.value
                    ? formatProfitCenterAmount(component.value)
                    : formatProfitabilityPercent(component.percent)
                }
                note={component.note}
                compact
              />
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Cost composition is not available from the server for this period.
          </p>
        )}
      </section>

      <section className="rounded-lg border p-4" aria-labelledby="trends-title">
        <h3 id="trends-title" className="font-semibold">
          Contribution trends
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Each value is returned by the server; the browser does not derive
          contribution or margin.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="responsive-table w-full text-sm">
            <caption className="sr-only">
              Server-provided attributed revenue, frozen cost, contribution
              profit and contribution margin trends
            </caption>
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left" scope="col">Period</th>
                <th className="p-3 text-right" scope="col">Attributed revenue</th>
                <th className="p-3 text-right" scope="col">Frozen cost</th>
                <th className="p-3 text-right" scope="col">Contribution profit</th>
                <th className="p-3 text-right" scope="col">Contribution margin</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.trends.map((trend) => (
                <tr key={trend.period} className="border-t">
                  <th className="p-3 text-left" scope="row">{trend.period}</th>
                  <td className="p-3 text-right" data-label="Attributed revenue">
                    {formatProfitCenterAmount(trend.attributedRevenue)}
                  </td>
                  <td className="p-3 text-right" data-label="Frozen cost">
                    {formatProfitCenterAmount(trend.frozenCost)}
                  </td>
                  <td className="p-3 text-right" data-label="Contribution profit">
                    {formatProfitCenterAmount(trend.contributionProfit)}
                  </td>
                  <td className="p-3 text-right" data-label="Contribution margin">
                    {formatProfitabilityPercent(
                      trend.contributionMarginPercent
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProductRanking
          title="Top products"
          products={dashboard.topProducts}
          onOpenProduct={onOpenProduct}
        />
        <ProductRanking
          title="Bottom products"
          products={dashboard.bottomProducts}
          onOpenProduct={onOpenProduct}
        />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  note,
  compact = false,
}: {
  label: string;
  value: string;
  note?: string | null;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "rounded-lg border p-4"}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
      {note ? <dd className="text-xs text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

function ProductRanking({
  title,
  products,
  onOpenProduct,
}: {
  title: string;
  products: ProfitCenterProductRank[];
  onOpenProduct: (productId: string) => void;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-semibold">{title}</h3>
      {!products.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No ranked products are available for this period.
        </p>
      ) : (
        <ul className="mt-3 divide-y">
          {products.map((product) => (
            <li
              key={product.productId}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{product.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {product.productCode} · {product.completeness.toLowerCase()} ·{" "}
                  {product.freshness.toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:text-right">
                <div>
                  <p>{formatProfitCenterAmount(product.contributionProfit)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatProfitabilityPercent(
                      product.contributionMarginPercent
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenProduct(product.productId)}
                >
                  View product
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatProfitCenterAmount(amount: ProfitCenterAmount) {
  if (
    amount.value === null ||
    amount.value === undefined ||
    !amount.currency
  ) {
    return amount.unavailableReason
      ? `Not available (${amount.unavailableReason.replaceAll("_", " ").toLowerCase()})`
      : "Not available";
  }

  return formatProfitabilityMoney({
    currency: amount.currency,
    value: amount.value,
  });
}
