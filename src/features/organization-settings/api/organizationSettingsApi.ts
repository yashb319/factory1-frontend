
import { baseApi } from "@/services/baseApi";
import {
  ApiResponse,
  MessageResponse,
  OrganizationSettingsRequest,
  OrganizationSettingsResponse,
  PlanChangeRequest,
  PlanOffer,
  PlanOption,
} from "../types/organizationSettings.types";

export const organizationSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizationSettings: builder.query<
      ApiResponse<OrganizationSettingsResponse>,
      void
    >({
      query: () => "/api/organization/settings",
      providesTags: ["OrganizationSettings"],
    }),

    getOrganizationPlanOptions: builder.query<ApiResponse<PlanOption[]>, void>({
      query: () => "/api/public/plans",
      providesTags: ["OrganizationSettings"],
    }),

    getOrganizationPlanOffers: builder.query<ApiResponse<PlanOffer[]>, void>({
      query: () => "/api/public/offers",
      providesTags: ["OrganizationSettings"],
    }),

    updateOrganizationSettings: builder.mutation<
      ApiResponse<OrganizationSettingsResponse>,
      OrganizationSettingsRequest
    >({
      query: (body) => ({
        url: "/api/organization/settings",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["OrganizationSettings", "Payroll"],
    }),

    regenerateAttendanceCaptureKey: builder.mutation<
      ApiResponse<OrganizationSettingsResponse>,
      void
    >({
      query: () => ({
        url: "/api/organization/settings/attendance-capture-key",
        method: "POST",
      }),
      invalidatesTags: ["OrganizationSettings"],
    }),

    requestPlanChange: builder.mutation<
      ApiResponse<MessageResponse>,
      PlanChangeRequest
    >({
      query: (body) => ({
        url: "/api/organization/settings/plan-change-request",
        method: "POST",
        body,
      }),
    }),

    terminateOrganization: builder.mutation<ApiResponse<MessageResponse>, void>({
      query: () => ({
        url: "/api/organization/settings/terminate",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetOrganizationSettingsQuery,
  useGetOrganizationPlanOffersQuery,
  useGetOrganizationPlanOptionsQuery,
  useRegenerateAttendanceCaptureKeyMutation,
  useRequestPlanChangeMutation,
  useUpdateOrganizationSettingsMutation,
  useTerminateOrganizationMutation,
} = organizationSettingsApi;
