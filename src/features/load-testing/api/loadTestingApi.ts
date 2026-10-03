import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  LoadTestCatalog,
  LoadTestRunDetail,
  LoadTestRunSummary,
  LoadTestStartRequest,
  PageResponse,
} from "../types/loadTesting.types";

export const loadTestingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLoadTestCatalog: builder.query<ApiResponse<LoadTestCatalog>, void>({
      query: () => "/api/saas-admin/load-tests/catalog",
      providesTags: ["LoadTesting"],
    }),
    getLoadTestRuns: builder.query<
      ApiResponse<PageResponse<LoadTestRunSummary>>,
      { page: number; size: number }
    >({
      query: ({ page, size }) => ({
        url: "/api/saas-admin/load-tests",
        params: { page, size },
      }),
      providesTags: ["LoadTesting"],
    }),
    getLoadTestRun: builder.query<ApiResponse<LoadTestRunDetail>, string>({
      query: (runId) => `/api/saas-admin/load-tests/${runId}`,
      providesTags: ["LoadTesting"],
    }),
    startLoadTest: builder.mutation<
      ApiResponse<LoadTestRunDetail>,
      LoadTestStartRequest
    >({
      query: (body) => ({
        url: "/api/saas-admin/load-tests",
        method: "POST",
        body,
      }),
      invalidatesTags: ["LoadTesting"],
    }),
    cancelLoadTest: builder.mutation<
      ApiResponse<LoadTestRunDetail>,
      string
    >({
      query: (runId) => ({
        url: `/api/saas-admin/load-tests/${runId}/cancel`,
        method: "POST",
      }),
      invalidatesTags: ["LoadTesting"],
    }),
  }),
});

export const {
  useGetLoadTestCatalogQuery,
  useGetLoadTestRunsQuery,
  useGetLoadTestRunQuery,
  useStartLoadTestMutation,
  useCancelLoadTestMutation,
} = loadTestingApi;
