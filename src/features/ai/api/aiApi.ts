import { baseApi } from "@/services/baseApi";
import type {
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
  }),
});

export const { useSendAiMessageMutation } = aiApi;
