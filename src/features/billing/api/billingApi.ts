import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  Bill,
  BillNumberAvailability,
  BillNumberSuggestion,
  BillRequest,
  BillType,
  EwayBillApiResponse,
  EwayPartBRequest,
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

    getBillNumberSuggestion: builder.query<BillNumberSuggestion, BillType>({
      query: (type) => ({
        url: "/api/billing/bills/number-suggestion",
        params: { type },
      }),
      providesTags: ["Billing"],
    }),

    checkBillNumberAvailability: builder.query<BillNumberAvailability, string>({
      query: (billNumber) => ({
        url: "/api/billing/bills/number-availability",
        params: { billNumber },
      }),
      providesTags: ["Billing"],
    }),

    cancelBill: builder.mutation<Bill, string>({
      query: (id) => ({
        url: `/api/billing/bills/${id}/cancel`,
        method: "PUT",
      }),
      transformResponse: (response: ApiResponse<Bill>) => response.data,
      invalidatesTags: ["Billing", "Inventory"],
    }),

    postBill: builder.mutation<Bill, string>({
      query: (id) => ({
        url: `/api/billing/bills/${id}/post`,
        method: "PUT",
      }),
      transformResponse: (response: ApiResponse<Bill>) => response.data,
      invalidatesTags: ["Billing", "Inventory"],
    }),

    recordBillPayment: builder.mutation<
      Bill,
      { id: string; paidAmount: number }
    >({
      query: ({ id, paidAmount }) => ({
        url: `/api/billing/bills/${id}/payment`,
        method: "PUT",
        body: { paidAmount },
      }),
      transformResponse: (response: ApiResponse<Bill>) => response.data,
      invalidatesTags: ["Billing", "Accounting"],
    }),

    generateEwayBill: builder.mutation<EwayBillApiResponse, string>({
      query: (id) => ({
        url: `/api/billing/bills/${id}/eway/generate`,
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<EwayBillApiResponse>) => response.data,
      invalidatesTags: ["Billing"],
    }),

    getEwayBillDetails: builder.mutation<EwayBillApiResponse, string>({
      query: (id) => ({
        url: `/api/billing/bills/${id}/eway/details`,
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<EwayBillApiResponse>) => response.data,
      invalidatesTags: ["Billing"],
    }),

    cancelEwayBill: builder.mutation<
      EwayBillApiResponse,
      { id: string; cancelReasonCode?: string; cancelRemark?: string }
    >({
      query: ({ id, cancelReasonCode = "2", cancelRemark = "Cancelled from Factory1" }) => ({
        url: `/api/billing/bills/${id}/eway/cancel`,
        method: "POST",
        body: { cancelReasonCode, cancelRemark },
      }),
      transformResponse: (response: ApiResponse<EwayBillApiResponse>) => response.data,
      invalidatesTags: ["Billing"],
    }),

    updateEwayPartB: builder.mutation<
      EwayBillApiResponse,
      { id: string; body: EwayPartBRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/billing/bills/${id}/eway/update-part-b`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<EwayBillApiResponse>) => response.data,
      invalidatesTags: ["Billing"],
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
  useCheckBillNumberAvailabilityQuery,
  useCancelBillMutation,
  useGetBillNumberSuggestionQuery,
  usePostBillMutation,
  useRecordBillPaymentMutation,
  useGenerateEwayBillMutation,
  useGetEwayBillDetailsMutation,
  useCancelEwayBillMutation,
  useUpdateEwayPartBMutation,
  useLazyGetGstSuggestionsQuery,
  useLazyGetGstReportQuery,
} = billingApi;
