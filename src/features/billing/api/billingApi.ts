import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  Bill,
  BillRequest,
  BillType,
  GstReport,
  GstRateSuggestion,
  PageResponse,
} from "../types/billing.types";

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBills: builder.query<
      PageResponse<Bill>,
      { type?: BillType | ""; page?: number; size?: number }
    >({
      query: ({ type, page = 0, size = 20 }) => ({
        url: "/api/billing/bills",
        params: {
          type: type || undefined,
          page,
          size,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      }),
      providesTags: ["Billing"],
    }),

    createBill: builder.mutation<Bill, BillRequest>({
      query: (body) => ({
        url: "/api/billing/bills",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<Bill>) => response.data,
      invalidatesTags: ["Billing", "Inventory"],
    }),

    cancelBill: builder.mutation<Bill, string>({
      query: (id) => ({
        url: `/api/billing/bills/${id}/cancel`,
        method: "PUT",
      }),
      transformResponse: (response: ApiResponse<Bill>) => response.data,
      invalidatesTags: ["Billing", "Inventory"],
    }),

    getGstSuggestions: builder.query<GstRateSuggestion[], string>({
      query: (query) => ({
        url: "/api/billing/gst-suggestions",
        params: { query },
      }),
    }),

    getGstReport: builder.query<
      GstReport,
      { fromDate: string; toDate: string }
    >({
      query: ({ fromDate, toDate }) => ({
        url: "/api/billing/gst-report",
        params: { fromDate, toDate },
      }),
    }),
  }),
});

export const {
  useGetBillsQuery,
  useCreateBillMutation,
  useCancelBillMutation,
  useLazyGetGstSuggestionsQuery,
  useLazyGetGstReportQuery,
} = billingApi;
