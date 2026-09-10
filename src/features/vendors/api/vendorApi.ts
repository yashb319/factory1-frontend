import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  PageResponse,
  Vendor,
  VendorAiInsight,
  VendorDashboard,
  VendorRequest,
  VendorSearchParams,
} from "../types/vendor.types";

const cleanParams = (params: VendorSearchParams) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const vendorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVendors: builder.query<PageResponse<Vendor>, VendorSearchParams>({
      query: (params) => ({
        url: "/api/vendors",
        params: cleanParams(params),
      }),
      providesTags: ["Vendor"],
    }),

    getActiveVendors: builder.query<Vendor[], void>({
      query: () => "/api/vendors/active",
      providesTags: ["Vendor"],
    }),

    getVendorDashboard: builder.query<VendorDashboard, void>({
      query: () => "/api/vendors/dashboard",
      providesTags: ["Vendor"],
    }),

    getVendorInsights: builder.query<VendorAiInsight[], void>({
      query: () => "/api/vendors/insights",
      providesTags: ["Vendor"],
    }),

    getVendor: builder.query<Vendor, string>({
      query: (id) => `/api/vendors/${id}`,
      providesTags: ["Vendor"],
    }),

    createVendor: builder.mutation<ApiResponse<Vendor>, VendorRequest>({
      query: (body) => ({
        url: "/api/vendors",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Vendor"],
    }),

    updateVendor: builder.mutation<
      ApiResponse<Vendor>,
      { id: string; body: VendorRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/vendors/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Vendor"],
    }),

    deleteVendor: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/api/vendors/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Vendor"],
    }),
  }),
});

export const {
  useGetVendorsQuery,
  useGetActiveVendorsQuery,
  useGetVendorDashboardQuery,
  useGetVendorInsightsQuery,
  useGetVendorQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} = vendorApi;
