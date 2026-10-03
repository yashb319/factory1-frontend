import type {
  AiChatMessage,
  AiModuleContext,
  AiQuickQuestion,
} from "../types/ai.types";

export const AI_CONVERSATION_STORAGE_KEY = "factory1-ai-conversation-id";
export const AI_CONVERSATION_EVENT = "factory1:ai-conversation-change";

const moduleAliases: Record<string, AiModuleContext> = {
  dashboard: "GENERAL",
  employees: "EMPLOYEES",
  attendance: "ATTENDANCE",
  leave: "ATTENDANCE",
  inventory: "INVENTORY",
  products: "PRODUCTS",
  production: "PRODUCTION",
  payroll: "PAYROLL",
  billing: "BILLING",
  accounting: "GENERAL",
  customers: "CUSTOMERS",
  suppliers: "SUPPLIERS",
  vendors: "SUPPLIERS",
  "import-export": "GENERAL",
  "organization-settings": "GENERAL",
  ai: "GENERAL",
};

export function moduleContextFromPathname(pathname: string): AiModuleContext {
  const segment = pathname.split("/").filter(Boolean).at(0) ?? "dashboard";
  return moduleAliases[segment] ?? "GENERAL";
}

export function rankAdaptiveQuestions(
  questions: AiQuickQuestion[],
  currentModule: AiModuleContext,
  limit = 6
): AiQuickQuestion[] {
  const deduped = [...new Map(questions.map((item) => [item.text, item])).values()]
    .sort((a, b) => a.rank - b.rank);
  const local = deduped.filter((item) => item.module === currentModule);
  const crossModule = deduped.filter((item) => item.module !== currentModule);

  return [...local.slice(0, 4), ...crossModule.slice(0, 2)]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
}

export function readCurrentConversationId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(AI_CONVERSATION_STORAGE_KEY) ?? undefined;
}

export function setCurrentConversationId(conversationId?: string) {
  if (typeof window === "undefined") return;

  if (conversationId) {
    window.localStorage.setItem(AI_CONVERSATION_STORAGE_KEY, conversationId);
  } else {
    window.localStorage.removeItem(AI_CONVERSATION_STORAGE_KEY);
  }

  window.dispatchEvent(
    new CustomEvent(AI_CONVERSATION_EVENT, { detail: { conversationId } })
  );
}

export function isConversationResponseCurrent(
  requestConversationId: string | undefined,
  currentConversationId: string | undefined
) {
  return requestConversationId === currentConversationId;
}

export function isHistoricalAssistantMessage(
  message: Pick<AiChatMessage, "id" | "role">,
  liveAssistantMessageIds: ReadonlySet<string>
) {
  return (
    message.role === "ASSISTANT" &&
    !liveAssistantMessageIds.has(message.id)
  );
}
