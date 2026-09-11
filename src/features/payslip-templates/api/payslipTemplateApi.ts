import { baseApi } from "@/services/baseApi";
import {
  ApiResponse,
  PayslipTemplateRequest,
  PayslipTemplateResponse,
} from "../types/payslipTemplate.types";

export const payslipTemplateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayslipTemplates: builder.query<
      ApiResponse<PayslipTemplateResponse[]>,
      void
    >({
      query: () => "/api/organization/payslip-templates",
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((template) => ({
                type: "PayslipTemplate" as const,
                id: template.id,
              })),
              { type: "PayslipTemplate" as const, id: "LIST" },
            ]
          : [{ type: "PayslipTemplate" as const, id: "LIST" }],
    }),

    getPayslipTemplate: builder.query<
      ApiResponse<PayslipTemplateResponse>,
      string
    >({
      query: (id) => `/api/organization/payslip-templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: "PayslipTemplate", id }],
    }),

    createPayslipTemplate: builder.mutation<
      ApiResponse<PayslipTemplateResponse>,
      PayslipTemplateRequest
    >({
      query: (body) => ({
        url: "/api/organization/payslip-templates",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PayslipTemplate", id: "LIST" }],
    }),

    updatePayslipTemplate: builder.mutation<
      ApiResponse<PayslipTemplateResponse>,
      { id: string; body: PayslipTemplateRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/organization/payslip-templates/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "PayslipTemplate", id },
        { type: "PayslipTemplate", id: "LIST" },
      ],
    }),

    publishPayslipTemplate: builder.mutation<
      ApiResponse<PayslipTemplateResponse>,
      string
    >({
      query: (id) => ({
        url: `/api/organization/payslip-templates/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "PayslipTemplate", id: "LIST" }],
    }),

    createPayslipTemplateDraftVersion: builder.mutation<
      ApiResponse<PayslipTemplateResponse>,
      string
    >({
      query: (id) => ({
        url: `/api/organization/payslip-templates/${id}/new-draft-version`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "PayslipTemplate", id: "LIST" }],
    }),

    setDefaultPayslipTemplate: builder.mutation<
      ApiResponse<PayslipTemplateResponse>,
      string
    >({
      query: (id) => ({
        url: `/api/organization/payslip-templates/${id}/set-default`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "PayslipTemplate", id: "LIST" }],
    }),

    deletePayslipTemplate: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/api/organization/payslip-templates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "PayslipTemplate", id: "LIST" }],
    }),
  }),
});

export const {
  useGetPayslipTemplatesQuery,
  useGetPayslipTemplateQuery,
  useCreatePayslipTemplateMutation,
  useUpdatePayslipTemplateMutation,
  usePublishPayslipTemplateMutation,
  useCreatePayslipTemplateDraftVersionMutation,
  useSetDefaultPayslipTemplateMutation,
  useDeletePayslipTemplateMutation,
} = payslipTemplateApi;
