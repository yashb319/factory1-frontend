import { baseApi } from "@/services/baseApi";
import type { ApiResponse } from "@/features/saas-admin/types/saasAdmin.types";
import type { OrganizationFeaturesResponse } from "../types/organizationFeatures.types";

export const organizationFeaturesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizationFeatures: builder.query<
      ApiResponse<OrganizationFeaturesResponse>,
      void
    >({
      query: () => "/api/organizations/features",
      providesTags: ["Organization"],
    }),
  }),
});

export const { useGetOrganizationFeaturesQuery } = organizationFeaturesApi;
