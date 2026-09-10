import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  ModuleAddon,
  ModuleAddonRequest,
  PricingPlan,
  PricingPlanRequest,
  PricingReorderRequest,
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

    getPricingPlans: builder.query<ApiResponse<PricingPlan[]>, void>({
      query: () => "/api/saas-admin/pricing/plans",
      providesTags: ["SaasAdmin"],
    }),

    createPricingPlan: builder.mutation<
      ApiResponse<PricingPlan>,
      PricingPlanRequest
    >({
      query: (body) => ({
        url: "/api/saas-admin/pricing/plans",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    updatePricingPlan: builder.mutation<
      ApiResponse<PricingPlan>,
      { id: string; body: PricingPlanRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/saas-admin/pricing/plans/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    deletePricingPlan: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/api/saas-admin/pricing/plans/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    reorderPricingPlans: builder.mutation<
      ApiResponse<PricingPlan[]>,
      PricingReorderRequest
    >({
      query: (body) => ({
        url: "/api/saas-admin/pricing/plans/reorder",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    getModuleAddons: builder.query<ApiResponse<ModuleAddon[]>, void>({
      query: () => "/api/saas-admin/pricing/add-ons",
      providesTags: ["SaasAdmin"],
    }),

    createModuleAddon: builder.mutation<
      ApiResponse<ModuleAddon>,
      ModuleAddonRequest
    >({
      query: (body) => ({
        url: "/api/saas-admin/pricing/add-ons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    updateModuleAddon: builder.mutation<
      ApiResponse<ModuleAddon>,
      { id: string; body: ModuleAddonRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/saas-admin/pricing/add-ons/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    deleteModuleAddon: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/api/saas-admin/pricing/add-ons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SaasAdmin"],
    }),

    reorderModuleAddons: builder.mutation<
      ApiResponse<ModuleAddon[]>,
      PricingReorderRequest
    >({
      query: (body) => ({
        url: "/api/saas-admin/pricing/add-ons/reorder",
        method: "PUT",
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
  useGetPricingPlansQuery,
  useCreatePricingPlanMutation,
  useUpdatePricingPlanMutation,
  useDeletePricingPlanMutation,
  useReorderPricingPlansMutation,
  useGetModuleAddonsQuery,
  useCreateModuleAddonMutation,
  useUpdateModuleAddonMutation,
  useDeleteModuleAddonMutation,
  useReorderModuleAddonsMutation,
  useGetSaasAdminInsightsQuery,
  useUpdateSaasFactoryStatusMutation,
  useTerminateSaasFactoryMutation,
  useMarkPaidSaasFactoryMutation,
  useSendSaasMarketingMutation,
} = saasAdminApi;
