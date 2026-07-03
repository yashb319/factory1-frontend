import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  DataJob,
  DataJobRequest,
  PageResponse,
} from "../types/importExport.types";

export const importExportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getImportExportJobs: builder.query<
      PageResponse<DataJob>,
      { page?: number; size?: number }
    >({
      query: ({ page = 0, size = 30 }) => ({
        url: "/api/import-export/jobs",
        params: {
          page,
          size,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      }),
      providesTags: ["ImportExport"],
    }),

    createImportExportJob: builder.mutation<DataJob, DataJobRequest>({
      query: (body) => ({
        url: "/api/import-export/jobs",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<DataJob>) => response.data,
      invalidatesTags: ["ImportExport"],
    }),
  }),
});

export const {
  useGetImportExportJobsQuery,
  useCreateImportExportJobMutation,
} = importExportApi;
