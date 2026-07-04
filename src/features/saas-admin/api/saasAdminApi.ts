import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  SaasAdminDashboard,
  SaasFactory,
  SaasFactoryUpdateRequest,
  SaasPlanOption,
  SaasPlanUpdateRequest,
} from "../types/saasAdmin.types";

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
  }),
});

export const {
  useGetSaasAdminDashboardQuery,
  useUpdateSaasFactoryMutation,
  useUpdateSaasPlanMutation,
} = saasAdminApi;
