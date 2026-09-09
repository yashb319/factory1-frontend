import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  CreateLeaveRequest,
  LeaveBalanceResponse,
  LeaveListParams,
  LeaveRequestResponse,
  LeaveTypeRequest,
  LeaveTypeResponse,
  PageResponse,
} from "../types/leave.types";

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLeaveTypes: builder.query<LeaveTypeResponse[], { activeOnly?: boolean } | void>({
      query: (params) => ({
        url: "/api/leave/types",
        method: "GET",
        params: { activeOnly: params?.activeOnly ?? true },
      }),
      providesTags: ["Leave"],
    }),
    createLeaveType: builder.mutation<LeaveTypeResponse, LeaveTypeRequest>({
      query: (body) => ({ url: "/api/leave/types", method: "POST", body }),
      transformResponse: (response: ApiResponse<LeaveTypeResponse>) => response.data,
      invalidatesTags: ["Leave"],
    }),
    updateLeaveType: builder.mutation<LeaveTypeResponse, { id: string; body: LeaveTypeRequest }>({
      query: ({ id, body }) => ({ url: `/api/leave/types/${id}`, method: "PUT", body }),
      invalidatesTags: ["Leave"],
    }),
    getLeaveBalances: builder.query<LeaveBalanceResponse[], number>({
      query: (year) => ({ url: "/api/leave/balances", method: "GET", params: { year } }),
      providesTags: ["Leave"],
    }),
    createLeaveRequest: builder.mutation<LeaveRequestResponse, CreateLeaveRequest>({
      query: (body) => ({ url: "/api/leave/requests", method: "POST", body }),
      transformResponse: (response: ApiResponse<LeaveRequestResponse>) => response.data,
      invalidatesTags: ["Leave"],
    }),
    getLeaveRequests: builder.query<PageResponse<LeaveRequestResponse>, LeaveListParams | void>({
      query: (params) => ({
        url: "/api/leave/requests",
        method: "GET",
        params: { page: params?.page ?? 0, size: params?.size ?? 20 },
      }),
      providesTags: ["Leave"],
    }),
    getPendingLeaveRequests: builder.query<PageResponse<LeaveRequestResponse>, LeaveListParams | void>({
      query: (params) => ({
        url: "/api/leave/requests/pending",
        method: "GET",
        params: { page: params?.page ?? 0, size: params?.size ?? 20 },
      }),
      providesTags: ["Leave"],
    }),
    getLeaveRequest: builder.query<LeaveRequestResponse, string>({
      query: (id) => `/api/leave/requests/${id}`,
      providesTags: ["Leave"],
    }),
    approveLeaveRequest: builder.mutation<LeaveRequestResponse, { id: string; comment: string }>({
      query: ({ id, comment }) => ({ url: `/api/leave/requests/${id}/approve`, method: "POST", body: { comment } }),
      transformResponse: (response: ApiResponse<LeaveRequestResponse>) => response.data,
      invalidatesTags: ["Leave"],
    }),
    rejectLeaveRequest: builder.mutation<LeaveRequestResponse, { id: string; comment: string }>({
      query: ({ id, comment }) => ({ url: `/api/leave/requests/${id}/reject`, method: "POST", body: { comment } }),
      transformResponse: (response: ApiResponse<LeaveRequestResponse>) => response.data,
      invalidatesTags: ["Leave"],
    }),
    cancelLeaveRequest: builder.mutation<LeaveRequestResponse, string>({
      query: (id) => ({ url: `/api/leave/requests/${id}/cancel`, method: "POST" }),
      transformResponse: (response: ApiResponse<LeaveRequestResponse>) => response.data,
      invalidatesTags: ["Leave"],
    }),
  }),
});

export const {
  useGetLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useGetLeaveBalancesQuery,
  useCreateLeaveRequestMutation,
  useGetLeaveRequestsQuery,
  useGetPendingLeaveRequestsQuery,
  useGetLeaveRequestQuery,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useCancelLeaveRequestMutation,
} = leaveApi;
