"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/apiError";
import {
  combineProductProfitability,
  useGetProductProfitabilityDetailQuery,
  useGetProductProfitabilityTrendsQuery,
  useGetProfitabilityPortfolioQuery,
} from "../api/profitabilityApi";
import type {
  ProfitabilityFilters,
  ProductProfitabilitySummary,
} from "../types/profitability.types";
import { ProductProfitabilityDetailDialog } from "./ProductProfitabilityDetail";
import { ProfitabilityPortfolio } from "./ProfitabilityPortfolio";

export function ProfitabilityWorkspace({
  onConfigureCosting,
}: {
  onConfigureCosting: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams]
  );
  const selectedProductId = searchParams.get("profitabilityProduct");

  const portfolioQuery = useGetProfitabilityPortfolioQuery(filters);
  const detailArgs = selectedProductId
    ? {
        productId: selectedProductId,
        from: filters.from,
        to: filters.to,
      }
    : { productId: "", from: filters.from, to: filters.to };
  const detailQuery = useGetProductProfitabilityDetailQuery(detailArgs, {
    skip: !selectedProductId,
  });
  const trendsQuery = useGetProductProfitabilityTrendsQuery(detailArgs, {
    skip: !selectedProductId,
  });
  const detail = combineProductProfitability(
    detailQuery.data,
    trendsQuery.data
  );

  const updateSearch = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const updateFilters = (next: ProfitabilityFilters) => {
    updateSearch({
      from: next.from,
      to: next.to,
      profitabilityPage: String(next.page),
      profitabilitySize: String(next.size),
      profitabilitySearch: next.search || null,
      profitabilityHealth: next.health === "ALL" ? null : next.health,
      profitabilityCompleteness:
        next.completeness === "ALL" ? null : next.completeness,
      profitabilitySort: next.sort,
      profitabilityDirection: next.direction,
      profitabilityProduct: null,
    });
  };

  const openDetail = (product: ProductProfitabilitySummary) => {
    updateSearch({ profitabilityProduct: product.productId });
  };

  return (
    <>
      <ProfitabilityPortfolio
        portfolio={portfolioQuery.data}
        filters={filters}
        loading={portfolioQuery.isLoading}
        fetching={portfolioQuery.isFetching}
        error={
          portfolioQuery.isError
            ? getErrorMessage(
                portfolioQuery.error,
                "The server could not load product profitability."
              )
            : null
        }
        onFiltersChange={updateFilters}
        onRetry={() => void portfolioQuery.refetch()}
        onOpenDetail={openDetail}
        onConfigureCosting={onConfigureCosting}
      />

      <ProductProfitabilityDetailDialog
        open={Boolean(selectedProductId)}
        onOpenChange={(open) => {
          if (!open) updateSearch({ profitabilityProduct: null });
        }}
        detail={detail}
        loading={detailQuery.isLoading || trendsQuery.isLoading}
        error={
          detailQuery.isError
            ? getErrorMessage(
                detailQuery.error,
                "The server could not load profitability detail."
              )
            : trendsQuery.isError
              ? getErrorMessage(
                  trendsQuery.error,
                  "The server could not load profitability trends."
                )
              : null
        }
        onRetry={() => {
          void detailQuery.refetch();
          void trendsQuery.refetch();
        }}
        onConfigureCosting={onConfigureCosting}
      />
    </>
  );
}

export function filtersFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): ProfitabilityFilters {
  const defaults = defaultDateRange();
  const size = numberParam(searchParams.get("profitabilitySize"), 20);
  const page = numberParam(searchParams.get("profitabilityPage"), 0);
  const health = searchParams.get("profitabilityHealth");
  const completeness = searchParams.get("profitabilityCompleteness");
  const sort = searchParams.get("profitabilitySort");
  const direction = searchParams.get("profitabilityDirection");

  return {
    from: searchParams.get("from") || defaults.from,
    to: searchParams.get("to") || defaults.to,
    page: Math.max(0, page),
    size: [10, 20, 50].includes(size) ? size : 20,
    search: searchParams.get("profitabilitySearch") || "",
    health:
      health === "HEALTHY" ||
      health === "OPPORTUNITY" ||
      health === "ATTENTION" ||
      health === "INCOMPLETE" ||
      health === "UNKNOWN"
        ? health
        : "ALL",
    completeness:
      completeness === "COMPLETE" ||
      completeness === "ESTIMATED" ||
      completeness === "INCOMPLETE"
        ? completeness
        : "ALL",
    sort:
      sort === "ATTRIBUTED_REVENUE" ||
      sort === "COST" ||
      sort === "MARGIN" ||
      sort === "HEALTH" ||
      sort === "FRESHNESS"
        ? sort
        : "PRODUCT",
    direction: direction === "DESC" ? "DESC" : "ASC",
  };
}

function numberParam(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 89);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
