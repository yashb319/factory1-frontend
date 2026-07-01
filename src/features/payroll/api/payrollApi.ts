import { baseApi } from "@/services/baseApi";
import {
  ApiResponse,
  GeneratePayrollRequest,
  PageResponse,
  PayrollDashboardResponse,
  PayrollRunDetailsResponse,
  PayrollRunSummaryResponse,
  PayrollSearchParams,
} from "../types/payroll.types";

export const payrollApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayrollDashboard: builder.query<PayrollDashboardResponse, void>({
      query: () => "/api/payroll/dashboard",
      providesTags: ["Payroll"],
    }),

    getPayrollRuns: builder.query<
      PageResponse<PayrollRunSummaryResponse>,
      PayrollSearchParams
    >({
      query: (params) => ({
        url: "/api/payroll",
        params,
      }),
      providesTags: ["Payroll"],
    }),

    getPayrollRunById: builder.query<PayrollRunDetailsResponse, string>({
      query: (id) => `/api/payroll/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Payroll", id }],
    }),

    generatePayroll: builder.mutation<
      ApiResponse<PayrollRunDetailsResponse>,
      GeneratePayrollRequest
    >({
      query: (body) => ({
        url: "/api/payroll",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payroll"],
    }),

    approvePayroll: builder.mutation<ApiResponse<PayrollRunSummaryResponse>, string>({
      query: (id) => ({
        url: `/api/payroll/${id}/approve`,
        method: "PUT",
      }),
      invalidatesTags: ["Payroll"],
    }),

    payPayroll: builder.mutation<ApiResponse<PayrollRunSummaryResponse>, string>({
      query: (id) => ({
        url: `/api/payroll/${id}/pay`,
        method: "PUT",
      }),
      invalidatesTags: ["Payroll"],
    }),

    deletePayroll: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/api/payroll/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Payroll"],
    }),
  }),
});

export const {
  useGetPayrollDashboardQuery,
  useGetPayrollRunsQuery,
  useGetPayrollRunByIdQuery,
  useGeneratePayrollMutation,
  useApprovePayrollMutation,
  usePayPayrollMutation,
  useDeletePayrollMutation,
} = payrollApi;