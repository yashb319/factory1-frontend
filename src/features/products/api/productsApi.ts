import { baseApi } from "@/services/baseApi";
import type {
  ApiResponse,
  Bom,
  BomRequest,
  PageResponse,
  Product,
  ProductRequest,
  ProductionRequest,
  ProductionResponse,
} from "../types/product.types";

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<
      PageResponse<Product>,
      { page?: number; size?: number }
    >({
      query: ({ page = 0, size = 20 }) => ({
        url: "/api/products",
        params: {
          page,
          size,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      }),
      providesTags: ["Products"],
    }),

    createProduct: builder.mutation<Product, ProductRequest>({
      query: (body) => ({
        url: "/api/products",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<Product>) => response.data,
      invalidatesTags: ["Products"],
    }),

    updateProduct: builder.mutation<
      Product,
      { id: string; body: ProductRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/products/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<Product>) => response.data,
      invalidatesTags: ["Products"],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
    }),

    getBom: builder.query<Bom, string>({
      query: (productId) => `/api/products/${productId}/bom`,
      providesTags: ["Products"],
    }),

    saveBom: builder.mutation<Bom, { productId: string; body: BomRequest }>({
      query: ({ productId, body }) => ({
        url: `/api/products/${productId}/bom`,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<Bom>) => response.data,
      invalidatesTags: ["Products"],
    }),

    recordProduction: builder.mutation<ProductionResponse, ProductionRequest>({
      query: (body) => ({
        url: "/api/products/production",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<ProductionResponse>) =>
        response.data,
      invalidatesTags: ["Products", "Inventory"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetBomQuery,
  useSaveBomMutation,
  useRecordProductionMutation,
} = productsApi;