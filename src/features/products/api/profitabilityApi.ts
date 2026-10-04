import { baseApi } from "@/services/baseApi";
import type { CostingApiEnvelope } from "./costingContract";
import { unwrapCostingEnvelope } from "./costingContract";
import {
  toProductProfitabilityDetail,
  toProfitabilityPortfolio,
} from "./profitabilityAdapters";
import type {
  ProductProfitabilityDetailDto,
  ProductProfitabilityPortfolioDto,
  ProductProfitabilityTrendsDto,
  ProfitabilityPortfolioQuery,
} from "../types/profitabilityApi.types";
import type {
  ProductProfitabilityDetail,
  ProfitabilityFilters,
  ProfitabilityPortfolioView,
} from "../types/profitability.types";

export const PROFITABILITY_API_ROUTES = {
  products: "/api/costing/profitability/products",
} as const;

export type ProductProfitabilityQuery = {
  productId: string;
  from: string;
  to: string;
};

const PROFITABILITY_SORT_PARAMS: Record<
  ProfitabilityFilters["sort"],
  NonNullable<ProfitabilityPortfolioQuery["sort"]>
> = {
  PRODUCT: "PRODUCT_NAME",
  ATTRIBUTED_REVENUE: "REVENUE",
  COST: "COST",
  MARGIN: "MARGIN_PERCENT",
  HEALTH: "HEALTH",
  FRESHNESS: "SNAPSHOT_AGE_DAYS",
};

export function toProfitabilityPortfolioQuery(
  filters: ProfitabilityFilters
): ProfitabilityPortfolioQuery {
  const query: ProfitabilityPortfolioQuery = {
    from: filters.from,
    to: filters.to,
    page: filters.page,
    size: filters.size,
    direction: filters.direction,
    sort: PROFITABILITY_SORT_PARAMS[filters.sort],
    revenueBasis: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE",
  };

  if (filters.search.trim()) query.search = filters.search.trim();
  if (filters.completeness !== "ALL") {
    query.completeness = filters.completeness;
  }
  if (filters.health === "HEALTHY") query.health = "HEALTHY";
  if (filters.health === "OPPORTUNITY") query.health = "WATCH";
  if (filters.health === "ATTENTION") query.health = "AT_RISK";
  if (filters.health === "UNKNOWN") query.health = "UNKNOWN";
  if (filters.health === "INCOMPLETE") query.completeness = "INCOMPLETE";

  return query;
}

export const profitabilityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfitabilityPortfolio: builder.query<
      ProfitabilityPortfolioView,
      ProfitabilityFilters
    >({
      query: (filters) => ({
        url: PROFITABILITY_API_ROUTES.products,
        params: toProfitabilityPortfolioQuery(filters),
      }),
      transformResponse: (
        response: CostingApiEnvelope<ProductProfitabilityPortfolioDto>
      ) => toProfitabilityPortfolio(unwrapCostingEnvelope(response)),
      providesTags: [{ type: "ProductProfitability", id: "PORTFOLIO" }],
    }),
    getProductProfitabilityDetail: builder.query<
      ProductProfitabilityDetailDto,
      ProductProfitabilityQuery
    >({
      query: ({ productId, from, to }) => ({
        url: `${PROFITABILITY_API_ROUTES.products}/${productId}`,
        params: { from, to },
      }),
      transformResponse: (
        response: CostingApiEnvelope<ProductProfitabilityDetailDto>
      ) => unwrapCostingEnvelope(response),
      providesTags: (_result, _error, args) => [
        { type: "ProductProfitability", id: args.productId },
      ],
    }),
    getProductProfitabilityTrends: builder.query<
      ProductProfitabilityTrendsDto,
      ProductProfitabilityQuery
    >({
      query: ({ productId, from, to }) => ({
        url: `${PROFITABILITY_API_ROUTES.products}/${productId}/trends`,
        params: { from, to, grain: "MONTH" },
      }),
      transformResponse: (
        response: CostingApiEnvelope<ProductProfitabilityTrendsDto>
      ) => unwrapCostingEnvelope(response),
      providesTags: (_result, _error, args) => [
        { type: "ProductProfitability", id: `${args.productId}:TRENDS` },
      ],
    }),
  }),
});

export function combineProductProfitability(
  detail: ProductProfitabilityDetailDto | undefined,
  trends: ProductProfitabilityTrendsDto | undefined
): ProductProfitabilityDetail | null {
  return detail && trends
    ? toProductProfitabilityDetail(detail, trends)
    : null;
}

export const {
  useGetProfitabilityPortfolioQuery,
  useGetProductProfitabilityDetailQuery,
  useGetProductProfitabilityTrendsQuery,
} = profitabilityApi;
