import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse, Bom, BomRequest, PageResponse, ProductionOrder, ProductionOrderRequest,
  ProductionAnalytics, ProductionAnalyticsFilters, ProductionNotificationPreferences,
  ProductionOrderProgress, ProductionOrderProgressFilters, StepActionRequest, TimelineEvent,
  WorkflowRequest, WorkflowTemplate, WorkflowVersion,
} from "../types/production.types";

export const productionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkflows: builder.query<PageResponse<WorkflowTemplate>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 50 }) => ({ url: "/api/production/workflows", params: { page, size, sortBy: "name", sortDirection: "ASC" } }),
      providesTags: ["Production"],
    }),
    createWorkflow: builder.mutation<WorkflowTemplate, WorkflowRequest>({
      query: (body) => ({ url: "/api/production/workflows", method: "POST", body }),
      transformResponse: (r: ApiResponse<WorkflowTemplate>) => r.data, invalidatesTags: ["Production"],
    }),
    getWorkflowVersions: builder.query<WorkflowVersion[], string>({
      query: (id) => `/api/production/workflows/${id}/versions`, providesTags: ["Production"],
    }),
    createWorkflowDraft: builder.mutation<WorkflowVersion, { templateId: string; body: WorkflowRequest }>({
      query: ({ templateId, body }) => ({ url: `/api/production/workflows/${templateId}/drafts`, method: "POST", body }),
      transformResponse: (r: ApiResponse<WorkflowVersion>) => r.data, invalidatesTags: ["Production"],
    }),
    publishWorkflow: builder.mutation<WorkflowVersion, string>({
      query: (id) => ({ url: `/api/production/workflow-versions/${id}/publish`, method: "POST" }),
      transformResponse: (r: ApiResponse<WorkflowVersion>) => r.data, invalidatesTags: ["Production"],
    }),
    getBoms: builder.query<Bom[], string>({
      query: (productId) => ({ url: "/api/production/boms", params: { productId } }), providesTags: ["Production"],
    }),
    createBom: builder.mutation<Bom, BomRequest>({
      query: (body) => ({ url: "/api/production/boms", method: "POST", body }),
      transformResponse: (r: ApiResponse<Bom>) => r.data, invalidatesTags: ["Production"],
    }),
    updateBom: builder.mutation<Bom, { id: string; body: BomRequest }>({
      query: ({ id, body }) => ({ url: `/api/production/boms/${id}`, method: "PUT", body }),
      transformResponse: (r: ApiResponse<Bom>) => r.data, invalidatesTags: ["Production"],
    }),
    publishBom: builder.mutation<Bom, string>({
      query: (id) => ({ url: `/api/production/boms/${id}/publish`, method: "POST" }),
      transformResponse: (r: ApiResponse<Bom>) => r.data, invalidatesTags: ["Production"],
    }),
    getOrders: builder.query<PageResponse<ProductionOrder>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 50 }) => ({ url: "/api/production/orders", params: { page, size, sortBy: "createdAt", sortDirection: "DESC" } }),
      providesTags: ["Production"],
    }),
    getOrder: builder.query<ProductionOrder, string>({ query: (id) => `/api/production/orders/${id}`, providesTags: ["Production"] }),
    createOrder: builder.mutation<ProductionOrder, ProductionOrderRequest>({
      query: (body) => ({ url: "/api/production/orders", method: "POST", body }),
      transformResponse: (r: ApiResponse<ProductionOrder>) => r.data, invalidatesTags: ["Production"],
    }),
    cancelOrder: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/production/orders/${id}`, method: "DELETE" }), invalidatesTags: ["Production"],
    }),
    stepAction: builder.mutation<ProductionOrder, { orderId: string; stepId: string; action: "start" | "pause" | "complete"; body?: StepActionRequest }>({
      query: ({ orderId, stepId, action, body }) => ({ url: `/api/production/orders/${orderId}/steps/${stepId}/${action}`, method: "POST", body }),
      transformResponse: (r: ApiResponse<ProductionOrder>) => r.data, invalidatesTags: ["Production"],
    }),
    getTimeline: builder.query<TimelineEvent[], string>({
      query: (id) => `/api/production/orders/${id}/timeline`, providesTags: ["Production"],
    }),
    getAnalytics: builder.query<ProductionAnalytics, ProductionAnalyticsFilters>({
      query: (params) => ({ url: "/api/production/analytics", params }),
      providesTags: ["Production"],
    }),
    getOrderProgress: builder.query<ProductionOrderProgress[], ProductionOrderProgressFilters>({
      query: (params) => ({ url: "/api/production/orders/progress", params }),
      providesTags: ["Production"],
    }),
    getNotificationPreferences: builder.query<ProductionNotificationPreferences, void>({
      query: () => "/api/production/notification-preferences",
      providesTags: ["Production"],
    }),
    updateNotificationPreferences: builder.mutation<ProductionNotificationPreferences, ProductionNotificationPreferences>({
      query: (body) => ({ url: "/api/production/notification-preferences", method: "PUT", body }),
      invalidatesTags: ["Production"],
    }),
  }),
});

export const {
  useGetWorkflowsQuery, useCreateWorkflowMutation, useGetWorkflowVersionsQuery,
  useCreateWorkflowDraftMutation, usePublishWorkflowMutation, useGetBomsQuery,
  useCreateBomMutation, useUpdateBomMutation, usePublishBomMutation, useGetOrdersQuery,
  useGetOrderQuery, useCreateOrderMutation, useCancelOrderMutation, useStepActionMutation,
  useGetTimelineQuery, useGetAnalyticsQuery, useGetOrderProgressQuery,
  useGetNotificationPreferencesQuery, useUpdateNotificationPreferencesMutation,
} = productionApi;
