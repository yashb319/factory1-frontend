import { baseApi } from "@/services/baseApi";
import type {
  AiActionExecuteRequest,
  AiActionExecuteResponse,
  AiChatRequest,
  AiChatResponse,
  ApiResponse,
} from "../types/ai.types";

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendAiMessage: builder.mutation<AiChatResponse, AiChatRequest>({
      query: (body) => ({
        url: "/api/ai/chat",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<AiChatResponse>) =>
        response.data,
    }),
    executeAiAction: builder.mutation<
      AiActionExecuteResponse,
      AiActionExecuteRequest
    >({
      query: (body) => ({
        url: "/api/ai/actions/execute",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Employee",
        "Customer",
        "Supplier",
        "Inventory",
        "Products",
        "Dashboard",
      ],
      transformResponse: (response: ApiResponse<AiActionExecuteResponse>) =>
        response.data,
    }),
  }),
});

export const { useSendAiMessageMutation, useExecuteAiActionMutation } = aiApi;
