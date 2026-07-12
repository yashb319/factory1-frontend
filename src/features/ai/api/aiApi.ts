import { baseApi } from "@/services/baseApi";
import type {
  AiActionExecuteRequest,
  AiActionExecuteResponse,
  AiChatRequest,
  AiChatResponse,
  ApiResponse,
  BenchmarkProfile,
  BusinessInsightDrilldown,
  ListedCompanyRef,
} from "../types/ai.types";

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendAiMessage: builder.mutation<AiChatResponse, AiChatRequest>({
      query: (body) => ({
        url: "/api/ai/chat",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<AiChatResponse>) =>
        response.data,
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
        "Customer",
        "Supplier",
        "Inventory",
        "Products",
        "Dashboard",
      ],
      transformResponse: (response: ApiResponse<AiActionExecuteResponse>) =>
        response.data,
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
        response.data,
    }),
    getBenchmarks: builder.query<BenchmarkProfile[], void>({
      query: () => "/api/ai/benchmarks",
      transformResponse: (response: ApiResponse<BenchmarkProfile[]>) =>
        response.data,
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
        response.data,
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
        response.data,
    }),
  }),
});

export const {
  useSendAiMessageMutation,
  useExecuteAiActionMutation,
  useGetBusinessInsightDrilldownQuery,
  useGetBenchmarksQuery,
  useSearchListedCompaniesQuery,
  useGetListedBenchmarkQuery,
  useLazySearchListedCompaniesQuery,
  useLazyGetListedBenchmarkQuery,
} = aiApi;
