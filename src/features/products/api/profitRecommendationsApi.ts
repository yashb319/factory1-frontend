import { baseApi } from "@/services/baseApi";
import type { CostingApiEnvelope } from "./costingContract";
import { unwrapCostingEnvelope } from "./costingContract";
import {
  toProfitCenterDashboard,
  toProfitRecommendation,
  toRecommendationJob,
  toRecommendationPreferences,
} from "./profitRecommendationsAdapters";
import type {
  ProfitCenterDashboardDto,
  ProfitRecommendationDto,
  ProfitRecommendationPageDto,
  RecommendationPreferencesDto,
  RecommendationQueryDto,
  RecommendationRefreshDto,
} from "../types/profitRecommendationsApi.types";
import type {
  ProfitCenterDashboard,
  ProfitRecommendation,
  RecommendationFilters,
  RecommendationGenerationJob,
  RecommendationLifecycleAction,
  RecommendationPage,
  RecommendationPreferences,
  RecommendationSeverity,
} from "../types/profitRecommendations.types";

export const PROFIT_RECOMMENDATIONS_API_ROUTES = {
  root: "/api/costing/profit-center",
  dashboard: "/api/costing/profit-center/dashboard",
  recommendations: "/api/costing/profit-center/recommendations",
  refresh: "/api/costing/profit-center/refresh",
  preferences: "/api/costing/profit-center/notification-preferences",
} as const;

export type ProfitCenterPeriod = { from: string; to: string };

export type RecommendationLifecycleRequest = {
  id: string;
  action: RecommendationLifecycleAction;
  expectedVersion: number;
  reason?: string;
};

export function toRecommendationQuery(
  filters: RecommendationFilters
): RecommendationQueryDto {
  return {
    page: filters.page,
    size: filters.size,
    status: filters.lifecycle === "ALL" ? undefined : filters.lifecycle,
    type: filters.type === "ALL" ? undefined : filters.type,
    severity: filters.severity === "ALL" ? undefined : filters.severity,
    productId: filters.productId || undefined,
    freshness: filters.freshness === "ALL" ? undefined : filters.freshness,
  };
}

const actionPath: Record<RecommendationLifecycleAction, string> = {
  ACKNOWLEDGE: "acknowledge",
  DISMISS: "dismiss",
  RESTORE: "restore",
  RESOLVE: "resolve",
};

export function recommendationLifecycleBody(
  request: RecommendationLifecycleRequest
) {
  return {
    expectedVersion: request.expectedVersion,
    ...(request.action === "DISMISS" && request.reason
      ? { reason: request.reason }
      : {}),
  };
}

