import { productionApi, unwrapData } from "./productionApi";
import { materialAvailabilityPageError } from "../utils/materialAvailability";
import type { ApiResponse } from "../types/production.types";
import type {
  MaterialAvailability, MaterialAvailabilityEvidence, MaterialAvailabilityItem, ProductionFamily, RecordPreview, RecordPreviewRequest,
  ShortClosePreview, ShortClosePreviewRequest, ShortCloseRequest, ShortCloseResult,
  SplitPreview, SplitPreviewRequest, SplitRequest, SplitResult,
} from "../types/productionFlow.types";

export const productionFlowApi = productionApi.injectEndpoints({
  endpoints: (builder) => ({
    previewProductionSplit: builder.mutation<SplitPreview, { orderId: string; body: SplitPreviewRequest }>({
      query: ({ orderId, body }) => ({ url: `/api/production/orders/${orderId}/split-preview`, method: "POST", body }),
      transformResponse: (response: ApiResponse<SplitPreview> | SplitPreview) => unwrapData(response),
    }),
    splitProductionOrder: builder.mutation<SplitResult, { orderId: string; body: SplitRequest }>({
      query: ({ orderId, body }) => ({ url: `/api/production/orders/${orderId}/splits`, method: "POST", body }),
      transformResponse: (response: ApiResponse<SplitResult> | SplitResult) => unwrapData(response),
      invalidatesTags: ["Production"],
    }),
    previewProductionShortClose: builder.mutation<ShortClosePreview, { orderId: string; stepId: string; body: ShortClosePreviewRequest }>({
      query: ({ orderId, stepId, body }) => ({ url: `/api/production/orders/${orderId}/steps/${stepId}/short-close-preview`, method: "POST", body }),
      transformResponse: (response: ApiResponse<ShortClosePreview> | ShortClosePreview) => unwrapData(response),
    }),
    shortCloseProductionOrder: builder.mutation<ShortCloseResult, { orderId: string; stepId: string; body: ShortCloseRequest }>({
      query: ({ orderId, stepId, body }) => ({ url: `/api/production/orders/${orderId}/steps/${stepId}/short-close`, method: "POST", body }),
      transformResponse: (response: ApiResponse<ShortCloseResult> | ShortCloseResult) => unwrapData(response),
      invalidatesTags: ["Production", "Inventory", "Products"],
    }),
    previewProductionRecord: builder.mutation<RecordPreview, { orderId: string; stepId: string; body: RecordPreviewRequest }>({
      query: ({ orderId, stepId, body }) => ({ url: `/api/production/orders/${orderId}/steps/${stepId}/record-preview`, method: "POST", body }),
      transformResponse: (response: ApiResponse<RecordPreview> | RecordPreview) => unwrapData(response),
    }),
    getProductionFamily: builder.query<ProductionFamily, { orderId: string; page?: number; expectedFamilyVersion?: number }>({
      query: ({ orderId, page = 0, expectedFamilyVersion }) => ({
        url: `/api/production/orders/${orderId}/family`,
        params: { page, size: 25, expectedFamilyVersion },
      }),
      transformResponse: (response: ApiResponse<ProductionFamily> | ProductionFamily) => unwrapData(response),
      providesTags: ["Production"],
    }),
    getMaterialAvailability: builder.query<MaterialAvailabilityEvidence, string>({
      async queryFn(orderId, _api, _options, baseQuery) {
        let first: MaterialAvailability | undefined;
        const items: MaterialAvailabilityItem[] = [];
        let pageNumber = 0;
        do {
          const response = await baseQuery({
            url: `/api/production/orders/${orderId}/material-availability`,
            params: { page: pageNumber, size: 200, expectedFamilyVersion: first?.familyVersion },
          });
          if (response.error) return { error: response.error };
          const page = unwrapData(response.data as ApiResponse<MaterialAvailability> | MaterialAvailability);
          const error = materialAvailabilityPageError(page, pageNumber, first, items);
          if (error) return { error: { status: "CUSTOM_ERROR", error } };
          first ??= page;
          items.push(...page.items);
          pageNumber += 1;
        } while (pageNumber < first.totalPages);
        return { data: { rootOrderId: first.rootOrderId, familyVersion: first.familyVersion, items } };
      },
      providesTags: ["Production", "Inventory"],
    }),
  }),
});

export const {
  useGetProductionFamilyQuery, useGetMaterialAvailabilityQuery,
  usePreviewProductionSplitMutation, useSplitProductionOrderMutation,
  usePreviewProductionShortCloseMutation, useShortCloseProductionOrderMutation,
  usePreviewProductionRecordMutation,
} = productionFlowApi;
