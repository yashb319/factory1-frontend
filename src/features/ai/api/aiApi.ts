import { baseApi } from "@/services/baseApi";
import type {
  AiActionExecuteRequest,
  AiActionExecuteResponse,
  AiChatRequest,
  AiChatResponse,
  AiConversation,
  AiConversationCreateRequest,
  AiConversationList,
  AiConversationSummary,
  AiConversationRenameRequest,
  AiQuickQuestionList,
  AiModuleContext,
  ApiResponse,
  BenchmarkProfile,
  BusinessInsightDrilldown,
  ListedCompanyRef,
} from "../types/ai.types";
import {
  adaptChatResponse,
  adaptConversation,
  adaptConversationList,
  adaptQuickQuestions,
  serializeAiChatRequest,
  unwrapAiData,
  unwrapAiNullData,
} from "../lib/contractAdapters";

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendAiMessage: builder.mutation<AiChatResponse, AiChatRequest>({
      query: (body) => ({
        url: "/api/ai/chat",
        method: "POST",
        body: serializeAiChatRequest(body),
      }),
      invalidatesTags: ["AiConversation", "AiQuickQuestion"],
      transformResponse: adaptChatResponse,
    }),
    getAiConversations: builder.query<
      AiConversationList,
      { page?: number; size?: number; search?: string; archived?: boolean } | void
    >({
      query: (args) => {
        const search = new URLSearchParams();
        search.set("page", String(args?.page ?? 0));
        search.set("size", String(args?.size ?? 50));
        if (args?.search) search.set("search", args.search);
        if (args?.archived !== undefined) {
          search.set("archived", String(args.archived));
        }
        const query = search.toString();
        return `/api/ai/conversations?${query}`;
      },
      providesTags: (result) => [
        "AiConversation",
        ...(result?.content.map((item) => ({
          type: "AiConversation" as const,
          id: item.id,
        })) ?? []),
      ],
      transformResponse: adaptConversationList,
    }),
    getAiConversation: builder.query<AiConversation, string>({
      query: (conversationId) => `/api/ai/conversations/${conversationId}`,
      providesTags: (_result, _error, id) => [{ type: "AiConversation", id }],
      transformResponse: adaptConversation,
    }),
    createAiConversation: builder.mutation<
      AiConversation,
      AiConversationCreateRequest
    >({
      query: (body) => ({
        url: "/api/ai/conversations",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AiConversation", "AiQuickQuestion"],
      transformResponse: (response: ApiResponse<AiConversation>) =>
        unwrapAiData(response),
    }),
    updateAiConversation: builder.mutation<
      AiConversationSummary,
      AiConversationRenameRequest
    >({
      query: ({ conversationId, ...body }) => ({
        url: `/api/ai/conversations/${conversationId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        "AiConversation",
        { type: "AiConversation", id: conversationId },
      ],
      transformResponse: (response: ApiResponse<AiConversationSummary>) =>
        unwrapAiData(response),
    }),
    archiveAiConversation: builder.mutation<AiConversationSummary, string>({
      query: (conversationId) => ({
        url: `/api/ai/conversations/${conversationId}/archive`,
        method: "POST",
      }),
      invalidatesTags: ["AiConversation", "AiQuickQuestion"],
      transformResponse: (response: ApiResponse<AiConversationSummary>) =>
        unwrapAiData(response),
    }),
    restoreAiConversation: builder.mutation<AiConversationSummary, string>({
      query: (conversationId) => ({
        url: `/api/ai/conversations/${conversationId}/restore`,
        method: "POST",
      }),
      invalidatesTags: ["AiConversation", "AiQuickQuestion"],
      transformResponse: (response: ApiResponse<AiConversationSummary>) =>
        unwrapAiData(response),
    }),
    deleteAiConversation: builder.mutation<void, string>({
      query: (conversationId) => ({
        url: `/api/ai/conversations/${conversationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AiConversation", "AiQuickQuestion"],
      transformResponse: (response: ApiResponse<null>) =>
        unwrapAiNullData(response),
    }),
    getAiQuickQuestions: builder.query<
      AiQuickQuestionList,
      { moduleContext: AiModuleContext; currentRoute: string; limit?: number }
    >({
      query: ({ moduleContext, currentRoute, limit = 6 }) => {
        const search = new URLSearchParams({ moduleContext });
        search.set("currentRoute", currentRoute);
        search.set("limit", String(limit));
        return `/api/ai/quick-questions?${search.toString()}`;
      },
      providesTags: ["AiQuickQuestion"],
      transformResponse: adaptQuickQuestions,
    }),
    executeAiAction: builder.mutation<
      AiActionExecuteResponse,
      AiActionExecuteRequest
    >({
      query: (body) => ({
        url: "/api/ai/actions/execute",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Employee",
        "Attendance",
        "Leave",
        "Payroll",
        "Customer",
        "Supplier",
        "Vendor",
        "Inventory",
        "StockMovement",
        "Products",
        "Production",
        "Billing",
        "Accounting",
        "ImportExport",
        "Dashboard",
      ],
      transformResponse: (response: ApiResponse<AiActionExecuteResponse>) =>
        unwrapAiData(response),
    }),
    getBusinessInsightDrilldown: builder.query<
      BusinessInsightDrilldown,
      { topic: string; fromDate?: string; toDate?: string; benchmark?: string }
    >({
      query: ({ topic, fromDate, toDate, benchmark }) => {
        const search = new URLSearchParams();
        search.set("topic", topic);
        if (fromDate) search.set("fromDate", fromDate);
        if (toDate) search.set("toDate", toDate);
        if (benchmark) search.set("benchmark", benchmark);
        return `/api/ai/business-insight/drilldown?${search.toString()}`;
      },
      transformResponse: (response: ApiResponse<BusinessInsightDrilldown>) =>
        unwrapAiData(response),
    }),
    getBenchmarks: builder.query<BenchmarkProfile[], void>({
      query: () => "/api/ai/benchmarks",
      transformResponse: (response: ApiResponse<BenchmarkProfile[]>) =>
        unwrapAiData(response),
    }),
    searchListedCompanies: builder.query<
      ListedCompanyRef[],
      { provider: string; query: string }
    >({
      query: ({ provider, query }) => {
        const search = new URLSearchParams();
        search.set("provider", provider);
        search.set("query", query);
        return `/api/ai/benchmarks/listed/search?${search.toString()}`;
      },
      transformResponse: (response: ApiResponse<ListedCompanyRef[]>) =>
        unwrapAiData(response),
    }),
    getListedBenchmark: builder.query<
      BenchmarkProfile,
      { provider: string; symbol: string }
    >({
      query: ({ provider, symbol }) => {
        const search = new URLSearchParams();
        search.set("provider", provider);
        search.set("symbol", symbol);
        return `/api/ai/benchmarks/listed?${search.toString()}`;
      },
      transformResponse: (response: ApiResponse<BenchmarkProfile>) =>
        unwrapAiData(response),
    }),
  }),
});

export const {
  useSendAiMessageMutation,
  useGetAiConversationsQuery,
  useGetAiConversationQuery,
  useCreateAiConversationMutation,
  useUpdateAiConversationMutation,
  useArchiveAiConversationMutation,
  useRestoreAiConversationMutation,
  useDeleteAiConversationMutation,
  useGetAiQuickQuestionsQuery,
  useExecuteAiActionMutation,
  useGetBusinessInsightDrilldownQuery,
  useGetBenchmarksQuery,
  useSearchListedCompaniesQuery,
  useGetListedBenchmarkQuery,
  useLazySearchListedCompaniesQuery,
  useLazyGetListedBenchmarkQuery,
} = aiApi;
