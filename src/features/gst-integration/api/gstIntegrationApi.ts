import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  EwayBillApiResponse,
  GstIntegrationCredential,
  GstIntegrationCredentialRequest,
  InwardEwayBill,
} from "../types/gstIntegration.types";

export const gstIntegrationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGstIntegrationCredentials: builder.query<GstIntegrationCredential[], void>({
      query: () => "/api/eway-bills/integration/credentials",
      providesTags: ["Billing"],
    }),
    saveGstIntegrationCredential: builder.mutation<
      GstIntegrationCredential,
      GstIntegrationCredentialRequest
    >({
      query: (body) => ({
        url: "/api/eway-bills/integration/credentials",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<GstIntegrationCredential>) => response.data,
      invalidatesTags: ["Billing"],
    }),
    testGstIntegrationCredential: builder.mutation<GstIntegrationCredential, string>({
      query: (id) => ({
        url: `/api/eway-bills/integration/credentials/${id}/test`,
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<GstIntegrationCredential>) => response.data,
      invalidatesTags: ["Billing"],
    }),
    getInwardEwayBills: builder.query<InwardEwayBill[], void>({
      query: () => "/api/eway-bills/inward",
      providesTags: ["Billing"],
    }),
    syncInwardEwayBills: builder.mutation<EwayBillApiResponse, { generationDate: string }>({
      query: (body) => ({
        url: "/api/eway-bills/inward/sync",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<EwayBillApiResponse>) => response.data,
      invalidatesTags: ["Billing"],
    }),
  }),
});

export const {
  useGetGstIntegrationCredentialsQuery,
  useSaveGstIntegrationCredentialMutation,
  useTestGstIntegrationCredentialMutation,
  useGetInwardEwayBillsQuery,
  useSyncInwardEwayBillsMutation,
} = gstIntegrationApi;