export const profitRecommendationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfitCenterDashboard: builder.query<
      ProfitCenterDashboard,
      ProfitCenterPeriod
    >({
      query: (period) => ({
        url: PROFIT_RECOMMENDATIONS_API_ROUTES.dashboard,
        params: period,
      }),
      transformResponse: (response: CostingApiEnvelope<ProfitCenterDashboardDto>) =>
        toProfitCenterDashboard(unwrapCostingEnvelope(response)),
      providesTags: [{ type: "ProfitRecommendations", id: "DASHBOARD" }],
    }),
    getProfitRecommendations: builder.query<
      RecommendationPage,
      RecommendationFilters
    >({
      query: (filters) => ({
        url: PROFIT_RECOMMENDATIONS_API_ROUTES.recommendations,
        params: toRecommendationQuery(filters),
      }),
      transformResponse: (
        response: CostingApiEnvelope<ProfitRecommendationPageDto>
      ) => {
        const page = unwrapCostingEnvelope(response);
        return {
          ...page,
          content: page.content.map(toProfitRecommendation),
        };
      },
      providesTags: (result) => [
        { type: "ProfitRecommendations", id: "LIST" },
        ...(result?.content.map((item) => ({
          type: "ProfitRecommendations" as const,
          id: item.id,
        })) ?? []),
      ],
    }),
    getProfitRecommendation: builder.query<ProfitRecommendation, string>({
      query: (id) =>
        `${PROFIT_RECOMMENDATIONS_API_ROUTES.recommendations}/${encodeURIComponent(id)}`,
      transformResponse: (response: CostingApiEnvelope<ProfitRecommendationDto>) =>
        toProfitRecommendation(unwrapCostingEnvelope(response)),
      providesTags: (_result, _error, id) => [
        { type: "ProfitRecommendations", id },
      ],
    }),
    updateRecommendationLifecycle: builder.mutation<
      ProfitRecommendation,
      RecommendationLifecycleRequest
    >({
      query: ({ id, action, expectedVersion, reason }) => ({
        url: `${PROFIT_RECOMMENDATIONS_API_ROUTES.recommendations}/${encodeURIComponent(id)}/${actionPath[action]}`,
        method: "POST",
        body: recommendationLifecycleBody({
          id,
          action,
          expectedVersion,
          reason,
        }),
      }),
      transformResponse: (response: CostingApiEnvelope<ProfitRecommendationDto>) =>
        toProfitRecommendation(unwrapCostingEnvelope(response)),
      invalidatesTags: (_result, _error, request) => [
        { type: "ProfitRecommendations", id: request.id },
        { type: "ProfitRecommendations", id: "LIST" },
        { type: "ProfitRecommendations", id: "DASHBOARD" },
      ],
    }),
    requestRecommendationRefresh: builder.mutation<
      RecommendationGenerationJob,
      ProfitCenterPeriod & { requestKey: string }
    >({
      query: (body) => ({
        url: PROFIT_RECOMMENDATIONS_API_ROUTES.refresh,
        method: "POST",
        body,
      }),
      transformResponse: (response: CostingApiEnvelope<RecommendationRefreshDto>) =>
        toRecommendationJob(unwrapCostingEnvelope(response)),
      invalidatesTags: [{ type: "ProfitRecommendations", id: "REFRESH" }],
    }),
    getRecommendationRefresh: builder.query<
      RecommendationGenerationJob,
      string
    >({
      query: (jobId) =>
        `${PROFIT_RECOMMENDATIONS_API_ROUTES.refresh}/${encodeURIComponent(jobId)}`,
      transformResponse: (response: CostingApiEnvelope<RecommendationRefreshDto>) =>
        toRecommendationJob(unwrapCostingEnvelope(response)),
      providesTags: (_result, _error, id) => [
        { type: "ProfitRecommendations", id: `REFRESH:${id}` },
      ],
    }),
    getRecommendationPreferences: builder.query<
      RecommendationPreferences,
      void
    >({
      query: () => PROFIT_RECOMMENDATIONS_API_ROUTES.preferences,
      transformResponse: (
        response: CostingApiEnvelope<RecommendationPreferencesDto>
      ) => toRecommendationPreferences(unwrapCostingEnvelope(response)),
      providesTags: [{ type: "ProfitRecommendations", id: "PREFERENCES" }],
    }),
    updateRecommendationPreferences: builder.mutation<
      RecommendationPreferences,
      {
        inAppEnabled: boolean;
        emailEnabled: boolean;
        minimumSeverity: RecommendationSeverity;
      }
    >({
      query: (body) => ({
        url: PROFIT_RECOMMENDATIONS_API_ROUTES.preferences,
        method: "PUT",
        body,
      }),
      transformResponse: (
        response: CostingApiEnvelope<RecommendationPreferencesDto>
      ) => toRecommendationPreferences(unwrapCostingEnvelope(response)),
      invalidatesTags: [
        { type: "ProfitRecommendations", id: "PREFERENCES" },
      ],
    }),
  }),
});

export const {
  useGetProfitCenterDashboardQuery,
  useGetProfitRecommendationsQuery,
  useGetProfitRecommendationQuery,
  useUpdateRecommendationLifecycleMutation,
  useRequestRecommendationRefreshMutation,
  useGetRecommendationRefreshQuery,
  useLazyGetRecommendationRefreshQuery,
  useGetRecommendationPreferencesQuery,
  useUpdateRecommendationPreferencesMutation,
} = profitRecommendationsApi;
