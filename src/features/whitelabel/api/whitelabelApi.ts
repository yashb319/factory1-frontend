import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  PublicWhitelabelBranding,
  WhitelabelOrganization,
  WhitelabelOrganizationAdminUpdateRequest,
  WhitelabelOrganizationPartnerUpdateRequest,
  WhitelabelPartner,
  WhitelabelPartnerRequest,
} from "../types/whitelabel.types";

export const whitelabelApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // --- SaaS admin (global) ---
    getSaasWhitelabelOrganizations: builder.query<
      ApiResponse<WhitelabelOrganization[]>,
      void
    >({
      query: () => "/api/saas-admin/whitelabel/organizations",
      providesTags: ["Whitelabel"],
    }),

    getSaasWhitelabelOrganization: builder.query<
      ApiResponse<WhitelabelOrganization>,
      string
    >({
      query: (organizationId) =>
        `/api/saas-admin/whitelabel/organizations/${organizationId}`,
      providesTags: (_result, _error, organizationId) => [
        { type: "Whitelabel", id: organizationId },
      ],
    }),

    updateSaasWhitelabelOrganization: builder.mutation<
      ApiResponse<WhitelabelOrganization>,
      { organizationId: string; body: WhitelabelOrganizationAdminUpdateRequest }
    >({
      query: ({ organizationId, body }) => ({
        url: `/api/saas-admin/whitelabel/organizations/${organizationId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        "Whitelabel",
        { type: "Whitelabel", id: organizationId },
      ],
    }),

    deleteSaasWhitelabelOrganization: builder.mutation<
      ApiResponse<WhitelabelOrganization>,
      string
    >({
      query: (organizationId) => ({
        url: `/api/saas-admin/whitelabel/organizations/${organizationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Whitelabel"],
    }),

    getSaasWhitelabelPartners: builder.query<
      ApiResponse<WhitelabelPartner[]>,
      void
    >({
      query: () => "/api/saas-admin/whitelabel/partners",
      providesTags: ["WhitelabelPartner"],
    }),

    createSaasWhitelabelPartner: builder.mutation<
      ApiResponse<WhitelabelPartner>,
      WhitelabelPartnerRequest
    >({
      query: (body) => ({
        url: "/api/saas-admin/whitelabel/partners",
        method: "POST",
        body,
      }),
      invalidatesTags: ["WhitelabelPartner"],
    }),

    updateSaasWhitelabelPartner: builder.mutation<
      ApiResponse<WhitelabelPartner>,
      { id: string; body: WhitelabelPartnerRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/saas-admin/whitelabel/partners/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["WhitelabelPartner"],
    }),

    // --- Partner-scoped ---
    getPartnerWhitelabelOrganizations: builder.query<
      ApiResponse<WhitelabelOrganization[]>,
      void
    >({
      query: () => "/api/partner/whitelabel/organizations",
      providesTags: ["Whitelabel"],
    }),

    getPartnerWhitelabelOrganization: builder.query<
      ApiResponse<WhitelabelOrganization>,
      string
    >({
      query: (organizationId) =>
        `/api/partner/whitelabel/organizations/${organizationId}`,
      providesTags: (_result, _error, organizationId) => [
        { type: "Whitelabel", id: organizationId },
      ],
    }),

    updatePartnerWhitelabelOrganization: builder.mutation<
      ApiResponse<WhitelabelOrganization>,
      {
        organizationId: string;
        body: WhitelabelOrganizationPartnerUpdateRequest;
      }
    >({
      query: ({ organizationId, body }) => ({
        url: `/api/partner/whitelabel/organizations/${organizationId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        "Whitelabel",
        { type: "Whitelabel", id: organizationId },
      ],
    }),

    // --- Public, unauthenticated lookup used for runtime branding ---
    getPublicWhitelabelBranding: builder.query<
      ApiResponse<PublicWhitelabelBranding | null>,
      string
    >({
      query: (domain) => ({
        url: "/api/public/whitelabel/by-domain",
        params: { domain },
      }),
    }),

    /**
     * Authenticated branding for the caller's own organization. Needed on the
     * shared app domain, where the public by-domain lookup cannot identify an
     * organization from the hostname alone.
     */
    getCurrentWhitelabelBranding: builder.query<
      ApiResponse<PublicWhitelabelBranding | null>,
      void
    >({
      query: () => "/api/whitelabel/branding/me",
      providesTags: ["Whitelabel"],
    }),
  }),
});

export const {
  useGetSaasWhitelabelOrganizationsQuery,
  useGetSaasWhitelabelOrganizationQuery,
  useUpdateSaasWhitelabelOrganizationMutation,
  useDeleteSaasWhitelabelOrganizationMutation,
  useGetSaasWhitelabelPartnersQuery,
  useCreateSaasWhitelabelPartnerMutation,
  useUpdateSaasWhitelabelPartnerMutation,
  useGetPartnerWhitelabelOrganizationsQuery,
  useGetPartnerWhitelabelOrganizationQuery,
  useUpdatePartnerWhitelabelOrganizationMutation,
  useGetPublicWhitelabelBrandingQuery,
  useGetCurrentWhitelabelBrandingQuery,
} = whitelabelApi;
