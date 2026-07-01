import { baseApi } from "@/services/baseApi";
import {
  ApiResponse,
  CreateEmployeeRequest,
  Employee,
  EmployeeListParams,
  PageResponse,
  UpdateEmployeeRequest,
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
  }),
});

export const {
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeeApi;