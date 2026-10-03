export type AiChatRole = "USER" | "ASSISTANT";

export const AI_MODULE_CONTEXTS = [
  "GENERAL",
  "INVENTORY",
  "ATTENDANCE",
  "PAYROLL",
  "EMPLOYEES",
  "PRODUCTION",
  "PRODUCTS",
  "BILLING",
  "CUSTOMERS",
  "SUPPLIERS",
] as const;

export type AiModuleContext = (typeof AI_MODULE_CONTEXTS)[number];

export type AiChatMessage = {
  id: string;
  conversationId: string;
  role: AiChatRole;
  content: string;
  module: AiModuleContext;
  createdAt: string;
  snapshot: AiMessageSnapshot | null;
};

export type AiMetric = {
  label: string;
  value: string;
  tone: "neutral" | "good" | "warning" | "danger";
};

export type AiChartPoint = {
  label: string;
  value: number;
};

export type AiChart = {
  type: "bar" | "line" | "pie";
  title: string;
  data: AiChartPoint[];
};

export type AiProvenance = {
  module: AiModuleContext;
  summary: string;
  period: string | null;
  recordCount: number;
};

export type AiMessageSnapshot = {
  metrics: AiMetric[];
  suggestions: string[];
  chart: AiChart | null;
  actions: AiActionProposal[];
  records: AiRelevantRecord[];
  thinking: string[];
  followUp: string | null;
  provider: string;
  fallback: boolean;
  intent: string | null;
  entity: string | null;
  provenance: AiProvenance | null;
};

export type AiChatResponse = AiMessageSnapshot & {
  answer: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  title: string;
  module: AiModuleContext;
  provenance: AiProvenance | null;
};

export type AiRelevantRecord = {
  module: string;
  title: string;
  fields: Record<string, unknown>;
};

export type AiChatRequest = {
  message: string;
  conversationId?: string;
  moduleContext?: AiModuleContext;
  currentRoute?: string;
  businessInsight?: boolean;
  benchmark?: string;
};

export type AiConversationSummary = {
  id: string;
  title: string;
  currentModule: AiModuleContext;
  dominantModule: AiModuleContext;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  preview: string | null;
};

export type AiConversation = AiConversationSummary & {
  messages: AiChatMessage[];
};

export type AiConversationList = {
  content: AiConversationSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AiConversationCreateRequest = {
  title?: string;
  moduleContext?: AiModuleContext;
  currentRoute?: string;
};

export type AiConversationRenameRequest = {
  conversationId: string;
  title: string;
};

export type AiQuickQuestion = {
  id: string;
  text: string;
  module: AiModuleContext;
  reason: string;
  category:
    | "RISK"
    | "OPERATIONS"
    | "FINANCE"
    | "WORKFORCE"
    | "INVENTORY"
    | "PRODUCTION"
    | "SALES"
    | "PURCHASES";
  valueSignal:
    | "LIVE_RISK"
    | "HISTORY_INTEREST"
    | "CURRENT_MODULE"
    | "CROSS_FUNCTIONAL"
    | "COLD_START";
  rank: number;
};

export type AiQuickQuestionList = AiQuickQuestion[];

export type BenchmarkProfile = {
  key: string;
  label: string;
  description: string;
  type: "OWN" | "INDUSTRY" | "LISTED" | "SIZE";
  grossLow: number;
  grossHigh: number;
  netLow: number;
  netHigh: number;
  payrollLow: number;
  payrollHigh: number;
  turnoverLow: number;
  turnoverHigh: number;
  source?: string;
};

export type ListedCompanyRef = {
  provider: "indian" | "roic";
  symbol: string;
  name: string;
  exchange?: string;
};

export type BusinessInsightDrilldown = {
  topic: string;
  title: string;
  summary: string;
  items: {
    label: string;
    detail: string;
    value: string;
    action: string;
  }[];
  benchmarkNote: string;
  chart: {
    label: string;
    value: number;
  }[];
  rangeFrom?: string;
  rangeTo?: string;
  benchmark?: string;
  benchmarkLabel?: string;
};

export type AiActionProposal = {
  id: string;
  module: string;
  recordId: string;
  recordLabel: string;
  field: string;
  currentValue: string;
  newValue: string;
  confirmationText: string;
  payload?: Record<string, unknown>;
  create?: boolean;
  newValues?: Record<string, unknown>;
  currentValues?: Record<string, unknown>;
  delete?: boolean;
  restore?: boolean;
  approve?: boolean;
  export?: boolean;
};

export type AiActionExecuteRequest = {
  actionId: string;
  module: string;
  recordId: string;
  field: string;
  newValue: string;
  payload?: Record<string, unknown>;
  create?: boolean;
  fields?: Record<string, string>;
  delete?: boolean;
  restore?: boolean;
  approve?: boolean;
  export?: boolean;
};

export type AiActionExecuteResponse = {
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
};
