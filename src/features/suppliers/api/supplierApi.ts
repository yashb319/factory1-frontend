
import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  BulkSupplierImportResponse,
  BulkSupplierRequest,
  PageResponse,
  Supplier,
  SupplierAiInsight,
  SupplierDashboard,
  SupplierRequest,
  SupplierSearchParams,
} from "../types/supplier.types";

const cleanParams = (params: SupplierSearchParams) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const supplierApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<PageResponse<Supplier>, SupplierSearchParams>({
      query: (params) => ({
        url: "/api/suppliers",
        params: cleanParams(params),
      }),
      providesTags: ["Supplier"],
    }),

    getActiveSuppliers: builder.query<Supplier[], void>({
      query: () => "/api/suppliers/active",
      providesTags: ["Supplier"],
    }),

    getSupplierDashboard: builder.query<SupplierDashboard, void>({
      query: () => "/api/suppliers/dashboard",
      providesTags: ["Supplier"],
    }),

    getSupplierInsights: builder.query<SupplierAiInsight[], void>({
      query: () => "/api/suppliers/insights",
      providesTags: ["Supplier"],
    }),

    createSupplier: builder.mutation<ApiResponse<Supplier>, SupplierRequest>({
      query: (body) => ({
        url: "/api/suppliers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Supplier"],
    }),

    updateSupplier: builder.mutation<
      ApiResponse<Supplier>,
      { id: string; body: SupplierRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/suppliers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Supplier"],
    }),

    deleteSupplier: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/api/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Supplier"],
    }),

    bulkCreateSuppliers: builder.mutation<
      ApiResponse<BulkSupplierImportResponse>,
      BulkSupplierRequest
    >({
      query: (body) => ({
        url: "/api/suppliers/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Supplier"],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetActiveSuppliersQuery,
  useGetSupplierDashboardQuery,
  useGetSupplierInsightsQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useBulkCreateSuppliersMutation,
} = supplierApi;