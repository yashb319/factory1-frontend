import { baseApi } from "@/services/baseApi";
import type { CostingApiEnvelope } from "./costingContract";
import { unwrapCostingEnvelope } from "./costingContract";
import {
  toCostingPolicyRequest,
  toCostingPolicyView,
  toProductCostingView,
} from "./costingAdapters";
import type {
  CostingPolicyDraft,
  CostingPolicyView,
  ProductCostingView,
} from "../types/costing.types";
import type {
  CostBreakdownDto,
  CostingPolicyDto,
  FreezeCostingSnapshotRequestDto,
  PageResponseDto,
} from "../types/costingApi.types";

export const COSTING_API_ROUTES = {
  policies: "/api/costing/policies",
  products: "/api/costing/products",
  snapshots: "/api/costing/snapshots",
} as const;

export const costingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCostingPolicies: builder.query<
      PageResponseDto<CostingPolicyView>,
      { page?: number; size?: number }
    >({
      query: ({ page = 0, size = 20 }) => ({
        url: COSTING_API_ROUTES.policies,
        params: { page, size },
      }),
      transformResponse: (
        response: CostingApiEnvelope<PageResponseDto<CostingPolicyDto>>
      ) => {
        const page = unwrapCostingEnvelope(response);
        return {
          ...page,
          content: page.content.map(toCostingPolicyView),
        };
      },
      providesTags: ["ProductCostingPolicy"],
    }),
    saveCostingPolicy: builder.mutation<
      CostingPolicyView,
      { policyId?: string; draft: CostingPolicyDraft }
    >({
      query: ({ policyId, draft }) => ({
        url: policyId
          ? `${COSTING_API_ROUTES.policies}/${policyId}`
          : COSTING_API_ROUTES.policies,
        method: policyId ? "PUT" : "POST",
        body: toCostingPolicyRequest(draft),
      }),
      transformResponse: (response: CostingApiEnvelope<CostingPolicyDto>) =>
        toCostingPolicyView(unwrapCostingEnvelope(response)),
      invalidatesTags: ["ProductCostingPolicy", "ProductCosting"],
    }),
    createCostingPolicyVersion: builder.mutation<
      CostingPolicyView,
      string
    >({
      query: (policyId) => ({
        url: `${COSTING_API_ROUTES.policies}/${policyId}/versions`,
        method: "POST",
      }),
      transformResponse: (response: CostingApiEnvelope<CostingPolicyDto>) =>
        toCostingPolicyView(unwrapCostingEnvelope(response)),
      invalidatesTags: ["ProductCostingPolicy"],
    }),
    publishCostingPolicy: builder.mutation<CostingPolicyView, string>({
      query: (policyId) => ({
        url: `${COSTING_API_ROUTES.policies}/${policyId}/publish`,
        method: "POST",
      }),
      transformResponse: (response: CostingApiEnvelope<CostingPolicyDto>) =>
        toCostingPolicyView(unwrapCostingEnvelope(response)),
      invalidatesTags: ["ProductCostingPolicy", "ProductCosting"],
    }),
    previewProductCosting: builder.query<
      ProductCostingView,
      { productId: string; policyId: string; asOf?: string }
    >({
      query: ({ productId, policyId, asOf }) => ({
        url: `${COSTING_API_ROUTES.products}/${productId}/preview`,
        params: { policyId, asOf },
      }),
      transformResponse: (response: CostingApiEnvelope<CostBreakdownDto>) =>
        toProductCostingView(unwrapCostingEnvelope(response)),
      providesTags: (_result, _error, args) => [
        { type: "ProductCosting", id: args.productId },
      ],
    }),
    freezeProductCosting: builder.mutation<
      ProductCostingView,
      {
        productId: string;
        body: FreezeCostingSnapshotRequestDto;
      }
    >({
      query: ({ productId, body }) => ({
        url: `${COSTING_API_ROUTES.products}/${productId}/snapshots`,
        method: "POST",
        body,
      }),
      transformResponse: (response: CostingApiEnvelope<CostBreakdownDto>) =>
        toProductCostingView(unwrapCostingEnvelope(response)),
      invalidatesTags: (_result, _error, args) => [
        { type: "ProductCosting", id: args.productId },
        { type: "ProductProfitability", id: "PORTFOLIO" },
        { type: "ProductProfitability", id: args.productId },
        { type: "ProductProfitability", id: `${args.productId}:TRENDS` },
      ],
    }),
    getCostingSnapshot: builder.query<ProductCostingView, string>({
      query: (snapshotId) =>
        `${COSTING_API_ROUTES.snapshots}/${snapshotId}`,
      transformResponse: (response: CostingApiEnvelope<CostBreakdownDto>) =>
        toProductCostingView(unwrapCostingEnvelope(response)),
      providesTags: (_result, _error, snapshotId) => [
        { type: "ProductCosting", id: snapshotId },
      ],
    }),
  }),
});

export const {
  useGetCostingPoliciesQuery,
  useLazyPreviewProductCostingQuery,
  useSaveCostingPolicyMutation,
  useCreateCostingPolicyVersionMutation,
  usePublishCostingPolicyMutation,
  useFreezeProductCostingMutation,
  useGetCostingSnapshotQuery,
} = costingApi;
