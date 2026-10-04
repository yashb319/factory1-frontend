"use client";

import { ArrowDown, ArrowUp, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ProfitabilityFilters,
  ProfitabilityHealth,
  ProfitabilityPortfolioView,
  ProfitabilitySort,
  ProductProfitabilitySummary,
} from "../types/profitability.types";
import {
  formatProfitabilityDate,
  formatProfitabilityMoney,
  formatProfitabilityPercent,
} from "../utils/profitabilityPresentation";
import { ProfitabilityHealthBadge } from "./ProfitabilityHealthBadge";

type Props = {
  portfolio: ProfitabilityPortfolioView | undefined;
  filters: ProfitabilityFilters;
  loading: boolean;
  fetching: boolean;
  error?: string | null;
  onFiltersChange: (filters: ProfitabilityFilters) => void;
  onRetry: () => void;
  onOpenDetail: (product: ProductProfitabilitySummary) => void;
  onConfigureCosting: () => void;
};

const healthOptions: Array<ProfitabilityHealth | "ALL"> = [
  "ALL",
  "HEALTHY",
  "OPPORTUNITY",
  "ATTENTION",
  "INCOMPLETE",
  "UNKNOWN",
];

export function ProfitabilityPortfolio({
  portfolio,
  filters,
  loading,
  fetching,
  error,
  onFiltersChange,
  onRetry,
  onOpenDetail,
  onConfigureCosting,
}: Props) {
  const page = portfolio?.products;
  const update = (changes: Partial<ProfitabilityFilters>) =>
    onFiltersChange({ ...filters, page: 0, ...changes });

  return (
    <section className="space-y-4" aria-labelledby="profitability-portfolio-title">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="profitability-portfolio-title" className="text-lg font-semibold">
            Product profitability
          </h2>
          <p className="text-sm text-muted-foreground">
            Server-attributed sales and immutable cost snapshots. Missing
            evidence is never presented as zero.
          </p>
        </div>
        <Button variant="outline" onClick={onConfigureCosting}>
          Configure product costing
        </Button>
      </div>

      <div
        className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-6"
        aria-label="Profitability filters"
      >
        <label className="space-y-1">
          <span className="text-xs font-medium">From</span>
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">To</span>
          <Input
            type="date"
            value={filters.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">Search products</span>
          <Input
            value={filters.search}
            placeholder="Code or product name"
            onChange={(event) => update({ search: event.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">Health</span>
          <Select
            value={filters.health}
            onValueChange={(value) =>
              update({ health: value as ProfitabilityFilters["health"] })
            }
          >
            <SelectTrigger className="w-full" aria-label="Health">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {healthOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "ALL" ? "All health states" : option.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">Completeness</span>
          <Select
            value={filters.completeness}
            onValueChange={(value) =>
              update({
                completeness:
                  value as ProfitabilityFilters["completeness"],
              })
            }
          >
            <SelectTrigger className="w-full" aria-label="Completeness">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All evidence states</SelectItem>
              <SelectItem value="COMPLETE">Complete</SelectItem>
              <SelectItem value="ESTIMATED">Estimated</SelectItem>
              <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">Rows per page</span>
          <Select
            value={String(filters.size)}
            onValueChange={(value) => update({ size: Number(value) })}
          >
            <SelectTrigger className="w-full" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>

      {portfolio ? (
        <dl className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-5">
          <PortfolioMetric
            label="Attributed revenue"
            value={formatProfitabilityMoney(
              portfolio.summary.totalAttributedRevenue
            )}
          />
          <PortfolioMetric
            label="Attributed cost"
            value={formatProfitabilityMoney(portfolio.summary.totalAttributedCost)}
          />
          <PortfolioMetric
            label="Gross profit"
            value={formatProfitabilityMoney(portfolio.summary.totalProfit)}
          />
          <PortfolioMetric
            label="Gross margin"
            value={formatProfitabilityPercent(portfolio.summary.marginPercent)}
          />
          <PortfolioMetric
            label="Unallocated sales"
            value={formatProfitabilityMoney(
              portfolio.summary.unallocatedSalesAmount
            )}
            note={`${portfolio.summary.unallocatedSalesLineCount} unallocated line${
              portfolio.summary.unallocatedSalesLineCount === 1 ? "" : "s"
            }`}
          />
        </dl>
      ) : null}

      {loading ? (
        <p role="status" className="rounded-lg border p-8 text-center">
          Loading profitability portfolio...
        </p>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">
            Profitability portfolio could not be loaded
          </p>
          <p className="mt-1 text-sm text-red-800">{error}</p>
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : !page?.content.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <SlidersHorizontal
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-muted-foreground"
          />
          <p className="mt-3 font-medium">No profitability records found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust the filters, or configure and freeze product costing when
            missing evidence blocks profitability.
          </p>
        </div>
      ) : (
        <>
          {fetching ? (
            <p role="status" className="text-xs text-muted-foreground">
              Updating profitability results...
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-lg border">
            <table className="responsive-table w-full text-sm">
              <caption className="sr-only">
                Product profitability portfolio with attributed revenue,
                immutable cost, gross profit, health, freshness, and sales
                allocation coverage
              </caption>
              <thead className="bg-muted">
                <tr>
                  <SortableHeader
                    label="Product"
                    sort="PRODUCT"
                    filters={filters}
                    onChange={onFiltersChange}
                  />
                  <th className="p-3 text-right" scope="col">
                    Realized price
                  </th>
                  <SortableHeader
                    label="Attributed revenue"
                    sort="ATTRIBUTED_REVENUE"
                    align="right"
                    filters={filters}
                    onChange={onFiltersChange}
                  />
                  <SortableHeader
                    label="Frozen unit cost"
                    sort="COST"
                    align="right"
                    filters={filters}
                    onChange={onFiltersChange}
                  />
                  <th className="p-3 text-right" scope="col">
                    Unit gross profit
                  </th>
                  <SortableHeader
                    label="Gross margin"
                    sort="MARGIN"
                    align="right"
                    filters={filters}
                    onChange={onFiltersChange}
                  />
                  <SortableHeader
                    label="Health"
                    sort="HEALTH"
                    filters={filters}
                    onChange={onFiltersChange}
                  />
                  <SortableHeader
                    label="Snapshot freshness"
                    sort="FRESHNESS"
                    filters={filters}
                    onChange={onFiltersChange}
                  />
                  <th className="p-3 text-right" scope="col">
                    Cost coverage
                  </th>
                  <th className="p-3 text-right" scope="col">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((product) => (
                  <tr key={product.productId} className="border-t align-top">
                    <th className="p-3 text-left" scope="row">
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.productCode}
                      </p>
                    </th>
                    <MetricCell
                      label="Realized price"
                      value={formatProfitabilityMoney(
                        product.realizedUnitSellingPrice
                      )}
                    />
                    <MetricCell
                      label="Attributed revenue"
                      value={formatProfitabilityMoney(product.attributedRevenue)}
                    />
                    <MetricCell
                      label="Frozen unit cost"
                      value={formatProfitabilityMoney(product.frozenUnitCost)}
                    />
                    <MetricCell
                      label="Unit gross profit"
                      value={formatProfitabilityMoney(product.unitProfit)}
                    />
                    <MetricCell
                      label="Gross margin"
                      value={formatProfitabilityPercent(product.marginPercent)}
                    />
                    <td className="p-3" data-label="Health">
                      <ProfitabilityHealthBadge health={product.health} />
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Evidence: {product.completeness.toLowerCase()}
                      </p>
                      {product.reasons.length ? (
                        <p className="mt-1 max-w-52 text-xs text-muted-foreground">
                          {product.reasons.join(" ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3" data-label="Snapshot freshness">
                      <p>{formatProfitabilityDate(product.freshnessAt)}</p>
                      <p className="mt-1 max-w-52 text-xs text-muted-foreground">
                        {product.snapshot
                          ? `Frozen cost snapshot ${product.snapshot.costingSnapshotId ?? "reference unavailable"}`
                          : "No immutable profitability snapshot"}
                      </p>
                    </td>
                    <MetricCell
                      label="Cost coverage"
                      value={formatProfitabilityPercent(
                        product.coverage.allocatedSalesPercent
                      )}
                      note={product.coverage.reason}
                    />
                    <td className="p-3 text-right" data-label="Action">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenDetail(product)}
                      >
                        View intelligence
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>
              {page.totalElements} product
              {page.totalElements === 1 ? "" : "s"} · Page {page.page + 1} of{" "}
              {Math.max(page.totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={fetching || filters.page === 0}
                onClick={() =>
                  onFiltersChange({ ...filters, page: filters.page - 1 })
                }
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  fetching ||
                  filters.page + 1 >= page.totalPages
                }
                onClick={() =>
                  onFiltersChange({ ...filters, page: filters.page + 1 })
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function SortableHeader({
  label,
  sort,
  align = "left",
  filters,
  onChange,
}: {
  label: string;
  sort: ProfitabilitySort;
  align?: "left" | "right";
  filters: ProfitabilityFilters;
  onChange: (filters: ProfitabilityFilters) => void;
}) {
  const active = filters.sort === sort;
  const nextDirection =
    active && filters.direction === "ASC" ? "DESC" : "ASC";

  return (
    <th
      className={align === "right" ? "p-3 text-right" : "p-3 text-left"}
      scope="col"
    >
      <button
        type="button"
        className={`inline-flex items-center gap-1 font-medium ${
          align === "right" ? "ml-auto" : ""
        }`}
        aria-label={`Sort by ${label} ${nextDirection.toLowerCase()}`}
        onClick={() =>
          onChange({
            ...filters,
            page: 0,
            sort,
            direction: nextDirection,
          })
        }
      >
        {label}
        {active ? (
          filters.direction === "ASC" ? (
            <ArrowUp aria-hidden="true" className="h-3 w-3" />
          ) : (
            <ArrowDown aria-hidden="true" className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  );
}

function MetricCell({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | null;
}) {
  return (
    <td className="p-3 text-right" data-label={label}>
      <span>{value}</span>
      {note ? (
        <p className="mt-1 max-w-52 text-xs text-muted-foreground">{note}</p>
      ) : null}
    </td>
  );
}

function PortfolioMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
      {note ? <dd className="text-xs text-muted-foreground">{note}</dd> : null}
    </div>
  );
}
