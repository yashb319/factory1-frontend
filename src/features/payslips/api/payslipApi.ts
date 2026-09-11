import { baseApi } from "@/services/baseApi";
import {
  ApiResponse,
  PayslipResponse,
  PayslipShareLinkRequest,
  PayslipShareLinkResponse,
} from "../types/payslip.types";

export const payslipApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayslipsForEmployee: builder.query<
      ApiResponse<PayslipResponse[]>,
      string
    >({
      query: (employeeId) => ({
        url: "/api/organization/payslips",
        params: { employeeId },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((payslip) => ({
                type: "Payslip" as const,
                id: payslip.id,
              })),
              { type: "Payslip" as const, id: "LIST" },
            ]
          : [{ type: "Payslip" as const, id: "LIST" }],
    }),

    createPayslipShareLink: builder.mutation<
      ApiResponse<PayslipShareLinkResponse>,
      { id: string; body: PayslipShareLinkRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/organization/payslips/${id}/share-link`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetPayslipsForEmployeeQuery,
  useCreatePayslipShareLinkMutation,
} = payslipApi;
