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
    return (response as ApiResponse<T>).data;
  }

  return response as T;
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
  const data = unwrapAiData(response);
  return {
    ...data,
    metrics: data.metrics ?? [],
    suggestions: data.suggestions ?? [],
    provider: data.provider ?? "",
    fallback: data.fallback ?? false,
  };
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
