import { baseApi } from "@/services/baseApi";

export type LeaveRequest = {
  id: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  reason?: string;
  [key: string]: unknown;
};

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLeaveRequests: builder.query<LeaveRequest[], void>({
      query: () => ({ url: "/api/leave", method: "GET" }),
      transformResponse: (response: { data?: LeaveRequest[] } | LeaveRequest[]) =>
        Array.isArray(response) ? response : response.data ?? [],
      providesTags: ["Employee"],
    }),
    createLeaveRequest: builder.mutation<LeaveRequest, Record<string, unknown>>({
      query: (body) => ({ url: "/api/leave", method: "POST", body }),
      invalidatesTags: ["Employee"],
    }),
  }),
});

export const { useGetLeaveRequestsQuery, useCreateLeaveRequestMutation } = leaveApi;
