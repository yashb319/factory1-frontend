
import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  BulkInventoryImportResponse,
  BulkInventoryItemRequest,
  InventoryDashboard,
  InventoryItem,
  InventoryItemRequest,
  InventoryItemUpdateRequest,
  InventorySearchParams,
  PageResponse,
  StockMovement,
  StockMovementRequest,
} from "../types/inventory.types";

const cleanParams = (params: InventorySearchParams) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
};

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryDashboard: builder.query<InventoryDashboard, void>({
      query: () => "/api/inventory/dashboard",
      providesTags: ["Inventory"],
    }),

    getInventoryItems: builder.query<
      PageResponse<InventoryItem>,
      InventorySearchParams
    >({
      query: (params) => ({
        url: "/api/inventory/items",
        params: cleanParams(params),
      }),
      providesTags: ["Inventory"],
    }),

    getInventoryItem: builder.query<InventoryItem, string>({
      query: (id) => `/api/inventory/items/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Inventory", id }],
    }),

    createInventoryItem: builder.mutation<
      ApiResponse<InventoryItem>,
      InventoryItemRequest
    >({
      query: (body) => ({
        url: "/api/inventory/items",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),

    updateInventoryItem: builder.mutation<
      ApiResponse<InventoryItem>,
      { id: string; body: InventoryItemUpdateRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/inventory/items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        "Inventory",
        { type: "Inventory", id: arg.id },
      ],
    }),

    deleteInventoryItem: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/api/inventory/items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory"],
    }),

    bulkCreateInventoryItems: builder.mutation<
      ApiResponse<BulkInventoryImportResponse>,
      BulkInventoryItemRequest
    >({
      query: (body) => ({
        url: "/inventory/items/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),

    addStockMovement: builder.mutation<
      ApiResponse<StockMovement>,
      { itemId: string; body: StockMovementRequest }
    >({
      query: ({ itemId, body }) => ({
        url: `/api/inventory/items/${itemId}/stock-movements`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        "Inventory",
        { type: "Inventory", id: arg.itemId },
        { type: "StockMovement", id: arg.itemId },
      ],
    }),

    getStockMovements: builder.query<StockMovement[], string>({
      query: (itemId) => `/api/inventory/items/${itemId}/stock-movements`,
      providesTags: (_result, _error, itemId) => [
        { type: "StockMovement", id: itemId },
      ],
    }),
  }),
});

export const {
  useGetInventoryDashboardQuery,
  useGetInventoryItemsQuery,
  useGetInventoryItemQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useBulkCreateInventoryItemsMutation,
  useAddStockMovementMutation,
  useGetStockMovementsQuery,
} = inventoryApi;