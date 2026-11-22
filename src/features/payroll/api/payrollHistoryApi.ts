import { baseApi } from "@/services/baseApi";
import type {
  PayrollHistoryDetail,
  PayrollHistoryImportRequest,
  PayrollHistorySummary,
} from "../types/payrollHistory.types";

type Wrapped<T> = { data: T } | T;

function unwrap<T>(response: Wrapped<T>): T {
  if (
    response &&
    typeof response === "object" &&
    !Array.isArray(response) &&
    "data" in response &&
    ("success" in response || "message" in response)
  ) {
    return (response as { data: T }).data;
  }
  return response as T;
}

const HISTORY_TAG = { type: "Payroll" as const, id: "HISTORY" };

export const payrollHistoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayrollHistory: builder.query<PayrollHistorySummary[], void>({
      query: () => "/api/payroll/history",
      transformResponse: (response: Wrapped<PayrollHistorySummary[]>) =>
        unwrap(response) ?? [],
      providesTags: [HISTORY_TAG],
    }),
    getPayrollHistoryById: builder.query<PayrollHistoryDetail, string>({
      query: (id) => `/api/payroll/history/${encodeURIComponent(id)}`,
      transformResponse: (response: Wrapped<PayrollHistoryDetail>) => unwrap(response),
      providesTags: (_result, _error, id) => [{ type: "Payroll", id: `HISTORY-${id}` }],
    }),
    importPayrollHistory: builder.mutation<
      PayrollHistorySummary,
      PayrollHistoryImportRequest
    >({
      query: (body) => ({ url: "/api/payroll/history", method: "POST", body }),
      transformResponse: (response: Wrapped<PayrollHistorySummary>) => unwrap(response),
      invalidatesTags: [HISTORY_TAG],
    }),
  }),
});

export const {
  useGetPayrollHistoryQuery,
  useGetPayrollHistoryByIdQuery,
  useImportPayrollHistoryMutation,
} = payrollHistoryApi;
