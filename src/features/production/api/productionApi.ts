import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  Bom,
  BomRequest,
  MaterialLot,
  MaterialLotQuery,
  OrderExecutionDetails,
  PageResponse,
  ProductionAnalytics,
  ProductionAnalyticsFilters,
  ProductionBoardQuery,
  ProductionDashboard,
  ProductionExecutionBoard,
  ProductionNotificationPreferences,
  ProductionOrder,
  ProductionOrderProgress,
  ProductionOrderProgressFilters,
  ProductionOrderRequest,
  ProductionStationWorkload,
  Workstation,
  WorkstationRequest,
  OrderAssignment,
  OrderAssignmentRequest,
  ExecutionBatch,
  ExecutionBatchRequest,
  QualityTemplate,
  QualityTemplateRequest,
  QualityResult,
  QualityResultRequest,
  MaterialConsumption,
  MaterialConsumptionRequest,
  QualityChecklistResult,
  QualityChecklistResultRequest,
  QualityChecklistTemplate,
  QualityChecklistTemplateRequest,
  StepActionRequest,
  StepExecutionRequest,
  StepExecutionResponse,
  TimelineEvent,
  WorkflowRequest,
  WorkflowTemplate,
  WorkflowVersion,
} from "../types/production.types";

const cleanParams = <T extends Record<string, unknown>>(params: T) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
};

const unwrapData = <T>(response: ApiResponse<T> | T): T => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    "success" in response
  ) {
    return response.data as T;
  }

  return response as T;
};

