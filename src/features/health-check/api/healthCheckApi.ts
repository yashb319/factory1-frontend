import { baseApi } from "@/services/baseApi";
import type { ApiResponse, PageResponse } from "@/types/api";
import type {
  CreateHealthCheckDraftRequest,
  FinalizeHealthCheckDraftResult,
  HealthCheckLeadDetail,
  HealthCheckLeadFilters,
  HealthCheckLeadSummary,
  HealthCheckRemoteDraft,
  HealthCheckResult,
  UpdateHealthCheckDraftRequest,
  UpdateHealthCheckLead,
} from "../types";

export const healthCheckApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createHealthCheckDraft: builder.mutation<ApiResponse<HealthCheckRemoteDraft>, CreateHealthCheckDraftRequest>({
      query: (body) => ({ url: "/api/public/health-check/drafts", method: "POST", body }),
    }),
    updateHealthCheckDraft: builder.mutation<
      ApiResponse<HealthCheckRemoteDraft>,
      { draftToken: string; body: UpdateHealthCheckDraftRequest }
    >({
      query: ({ draftToken, body }) => ({
        url: `/api/public/health-check/drafts/${encodeURIComponent(draftToken)}`,
        method: "PATCH",
        body,
      }),
    }),
    finalizeHealthCheckDraft: builder.mutation<ApiResponse<FinalizeHealthCheckDraftResult>, string>({
      query: (draftToken) => ({
        url: `/api/public/health-check/drafts/${encodeURIComponent(draftToken)}/finalize`,
        method: "POST",
      }),
    }),
    getHealthCheckResult: builder.query<ApiResponse<HealthCheckResult>, string>({
      query: (token) => `/api/public/health-check/results/${encodeURIComponent(token)}`,
    }),
    getHealthCheckLeads: builder.query<ApiResponse<PageResponse<HealthCheckLeadSummary>>, HealthCheckLeadFilters>({
      query: (params) => ({
        url: "/api/saas-admin/health-check-leads",
        params,
      }),
      providesTags: ["HealthCheckLead"],
    }),
    getHealthCheckLead: builder.query<ApiResponse<HealthCheckLeadDetail>, string>({
      query: (id) => `/api/saas-admin/health-check-leads/${id}`,
      providesTags: (_result, _error, id) => [{ type: "HealthCheckLead", id }],
    }),
    updateHealthCheckLead: builder.mutation<ApiResponse<HealthCheckLeadDetail>, { id: string; body: UpdateHealthCheckLead }>({
      query: ({ id, body }) => ({
        url: `/api/saas-admin/health-check-leads/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ["HealthCheckLead", { type: "HealthCheckLead", id }],
    }),
  }),
});

export const {
  useCreateHealthCheckDraftMutation,
  useUpdateHealthCheckDraftMutation,
  useFinalizeHealthCheckDraftMutation,
  useGetHealthCheckResultQuery,
  useGetHealthCheckLeadsQuery,
  useGetHealthCheckLeadQuery,
  useUpdateHealthCheckLeadMutation,
} = healthCheckApi;
