
import { baseApi } from "@/services/baseApi";
import {
  ApiResponse,
  OrganizationSettingsRequest,
  OrganizationSettingsResponse,
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
  }),
});

export const {
  useGetOrganizationSettingsQuery,
  useRegenerateAttendanceCaptureKeyMutation,
  useUpdateOrganizationSettingsMutation,
} = organizationSettingsApi;
