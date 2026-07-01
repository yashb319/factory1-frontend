import type {
  ApiResponse,
  BulkCustomerImportResponse,
  BulkCustomerRequest,
  Customer,
  CustomerAiInsight,
  CustomerDashboard,
  CustomerRequest,
  CustomerSearchParams,
  PageResponse,
} from "../types/customer.types";
import { baseApi } from "@/services/baseApi";

const cleanParams = (params: CustomerSearchParams) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<PageResponse<Customer>, CustomerSearchParams>({
      query: (params) => ({
        url: "/api/customers",
        params: cleanParams(params),
      }),
      providesTags: ["Customer"],
    }),

    getActiveCustomers: builder.query<Customer[], void>({
      query: () => "/api/customers/active",
      providesTags: ["Customer"],
    }),

    getCustomerDashboard: builder.query<CustomerDashboard, void>({
      query: () => "/api/customers/dashboard",
      providesTags: ["Customer"],
    }),

    getCustomerInsights: builder.query<CustomerAiInsight[], void>({
      query: () => "/api/customers/insights",
      providesTags: ["Customer"],
    }),

    createCustomer: builder.mutation<ApiResponse<Customer>, CustomerRequest>({
      query: (body) => ({
        url: "/api/customers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),

    updateCustomer: builder.mutation<
      ApiResponse<Customer>,
      { id: string; body: CustomerRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/customers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),

    deleteCustomer: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/api/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customer"],
    }),

    bulkCreateCustomers: builder.mutation<
      ApiResponse<BulkCustomerImportResponse>,
      BulkCustomerRequest
    >({
      query: (body) => ({
        url: "/api/customers/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetActiveCustomersQuery,
  useGetCustomerDashboardQuery,
  useGetCustomerInsightsQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useBulkCreateCustomersMutation,
} = customerApi;