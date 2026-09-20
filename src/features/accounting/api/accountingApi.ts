import { baseApi } from "@/services/baseApi";
import type {
  AccountGroup,
  AccountingVoucher,
  AccountingRange,
  AccountLedger,
  AccountMasters,
  AccountGroupMutationRequest,
  AccountLedgerMutationRequest,
  AccountingVoucherMutationRequest,
  AccountingVoucherAudit,
  AccountingPeriod,
  AccountingPeriodActionRequest,
  AgingReport,
  AgingReportRequest,
  AccountingTaxSection,
  AccountingTaxSectionMutationRequest,
  AccountingTaxSectionRequest,
  BalanceSheet,
  CreateAccountGroupRequest,
  CreateAccountLedgerRequest,
  CreateAccountingPeriodRequest,
  CreateAccountingVoucherRequest,
  ReverseAccountingVoucherRequest,
  VoucherType,
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

    getAccountingTaxSectionCatalog: builder.query<AccountingTaxSection[], void>({
      query: () => "/api/accounting/tax-sections/catalog",
      providesTags: ["Accounting"],
    }),

    getAccountingTaxSections: builder.query<AccountingTaxSection[], void>({
      query: () => "/api/accounting/tax-sections",
      providesTags: ["Accounting"],
    }),

    createAccountingTaxSection: builder.mutation<
      { data: AccountingTaxSection; message: string; success: boolean },
      AccountingTaxSectionRequest
    >({
      query: (body) => ({
        url: "/api/accounting/tax-sections",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),

    updateAccountingTaxSection: builder.mutation<
      { data: AccountingTaxSection; message: string; success: boolean },
      AccountingTaxSectionMutationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/accounting/tax-sections/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounting"],
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
      providesTags: ["Accounting", "AccountingVoucher"],
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
      invalidatesTags: ["Accounting", "AccountingVoucher"],
    }),

    createAccountingVoucherDraft: builder.mutation<
      { data: AccountingVoucher; message: string; success: boolean },
      CreateAccountingVoucherRequest
    >({
      query: (body) => ({
        url: "/api/accounting/vouchers/drafts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AccountingVoucher"],
    }),

    updateAccountingVoucher: builder.mutation<
      { data: AccountingVoucher; message: string; success: boolean },
      AccountingVoucherMutationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/accounting/vouchers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounting", "AccountingVoucher"],
    }),

    postAccountingVoucher: builder.mutation<
      { data: AccountingVoucher; message: string; success: boolean },
      string
    >({
      query: (id) => ({
        url: `/api/accounting/vouchers/${id}/post`,
        method: "POST",
      }),
      invalidatesTags: ["Accounting", "AccountingVoucher"],
    }),

    reverseAccountingVoucher: builder.mutation<
      { data: AccountingVoucher; message: string; success: boolean },
      ReverseAccountingVoucherRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/accounting/vouchers/${id}/reverse`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting", "AccountingVoucher"],
    }),

    getAccountingVoucherHistory: builder.query<AccountingVoucherAudit[], string>({
      query: (id) => `/api/accounting/vouchers/${id}/history`,
      providesTags: (_result, _error, id) => [
        { type: "AccountingVoucher", id },
      ],
    }),

    getAccountingPeriods: builder.query<AccountingPeriod[], void>({
      query: () => "/api/accounting/periods",
      providesTags: ["AccountingPeriod"],
    }),

    createAccountingPeriod: builder.mutation<
      { data: AccountingPeriod; message: string; success: boolean },
      CreateAccountingPeriodRequest
    >({
      query: (body) => ({
        url: "/api/accounting/periods",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting", "AccountingPeriod"],
    }),

    closeAccountingPeriod: builder.mutation<
      { data: AccountingPeriod; message: string; success: boolean },
      AccountingPeriodActionRequest
    >({
      query: ({ id, reason }) => ({
        url: `/api/accounting/periods/${id}/close`,
        method: "POST",
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: ["Accounting", "AccountingPeriod"],
    }),

    reopenAccountingPeriod: builder.mutation<
      { data: AccountingPeriod; message: string; success: boolean },
      AccountingPeriodActionRequest
    >({
      query: ({ id, reason }) => ({
        url: `/api/accounting/periods/${id}/reopen`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Accounting", "AccountingPeriod"],
    }),

     suggestVoucherNumber: builder.query<string, VoucherType>({
      query: (type) => ({
        url: "/api/accounting/vouchers/suggest-voucher-number",
        params: { type },
      }),
      transformResponse: (response: { data: string }) => response.data,
    }),

    checkVoucherNumber: builder.query<boolean, { number: string; excludeId?: string }>({
      query: ({ number, excludeId }) => ({
        url: "/api/accounting/vouchers/check-voucher-number",
        params: excludeId ? { number, excludeId } : { number },
      }),
      transformResponse: (response: { data: boolean }) => response.data,
    }),
  }),
});

export const {
  useCloseAccountingPeriodMutation,
  useCreateAccountingPeriodMutation,
  useCreateAccountingVoucherDraftMutation,
  useCreateAccountingVoucherMutation,
  useCreateAccountGroupMutation,
  useCreateAccountLedgerMutation,
  useDeleteAccountGroupMutation,
  useDeleteAccountLedgerMutation,
  useGetAccountMastersQuery,
  useCreateAccountingTaxSectionMutation,
  useGetAccountingGstSummaryQuery,
  useGetAccountingTaxSectionCatalogQuery,
  useGetAccountingTaxSectionsQuery,
  useGetAccountingPeriodsQuery,
  useGetAccountingVoucherHistoryQuery,
  useGetAccountingVouchersQuery,
  useGetAgingReportQuery,
  useGetBalanceSheetQuery,
  useGetLedgerReportQuery,
  useGetProfitLossQuery,
  useGetTrialBalanceQuery,
  useLazyGetAccountingGstSummaryQuery,
  usePostAccountingVoucherMutation,
  useReopenAccountingPeriodMutation,
  useReverseAccountingVoucherMutation,
  useUpdateAccountingVoucherMutation,
  useUpdateAccountingTaxSectionMutation,
  useUpdateAccountGroupMutation,
  useUpdateAccountLedgerMutation,
  useLazySuggestVoucherNumberQuery,
  useLazyCheckVoucherNumberQuery,
} = accountingApi;
