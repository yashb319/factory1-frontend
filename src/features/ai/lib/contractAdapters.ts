import type {
  AiChatRequest,
  AiChatResponse,
  AiConversation,
  AiConversationList,
  AiQuickQuestionList,
  ApiResponse,
} from "../types/ai.types";

export function unwrapAiData<T>(response: ApiResponse<T> | T): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    "success" in response
  ) {
    const data = (response as ApiResponse<T>).data;
    if (data === null) {
      throw new Error("AI API returned null data for a required response");
    }
    return data;
  }

  if (response === null) {
    throw new Error("AI API returned an unexpected null response");
  }

  return response as T;
}

export function unwrapAiNullData(response: ApiResponse<null>): void {
  if (response.data !== null) {
    throw new Error("AI delete response must contain null data");
  }
}

export function serializeAiChatRequest(request: AiChatRequest): AiChatRequest {
  return {
    message: request.message,
    ...(request.conversationId
      ? { conversationId: request.conversationId }
      : {}),
    ...(request.moduleContext ? { moduleContext: request.moduleContext } : {}),
    ...(request.currentRoute ? { currentRoute: request.currentRoute } : {}),
    ...(request.businessInsight ? { businessInsight: true } : {}),
    ...(request.benchmark ? { benchmark: request.benchmark } : {}),
  };
}

export function adaptChatResponse(
  response: ApiResponse<AiChatResponse> | AiChatResponse
): AiChatResponse {
  return unwrapAiData(response);
}

export const adaptConversationList = (
  response: ApiResponse<AiConversationList> | AiConversationList
) => unwrapAiData(response);

export const adaptConversation = (
  response: ApiResponse<AiConversation> | AiConversation
) => unwrapAiData(response);

export const adaptQuickQuestions = (
  response: ApiResponse<AiQuickQuestionList> | AiQuickQuestionList
) => unwrapAiData(response);
