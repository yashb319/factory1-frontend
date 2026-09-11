import { baseApi } from "@/services/baseApi";
import {
  ApiResponse,
  CreateEmployeeRequest,
  Employee,
  EmployeeListParams,
  PageResponse,
  UpdateEmployeeRequest,
  EmployeeImportPreviewResponse,
  EmployeeImportResult,
  EmployeeInvitationResult,
  EmployeeStatutoryProfileRequest,
  EmployeeStatutoryProfileResponse,
} from "../types/employee.types";

export const employeeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query<PageResponse<Employee>, EmployeeListParams | void>({
  query: (params) => ({
    url: "/api/employees",
    method: "GET",
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 10,
      sortBy: params?.sortBy ?? "createdAt",
      sortDirection: (params?.sortDirection ?? "desc").toUpperCase(),
      keyword: params?.search || undefined,
      department: params?.department || undefined,
      status:
        !params?.status || params.status === "ALL"
          ? undefined
          : params.status,
      employeeType:
        !params?.employeeType || params.employeeType === "ALL"
          ? undefined
          : params.employeeType,
      salaryType:
        !params?.salaryType || params.salaryType === "ALL"
          ? undefined
          : params.salaryType,
    },
  }),
  providesTags: ["Employee"],
}),

    getEmployeeById: builder.query<Employee, string>({
      query: (id) => ({
        url: `/api/employees/${id}`,
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<Employee>) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Employee", id }],
    }),

    createEmployee: builder.mutation<Employee, CreateEmployeeRequest>({
      query: (body) => ({
        url: "/api/employees",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<Employee>) => response.data,
      invalidatesTags: ["Employee"],
    }),

    updateEmployee: builder.mutation<
      Employee,
      { id: string; body: UpdateEmployeeRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/employees/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<Employee>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        "Employee",
        { type: "Employee", id },
      ],
    }),

    deleteEmployee: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/employees/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employee"],
    }),

    previewEmployeeImport: builder.mutation<EmployeeImportPreviewResponse, File>({
      query: (file) => {
        const body = new FormData();
        body.append("file", file);
        return { url: "/api/employees/import/preview", method: "POST", body };
      },
    }),

    importEmployees: builder.mutation<EmployeeImportResult, File>({
      query: (file) => {
        const body = new FormData();
        body.append("file", file);
        return { url: "/api/employees/import", method: "POST", body };
      },
      invalidatesTags: ["Employee"],
    }),

    inviteEmployees: builder.mutation<
      EmployeeInvitationResult,
      { employeeIds: string[] }
    >({
      query: (body) => ({
        url: "/api/employees/invitations",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Employee"],
    }),

    getMyEmployee: builder.query<Employee, void>({
      query: () => ({ url: "/api/employees/me", method: "GET" }),
      transformResponse: (response: ApiResponse<Employee> | Employee) =>
        "data" in response ? response.data : response,
      providesTags: ["Employee"],
    }),

    getEmployeeStatutoryProfile: builder.query<
      EmployeeStatutoryProfileResponse,
      string
    >({
      query: (id) => `/api/employees/${id}/statutory-profile`,
      transformResponse: (
        response: ApiResponse<EmployeeStatutoryProfileResponse>
      ) => response.data,
      providesTags: (_result, _error, id) => [
        { type: "Employee", id: `${id}-statutory` },
      ],
    }),

    createEmployeeStatutoryProfile: builder.mutation<
      EmployeeStatutoryProfileResponse,
      { employeeId: string; body: EmployeeStatutoryProfileRequest }
    >({
      query: ({ employeeId, body }) => ({
        url: `/api/employees/${employeeId}/statutory-profile`,
        method: "POST",
        body,
      }),
      transformResponse: (
        response: ApiResponse<EmployeeStatutoryProfileResponse>
      ) => response.data,
      invalidatesTags: (_result, _error, { employeeId }) => [
        { type: "Employee", id: `${employeeId}-statutory` },
      ],
    }),

    updateEmployeeStatutoryProfile: builder.mutation<
      EmployeeStatutoryProfileResponse,
      { employeeId: string; body: EmployeeStatutoryProfileRequest }
    >({
      query: ({ employeeId, body }) => ({
        url: `/api/employees/${employeeId}/statutory-profile`,
        method: "PUT",
        body,
      }),
      transformResponse: (
        response: ApiResponse<EmployeeStatutoryProfileResponse>
      ) => response.data,
      invalidatesTags: (_result, _error, { employeeId }) => [
        { type: "Employee", id: `${employeeId}-statutory` },
      ],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  usePreviewEmployeeImportMutation,
  useImportEmployeesMutation,
  useInviteEmployeesMutation,
  useGetMyEmployeeQuery,
  useGetEmployeeStatutoryProfileQuery,
  useCreateEmployeeStatutoryProfileMutation,
  useUpdateEmployeeStatutoryProfileMutation,
} = employeeApi;