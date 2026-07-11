import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  SaasAdminDashboard,
  SaasAdminInsights,
  SaasFactory,
  SaasFactoryStatusRequest,
  SaasFactoryUpdateRequest,
  SaasMarkPaidRequest,
  SaasMarketingRequest,
  SaasOffer,
  SaasOfferRequest,
  SaasPlanOption,
  SaasPlanUpdateRequest,
} from "../types/saasAdmin.types";
import type { MessageResponse } from "@/features/auth/types";

export const saasAdminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSaasAdminDashboard: builder.query<
      ApiResponse<SaasAdminDashboard>,
      void
    >({
      query: () => "/api/saas-admin/dashboard",
      providesTags: ["SaasAdmin"],
    }),

    updateSaasFactory: builder.mutation<
      ApiResponse<SaasFactory>,
      { organizationId: string; body: SaasFactoryUpdateRequest }
    >({
      query: ({ organizationId, body }) => ({
        url: `/api/saas-admin/factories/${organizationId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    updateSaasPlan: builder.mutation<
      ApiResponse<SaasPlanOption>,
      { plan: string; body: SaasPlanUpdateRequest }
    >({
      query: ({ plan, body }) => ({
        url: `/api/saas-admin/plans/${plan}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    createSaasOffer: builder.mutation<ApiResponse<SaasOffer>, SaasOfferRequest>({
      query: (body) => ({
        url: "/api/saas-admin/offers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    getSaasAdminInsights: builder.query<ApiResponse<SaasAdminInsights>, void>({
      query: () => "/api/saas-admin/insights",
      providesTags: ["SaasAdmin"],
    }),

    updateSaasFactoryStatus: builder.mutation<
      ApiResponse<SaasFactory>,
      { organizationId: string; body: SaasFactoryStatusRequest }
    >({
      query: ({ organizationId, body }) => ({
        url: `/api/saas-admin/factories/${organizationId}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    terminateSaasFactory: builder.mutation<ApiResponse<SaasFactory>, string>({
      query: (organizationId) => ({
        url: `/api/saas-admin/factories/${organizationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    markPaidSaasFactory: builder.mutation<
      ApiResponse<SaasFactory>,
      { organizationId: string; body: SaasMarkPaidRequest }
    >({
      query: ({ organizationId, body }) => ({
        url: `/api/saas-admin/factories/${organizationId}/mark-paid`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    sendSaasMarketing: builder.mutation<ApiResponse<MessageResponse>, SaasMarketingRequest>({
      query: (body) => ({
        url: "/api/saas-admin/marketing/send",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetSaasAdminDashboardQuery,
  useCreateSaasOfferMutation,
  useUpdateSaasFactoryMutation,
  useUpdateSaasPlanMutation,
  useGetSaasAdminInsightsQuery,
  useUpdateSaasFactoryStatusMutation,
  useTerminateSaasFactoryMutation,
  useMarkPaidSaasFactoryMutation,
  useSendSaasMarketingMutation,
} = saasAdminApi;
