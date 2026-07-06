import { baseApi } from "@/services/baseApi";
import type {
  AccountingRange,
  GstReport,
  LedgerReport,
} from "../types/accounting.types";

export const accountingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLedgerReport: builder.query<LedgerReport, AccountingRange>({
      query: ({ fromDate, toDate }) => ({
        url: "/api/accounting/ledgers",
        params: { fromDate, toDate },
      }),
      providesTags: ["Accounting"],
    }),

    getAccountingGstSummary: builder.query<GstReport, AccountingRange>({
      query: ({ fromDate, toDate }) => ({
        url: "/api/accounting/gst-summary",
        params: { fromDate, toDate },
      }),
      providesTags: ["Accounting"],
    }),
  }),
});

export const {
  useGetLedgerReportQuery,
  useLazyGetAccountingGstSummaryQuery,
} = accountingApi;