export const productionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkflows: builder.query<
      PageResponse<WorkflowTemplate>,
      { page?: number; size?: number }
    >({
      query: ({ page = 0, size = 50 }) => ({
        url: "/api/production/workflows",
        params: { page, size, sortBy: "name", sortDirection: "ASC" },
      }),
      transformResponse: (response: ApiResponse<PageResponse<WorkflowTemplate>> | PageResponse<WorkflowTemplate>) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createWorkflow: builder.mutation<WorkflowTemplate, WorkflowRequest>({
      query: (body) => ({
        url: "/api/production/workflows",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<WorkflowTemplate> | WorkflowTemplate) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getWorkflowVersions: builder.query<WorkflowVersion[], string>({
      query: (id) => `/api/production/workflows/${id}/versions`,
      transformResponse: (response: ApiResponse<WorkflowVersion[]> | WorkflowVersion[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createWorkflowDraft: builder.mutation<
      WorkflowVersion,
      { templateId: string; body: WorkflowRequest }
    >({
      query: ({ templateId, body }) => ({
        url: `/api/production/workflows/${templateId}/drafts`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<WorkflowVersion> | WorkflowVersion) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    publishWorkflow: builder.mutation<WorkflowVersion, string>({
      query: (id) => ({
        url: `/api/production/workflow-versions/${id}/publish`,
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<WorkflowVersion> | WorkflowVersion) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getBoms: builder.query<Bom[], string>({
      query: (productId) => ({
        url: "/api/production/boms",
        params: { productId },
      }),
      transformResponse: (response: ApiResponse<Bom[]> | Bom[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createBom: builder.mutation<Bom, BomRequest>({
      query: (body) => ({
        url: "/api/production/boms",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<Bom> | Bom) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    updateBom: builder.mutation<Bom, { id: string; body: BomRequest }>({
      query: ({ id, body }) => ({
        url: `/api/production/boms/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<Bom> | Bom) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    publishBom: builder.mutation<Bom, string>({
      query: (id) => ({
        url: `/api/production/boms/${id}/publish`,
        method: "POST",
      }),
      transformResponse: (response: ApiResponse<Bom> | Bom) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getOrders: builder.query<
      PageResponse<ProductionOrder>,
      { page?: number; size?: number }
    >({
      query: ({ page = 0, size = 50 }) => ({
        url: "/api/production/orders",
        params: { page, size, sortBy: "createdAt", sortDirection: "DESC" },
      }),
      transformResponse: (response: ApiResponse<PageResponse<ProductionOrder>> | PageResponse<ProductionOrder>) => unwrapData(response),
      providesTags: ["Production"],
    }),

    getOrder: builder.query<ProductionOrder, string>({
      query: (id) => `/api/production/orders/${id}`,
      transformResponse: (response: ApiResponse<ProductionOrder> | ProductionOrder) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createOrder: builder.mutation<ProductionOrder, ProductionOrderRequest>({
      query: (body) => ({
        url: "/api/production/orders",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<ProductionOrder> | ProductionOrder) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    cancelOrder: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/production/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Production"],
    }),

    stepAction: builder.mutation<
      ProductionOrder,
      {
        orderId: string;
        stepId: string;
        action: "start" | "pause" | "complete";
        body?: StepActionRequest;
      }
    >({
      query: ({ orderId, stepId, action, body }) => ({
        url: `/api/production/orders/${orderId}/steps/${stepId}/${action}`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<ProductionOrder> | ProductionOrder) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getTimeline: builder.query<TimelineEvent[], string>({
      query: (id) => `/api/production/orders/${id}/timeline`,
      transformResponse: (response: ApiResponse<TimelineEvent[]> | TimelineEvent[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    getProductionDashboard: builder.query<ProductionDashboard, void>({
      query: () => "/api/production/dashboard",
      transformResponse: (response: ApiResponse<ProductionDashboard> | ProductionDashboard) => unwrapData(response),
      providesTags: ["Production"],
    }),

    getDashboardStations: builder.query<ProductionStationWorkload[], void>({
      query: () => "/api/production/dashboard/stations",
      transformResponse: (response: ApiResponse<ProductionStationWorkload[]> | ProductionStationWorkload[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    getOrderExecution: builder.query<OrderExecutionDetails, string>({
      query: (orderId) => `/api/production/orders/${orderId}/execution`,
      transformResponse: (response: ApiResponse<OrderExecutionDetails> | OrderExecutionDetails) => unwrapData(response),
      providesTags: ["Production"],
    }),

    executeStep: builder.mutation<
      StepExecutionResponse,
      { orderId: string; stepId: string; body: StepExecutionRequest }
    >({
      query: ({ orderId, stepId, body }) => ({
        url: `/api/production/orders/${orderId}/steps/${stepId}/execution`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<StepExecutionResponse> | StepExecutionResponse) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getQualityTemplates: builder.query<
      QualityChecklistTemplate[],
      { stationId?: string; workflowStepCode?: string }
    >({
      query: (params) => ({
        url: "/api/production/quality/templates",
        params: cleanParams(params),
      }),
      transformResponse: (response: ApiResponse<QualityChecklistTemplate[]> | QualityChecklistTemplate[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createQualityTemplate: builder.mutation<
      QualityChecklistTemplate,
      QualityChecklistTemplateRequest
    >({
      query: (body) => ({
        url: "/api/production/quality/templates",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<QualityChecklistTemplate> | QualityChecklistTemplate) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    updateQualityTemplate: builder.mutation<
      QualityChecklistTemplate,
      { id: string; body: QualityChecklistTemplateRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/production/quality/templates/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<QualityChecklistTemplate> | QualityChecklistTemplate) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getQualityResults: builder.query<
      QualityChecklistResult[],
      { orderId: string; stepId: string }
    >({
      query: ({ orderId, stepId }) =>
        `/api/production/orders/${orderId}/steps/${stepId}/quality-results`,
      transformResponse: (response: ApiResponse<QualityChecklistResult[]> | QualityChecklistResult[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    recordQualityResult: builder.mutation<
      QualityChecklistResult,
      { orderId: string; stepId: string; body: QualityChecklistResultRequest }
    >({
      query: ({ orderId, stepId, body }) => ({
        url: `/api/production/orders/${orderId}/steps/${stepId}/quality-results`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<QualityChecklistResult> | QualityChecklistResult) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getMaterialLots: builder.query<MaterialLot[], MaterialLotQuery>({
      query: (params) => ({
        url: "/api/production/material-lots",
        params: cleanParams(params),
      }),
      transformResponse: (response: ApiResponse<MaterialLot[]> | MaterialLot[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    getWorkstations: builder.query<PageResponse<Workstation>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 50 }) => ({
        url: "/api/production/workstations",
        params: { page, size },
      }),
      transformResponse: (response: ApiResponse<PageResponse<Workstation>> | PageResponse<Workstation>) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createWorkstationRecord: builder.mutation<Workstation, WorkstationRequest>({
      query: (body) => ({ url: "/api/production/workstations", method: "POST", body }),
      transformResponse: (response: ApiResponse<Workstation> | Workstation) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    updateWorkstationRecord: builder.mutation<Workstation, { id: string; body: WorkstationRequest }>({
      query: ({ id, body }) => ({ url: `/api/production/workstations/${id}`, method: "PUT", body }),
      transformResponse: (response: ApiResponse<Workstation> | Workstation) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    deactivateWorkstation: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/production/workstations/${id}`, method: "DELETE" }),
      invalidatesTags: ["Production"],
    }),

    createAssignment: builder.mutation<OrderAssignment, OrderAssignmentRequest>({
      query: (body) => ({ url: "/api/production/assignments", method: "POST", body }),
      transformResponse: (response: ApiResponse<OrderAssignment> | OrderAssignment) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    createOrderAssignment: builder.mutation<OrderAssignment, { orderId: string; body: OrderAssignmentRequest }>({
      query: ({ orderId, body }) => ({ url: `/api/production/orders/${orderId}/assignments`, method: "POST", body }),
      transformResponse: (response: ApiResponse<OrderAssignment> | OrderAssignment) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    deleteAssignment: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/production/assignments/${id}`, method: "DELETE" }),
      invalidatesTags: ["Production"],
    }),

    getOrderAssignments: builder.query<OrderAssignment[], string>({
      query: (orderId) => `/api/production/orders/${orderId}/assignments`,
      transformResponse: (response: ApiResponse<OrderAssignment[]> | OrderAssignment[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createExecutionBatch: builder.mutation<ExecutionBatch, { orderId: string; body: ExecutionBatchRequest }>({
      query: ({ orderId, body }) => ({ url: `/api/production/orders/${orderId}/execution-batches`, method: "POST", body }),
      transformResponse: (response: ApiResponse<ExecutionBatch> | ExecutionBatch) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getExecutionBatches: builder.query<ExecutionBatch[], string>({
      query: (orderId) => `/api/production/orders/${orderId}/execution-batches`,
      transformResponse: (response: ApiResponse<ExecutionBatch[]> | ExecutionBatch[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    getQualityTemplatePage: builder.query<PageResponse<QualityTemplate>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 50 }) => ({ url: "/api/production/quality-templates", params: { page, size } }),
      transformResponse: (response: ApiResponse<PageResponse<QualityTemplate>> | PageResponse<QualityTemplate>) => unwrapData(response),
      providesTags: ["Production"],
    }),

    getQualityTemplate: builder.query<QualityTemplate, string>({
      query: (id) => `/api/production/quality-templates/${id}`,
      transformResponse: (response: ApiResponse<QualityTemplate> | QualityTemplate) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createQualityTemplateRecord: builder.mutation<QualityTemplate, QualityTemplateRequest>({
      query: (body) => ({ url: "/api/production/quality-templates", method: "POST", body }),
      transformResponse: (response: ApiResponse<QualityTemplate> | QualityTemplate) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    createQualityResult: builder.mutation<QualityResult, { orderId: string; body: QualityResultRequest }>({
      query: ({ orderId, body }) => ({ url: `/api/production/orders/${orderId}/quality-results`, method: "POST", body }),
      transformResponse: (response: ApiResponse<QualityResult> | QualityResult) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),

    getQualityResultPage: builder.query<QualityResult[], { orderId: string; stepId?: string }>({
      query: ({ orderId, stepId }) => ({ url: `/api/production/orders/${orderId}/quality-results`, params: cleanParams({ stepId }) }),
      transformResponse: (response: ApiResponse<QualityResult[]> | QualityResult[]) => unwrapData(response),
      providesTags: ["Production"],
    }),

    createMaterialConsumption: builder.mutation<MaterialConsumption, MaterialConsumptionRequest>({
      query: (body) => ({ url: "/api/production/material-consumptions", method: "POST", body }),
      transformResponse: (response: ApiResponse<MaterialConsumption> | MaterialConsumption) => unwrapData(response),
      invalidatesTags: ["Production", "Inventory"],
    }),

    getMaterialConsumptions: builder.query<MaterialConsumption[], string>({
      query: (orderId) => `/api/production/orders/${orderId}/material-consumptions`,
      transformResponse: (response: ApiResponse<MaterialConsumption[]> | MaterialConsumption[]) => unwrapData(response),
      providesTags: ["Production", "Inventory"],
    }),

    getProductionKanban: builder.query<ProductionExecutionBoard, ProductionBoardQuery>({
      query: (params) => ({ url: "/api/production/kanban", params: cleanParams(params) }),
      transformResponse: (response: ApiResponse<ProductionExecutionBoard> | ProductionExecutionBoard) => unwrapData(response),
      providesTags: ["Production"],
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
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useGetWorkflowVersionsQuery,
  useCreateWorkflowDraftMutation,
  usePublishWorkflowMutation,
  useGetBomsQuery,
  useCreateBomMutation,
  useUpdateBomMutation,
  usePublishBomMutation,
  useGetOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useCancelOrderMutation,
  useStepActionMutation,
  useGetTimelineQuery,
  useGetProductionDashboardQuery,
  useGetDashboardStationsQuery,
  useGetOrderExecutionQuery,
  useExecuteStepMutation,
  useGetQualityTemplatesQuery,
  useCreateQualityTemplateMutation,
  useUpdateQualityTemplateMutation,
  useGetQualityResultsQuery,
  useRecordQualityResultMutation,
  useGetMaterialLotsQuery,
  useGetWorkstationsQuery,
  useCreateWorkstationRecordMutation,
  useUpdateWorkstationRecordMutation,
  useDeactivateWorkstationMutation,
  useCreateAssignmentMutation,
  useCreateOrderAssignmentMutation,
  useDeleteAssignmentMutation,
  useGetOrderAssignmentsQuery,
  useCreateExecutionBatchMutation,
  useGetExecutionBatchesQuery,
  useGetQualityTemplatePageQuery,
  useGetQualityTemplateQuery,
  useCreateQualityTemplateRecordMutation,
  useCreateQualityResultMutation,
  useGetQualityResultPageQuery,
  useCreateMaterialConsumptionMutation,
  useGetMaterialConsumptionsQuery,
  useGetProductionKanbanQuery,
  useGetAnalyticsQuery,
  useGetOrderProgressQuery,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} = productionApi;
