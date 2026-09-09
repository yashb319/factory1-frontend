import { baseApi } from "@/services/baseApi";
import type { ApiResponse } from "../types/saasAdmin.types";
import type {
  FeatureCatalogItem,
  FeatureOverrideRequest,
  OrganizationFeatureDetail,
  OrganizationFeatureSummary,
} from "../types/featureGating.types";

export const featureGatingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeatureCatalog: builder.query<ApiResponse<FeatureCatalogItem[]>, void>({
      query: () => "/api/saas-admin/features/catalog",
      providesTags: ["FeatureGating"],
    }),

    getOrgFeatureSummaries: builder.query<
      ApiResponse<OrganizationFeatureSummary[]>,
      void
    >({
      query: () => "/api/saas-admin/features/organizations",
      providesTags: ["FeatureGating"],
    }),

    getOrgFeatureDetail: builder.query<
      ApiResponse<OrganizationFeatureDetail>,
      string
    >({
      query: (organizationId) =>
        `/api/saas-admin/features/organizations/${organizationId}`,
      providesTags: ["FeatureGating"],
    }),

    setOrgFeature: builder.mutation<
      ApiResponse<OrganizationFeatureDetail>,
      { organizationId: string; featureKey: string; body: FeatureOverrideRequest }
    >({
      query: ({ organizationId, featureKey, body }) => ({
        url: `/api/saas-admin/features/organizations/${organizationId}/features/${featureKey}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FeatureGating", "Organization"],
    }),

    clearOrgFeatureOverride: builder.mutation<
      ApiResponse<OrganizationFeatureDetail>,
      { organizationId: string; featureKey: string }
    >({
      query: ({ organizationId, featureKey }) => ({
        url: `/api/saas-admin/features/organizations/${organizationId}/features/${featureKey}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FeatureGating", "Organization"],
    }),
  }),
});

export const {
  useGetFeatureCatalogQuery,
  useGetOrgFeatureSummariesQuery,
  useGetOrgFeatureDetailQuery,
  useSetOrgFeatureMutation,
  useClearOrgFeatureOverrideMutation,
} = featureGatingApi;
