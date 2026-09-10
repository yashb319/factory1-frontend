import { baseApi } from "@/services/baseApi";
import type {
  SandboxConvertResponse,
  SandboxStatusResponse,
} from "../types/sandbox.types";

export const organizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSandboxStatus: builder.query<SandboxStatusResponse, void>({
      query: () => "/api/organization/sandbox-status",
      providesTags: ["Organization"],
    }),

    convertSandbox: builder.mutation<SandboxConvertResponse, void>({
      query: () => ({
        url: "/api/organization/sandbox/convert",
        method: "POST",
      }),
      invalidatesTags: ["Organization"],
    }),
  }),
});

export const {
  useGetSandboxStatusQuery,
  useConvertSandboxMutation,
} = organizationApi;
