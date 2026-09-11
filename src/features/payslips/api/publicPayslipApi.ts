import { baseApi } from "@/services/baseApi";
import {
  ApiResponse,
  PublicPayslipAccessRequest,
  PublicPayslipResponse,
} from "../types/payslip.types";

export const publicPayslipApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    accessPublicPayslip: builder.mutation<
      ApiResponse<PublicPayslipResponse>,
      { token: string; body: PublicPayslipAccessRequest }
    >({
      query: ({ token, body }) => ({
        url: `/api/public/payslips/${token}`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useAccessPublicPayslipMutation } = publicPayslipApi;
