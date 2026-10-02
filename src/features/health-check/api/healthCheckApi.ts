import { baseApi } from "@/services/baseApi";
import type { ApiResponse, PageResponse } from "@/types/api";
import type {
  HealthCheckLeadDetail,
  HealthCheckLeadFilters,
  HealthCheckLeadSummary,
  HealthCheckResult,
  HealthCheckSubmission,
  HealthCheckSubmissionResult,
  UpdateHealthCheckLead,
} from "../types";

export const healthCheckApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitHealthCheck: builder.mutation<ApiResponse<HealthCheckSubmissionResult>, HealthCheckSubmission>({
      query: (body) => ({ url: "/api/public/health-check", method: "POST", body }),
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
  useSubmitHealthCheckMutation,
  useGetHealthCheckResultQuery,
  useGetHealthCheckLeadsQuery,
  useGetHealthCheckLeadQuery,
  useUpdateHealthCheckLeadMutation,
} = healthCheckApi;
