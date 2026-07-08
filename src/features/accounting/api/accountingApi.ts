import { baseApi } from "@/services/baseApi";
import type {
  AccountGroup,
  AccountingVoucher,
  AccountingRange,
  AccountLedger,
  AccountMasters,
  AccountGroupMutationRequest,
  AccountLedgerMutationRequest,
  AgingReport,
  AgingReportRequest,
  BalanceSheet,
  CreateAccountGroupRequest,
  CreateAccountLedgerRequest,
  CreateAccountingVoucherRequest,
  GstReport,
  LedgerReport,
  ProfitLoss,
  TrialBalance,
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

    getTrialBalance: builder.query<TrialBalance, AccountingRange>({
      query: ({ fromDate, toDate }) => ({
        url: "/api/accounting/trial-balance",
        params: { fromDate, toDate },
      }),
      providesTags: ["Accounting"],
    }),

    getProfitLoss: builder.query<ProfitLoss, AccountingRange>({
      query: ({ fromDate, toDate }) => ({
        url: "/api/accounting/profit-loss",
        params: { fromDate, toDate },
      }),
      providesTags: ["Accounting"],
    }),

    getBalanceSheet: builder.query<BalanceSheet, AccountingRange>({
      query: ({ fromDate, toDate }) => ({
        url: "/api/accounting/balance-sheet",
        params: { fromDate, toDate },
      }),
      providesTags: ["Accounting"],
    }),

    getAgingReport: builder.query<AgingReport, AgingReportRequest>({
      query: ({ type, asOfDate }) => ({
        url: "/api/accounting/aging",
        params: { type, asOfDate },
      }),
      providesTags: ["Accounting"],
    }),

    getAccountMasters: builder.query<AccountMasters, void>({
      query: () => "/api/accounting/masters",
      providesTags: ["Accounting"],
    }),

    createAccountGroup: builder.mutation<
      { data: AccountGroup; message: string; success: boolean },
      CreateAccountGroupRequest
    >({
      query: (body) => ({
        url: "/api/accounting/groups",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),

    updateAccountGroup: builder.mutation<
      { data: AccountGroup; message: string; success: boolean },
      AccountGroupMutationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/accounting/groups/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),

    deleteAccountGroup: builder.mutation<
      { data: null; message: string; success: boolean },
      string
    >({
      query: (id) => ({
        url: `/api/accounting/groups/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Accounting"],
    }),

    createAccountLedger: builder.mutation<
      { data: AccountLedger; message: string; success: boolean },
      CreateAccountLedgerRequest
    >({
      query: (body) => ({
        url: "/api/accounting/ledgers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),

    updateAccountLedger: builder.mutation<
      { data: AccountLedger; message: string; success: boolean },
      AccountLedgerMutationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/accounting/ledgers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),

    deleteAccountLedger: builder.mutation<
      { data: null; message: string; success: boolean },
      string
    >({
      query: (id) => ({
        url: `/api/accounting/ledgers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Accounting"],
    }),

    getAccountingVouchers: builder.query<
      AccountingVoucher[],
      Partial<AccountingRange> | void
    >({
      query: (range) => ({
        url: "/api/accounting/vouchers",
        params: range?.fromDate && range?.toDate
          ? {
              fromDate: range.fromDate,
              toDate: range.toDate,
            }
          : undefined,
      }),
      providesTags: ["Accounting"],
    }),

    createAccountingVoucher: builder.mutation<
      { data: AccountingVoucher; message: string; success: boolean },
      CreateAccountingVoucherRequest
    >({
      query: (body) => ({
        url: "/api/accounting/vouchers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),
  }),
});

export const {
  useCreateAccountingVoucherMutation,
  useCreateAccountGroupMutation,
  useCreateAccountLedgerMutation,
  useDeleteAccountGroupMutation,
  useDeleteAccountLedgerMutation,
  useGetAccountMastersQuery,
  useGetAccountingVouchersQuery,
  useGetAgingReportQuery,
  useGetBalanceSheetQuery,
  useGetLedgerReportQuery,
  useGetProfitLossQuery,
  useGetTrialBalanceQuery,
  useLazyGetAccountingGstSummaryQuery,
  useUpdateAccountGroupMutation,
  useUpdateAccountLedgerMutation,
} = accountingApi;
