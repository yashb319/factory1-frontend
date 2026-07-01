// src/features/attendance/api/attendanceApi.ts

import { baseApi } from "@/services/baseApi";
import type {
    ApiResponse,
    AttendanceDashboardResponse,
    AttendanceListParams,
    AttendanceRecord,
    BulkAttendanceRequest,
    DeviceAttendanceEventRequest,
    MarkAttendanceRequest,
    MonthlyAttendanceReport,
    PageResponse,
} from "../types/attendance.types";

export const attendanceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAttendance: builder.query<
            PageResponse<AttendanceRecord>,
            AttendanceListParams | void
        >({
            query: (params) => ({
                url: "/api/attendance",
                method: "GET",
                params: {
                    employeeId: params?.employeeId || undefined,
                    status:
                        !params?.status || params.status === "ALL"
                            ? undefined
                            : params.status,
                    fromDate: params?.fromDate || undefined,
                    toDate: params?.toDate || undefined,
                    page: params?.page ?? 0,
                    size: params?.size ?? 10,
                    sortBy: params?.sortBy ?? "attendanceDate",
                    sortDirection: (params?.sortDirection ?? "desc").toUpperCase(),
                },
            }),
            providesTags: ["Attendance"],
        }),

        markAttendance: builder.mutation<
            AttendanceRecord,
            MarkAttendanceRequest
        >({
            query: (body) => ({
                url: "/api/attendance",
                method: "POST",
                body,
            }),
            transformResponse: (response: ApiResponse<AttendanceRecord>) =>
                response.data,
            invalidatesTags: ["Attendance"],
        }),

        createDeviceEvent: builder.mutation<
            AttendanceRecord,
            DeviceAttendanceEventRequest
        >({
            query: (body) => ({
                url: "/api/attendance/device-event",
                method: "POST",
                body,
            }),
            transformResponse: (response: ApiResponse<AttendanceRecord>) =>
                response.data,
            invalidatesTags: ["Attendance"],
        }),

        bulkAttendance: builder.mutation<
            AttendanceRecord[],
            BulkAttendanceRequest
        >({
            query: (body) => ({
                url: "/api/attendance/bulk",
                method: "POST",
                body,
            }),
            transformResponse: (response: ApiResponse<AttendanceRecord[]>) =>
                response.data,
            invalidatesTags: ["Attendance"],
        }),

        getMonthlyAttendanceReport: builder.query<
            MonthlyAttendanceReport[],
            { month: number; year: number }
        >({
            query: (params) => ({
                url: "/api/attendance/report/monthly",
                method: "GET",
                params,
            }),
            providesTags: ["Attendance"],
        }),

        getAttendanceDashboard: builder.query<
            AttendanceDashboardResponse,
            string
        >({
            query: (date) => ({
                url: `/api/attendance/dashboard`,
                method: "GET",
                params: {
                    date,
                },
            }),
            providesTags: ["Attendance"],
        }),
    }),
});

export const {
    useGetAttendanceQuery,
    useMarkAttendanceMutation,
    useCreateDeviceEventMutation,
    useBulkAttendanceMutation,
    useGetMonthlyAttendanceReportQuery,
    useGetAttendanceDashboardQuery,
} = attendanceApi;