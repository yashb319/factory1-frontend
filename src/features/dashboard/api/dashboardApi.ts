import { baseApi } from "@/services/baseApi";
import type { DashboardSummary, DashboardTrends } from "../types/dashboard.types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<
      DashboardSummary,
      { fromDate?: string; toDate?: string } | void
    >({
      query: (params) => {
        const search = new URLSearchParams();
        if (params && "fromDate" in params && params.fromDate)
          search.set("fromDate", params.fromDate);
        if (params && "toDate" in params && params.toDate)
          search.set("toDate", params.toDate);
        const qs = search.toString();
        return `/api/dashboard/summary${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Dashboard"],
    }),
    getDashboardTrends: builder.query<
      DashboardTrends,
      { fromDate?: string; toDate?: string }
    >({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.fromDate) search.set("fromDate", params.fromDate);
        if (params?.toDate) search.set("toDate", params.toDate);
        const qs = search.toString();
        return `/api/dashboard/trends${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Dashboard"],
    }),
  }),
});

export const {
  useGetDashboardSummaryQuery,
  useGetDashboardTrendsQuery,
} = dashboardApi;
