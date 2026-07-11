import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  DataJob,
  DataJobRequest,
  PageResponse,
} from "../types/importExport.types";

function safeParse(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

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
      transformResponse: (response: PageResponse<DataJob>) => {
        response.content = response.content.map((job) => {
          const params: unknown = job.parameters;
          return {
            ...job,
            parameters:
              typeof params === "string" && params.length > 0
                ? safeParse(params)
                : job.parameters,
          };
        });
        return response;
      },
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
