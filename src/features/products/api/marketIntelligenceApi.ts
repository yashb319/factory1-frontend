import { baseApi } from "@/services/baseApi";
import type { CostingApiEnvelope } from "./costingContract";
import { unwrapCostingEnvelope } from "./costingContract";
import type {
  MarketAvailabilityDto,
  MarketComparablesPageDto,
  MarketRunsPageDto,
  MarketSearchRunDto,
  MarketSearchRunRequestDto,
  MarketSummaryDto,
} from "../types/marketIntelligenceApi.types";
import type {
  MarketComparableFilters,
  MarketSearchRequest,
} from "../types/marketIntelligence.types";

export const MARKET_INTELLIGENCE_API_ROUTES = {
  root: "/api/costing/market",
  availability: "/api/costing/market/availability",
} as const;

export function toMarketRunRequest(
  request: MarketSearchRequest
): MarketSearchRunRequestDto {
  const attributes = request.attributes;
  return {
    query: stringAttribute(attributes, "query"),
    material: stringAttribute(attributes, "material"),
    dimensions: stringAttribute(attributes, "dimensions"),
    quality: stringAttribute(attributes, "quality"),
    customization: stringAttribute(attributes, "customization"),
    packaging: stringAttribute(attributes, "packaging"),
    marketChannel: marketChannelAttribute(attributes.marketChannel),
    currency: "INR",
    country: "IN",
    maxResults: 40,
    requestKey: request.requestKey,
  };
}

export const marketIntelligenceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMarketAvailability: builder.query<MarketAvailabilityDto, void>({
      query: () => MARKET_INTELLIGENCE_API_ROUTES.availability,
      transformResponse: (response: CostingApiEnvelope<MarketAvailabilityDto>) =>
        unwrapCostingEnvelope(response),
      providesTags: [{ type: "MarketIntelligence", id: "AVAILABILITY" }],
    }),
    startMarketRun: builder.mutation<MarketSearchRunDto, MarketSearchRequest>({
      query: (request) => ({
        url: `${MARKET_INTELLIGENCE_API_ROUTES.root}/products/${request.productId}/runs`,
        method: "POST",
        body: toMarketRunRequest(request),
      }),
      transformResponse: (response: CostingApiEnvelope<MarketSearchRunDto>) =>
        unwrapCostingEnvelope(response),
      invalidatesTags: (_result, _error, request) => [
        { type: "MarketIntelligence", id: `${request.productId}:RUNS` },
        { type: "MarketIntelligence", id: `${request.productId}:COMPARABLES` },
        { type: "MarketIntelligence", id: `${request.productId}:SUMMARY` },
      ],
    }),
    retryMarketRun: builder.mutation<
      MarketSearchRunDto,
      { productId: string; runId: string; requestKey: string }
    >({
      query: ({ runId, requestKey }) => ({
        url: `${MARKET_INTELLIGENCE_API_ROUTES.root}/runs/${runId}/retry`,
        method: "POST",
        body: { requestKey },
      }),
      transformResponse: (response: CostingApiEnvelope<MarketSearchRunDto>) =>
        unwrapCostingEnvelope(response),
      invalidatesTags: (_result, _error, request) => [
        { type: "MarketIntelligence", id: `${request.productId}:RUNS` },
        { type: "MarketIntelligence", id: `${request.productId}:COMPARABLES` },
        { type: "MarketIntelligence", id: `${request.productId}:SUMMARY` },
      ],
    }),
    getMarketRun: builder.query<MarketSearchRunDto, string>({
      query: (runId) =>
        `${MARKET_INTELLIGENCE_API_ROUTES.root}/runs/${runId}`,
      transformResponse: (response: CostingApiEnvelope<MarketSearchRunDto>) =>
        unwrapCostingEnvelope(response),
      providesTags: (_result, _error, runId) => [
        { type: "MarketIntelligence", id: `RUN:${runId}` },
      ],
    }),
    getMarketRuns: builder.query<
      MarketRunsPageDto,
      { productId: string; page?: number; size?: number }
    >({
      query: ({ productId, page = 0, size = 20 }) => ({
        url: `${MARKET_INTELLIGENCE_API_ROUTES.root}/products/${productId}/runs`,
        params: { page, size },
      }),
      transformResponse: (response: CostingApiEnvelope<MarketRunsPageDto>) =>
        unwrapCostingEnvelope(response),
      providesTags: (_result, _error, request) => [
        { type: "MarketIntelligence", id: `${request.productId}:RUNS` },
      ],
    }),
    getMarketComparables: builder.query<
      MarketComparablesPageDto,
      { productId: string; filters: MarketComparableFilters }
    >({
      query: ({ productId, filters }) => ({
        url: `${MARKET_INTELLIGENCE_API_ROUTES.root}/products/${productId}/comparables`,
        params: {
          page: filters.page,
          size: filters.size,
          accepted:
            filters.decision === "ALL"
              ? undefined
              : filters.decision === "ACCEPTED",
          freshness:
            filters.freshness === "ALL" ? undefined : filters.freshness,
          channel: filters.channel === "ALL" ? undefined : filters.channel,
        },
      }),
      transformResponse: (
        response: CostingApiEnvelope<MarketComparablesPageDto>
      ) => unwrapCostingEnvelope(response),
      providesTags: (_result, _error, request) => [
        { type: "MarketIntelligence", id: `${request.productId}:COMPARABLES` },
      ],
    }),
    getMarketSummary: builder.query<MarketSummaryDto, string>({
      query: (productId) =>
        `${MARKET_INTELLIGENCE_API_ROUTES.root}/products/${productId}/summary`,
      transformResponse: (response: CostingApiEnvelope<MarketSummaryDto>) =>
        unwrapCostingEnvelope(response),
      providesTags: (_result, _error, productId) => [
        { type: "MarketIntelligence", id: `${productId}:SUMMARY` },
      ],
    }),
  }),
});

function stringAttribute(
  attributes: Record<string, string | number>,
  key: string
) {
  const value = attributes[key];
  return typeof value === "string" ? value : undefined;
}

function marketChannelAttribute(value: string | number | undefined) {
  return value === "WHOLESALE" ||
    value === "RETAIL" ||
    value === "MANUFACTURER" ||
    value === "DISTRIBUTOR" ||
    value === "UNKNOWN"
    ? value
    : undefined;
}

export const {
  useGetMarketAvailabilityQuery,
  useStartMarketRunMutation,
  useRetryMarketRunMutation,
  useGetMarketRunQuery,
  useGetMarketRunsQuery,
  useGetMarketComparablesQuery,
  useGetMarketSummaryQuery,
} = marketIntelligenceApi;
