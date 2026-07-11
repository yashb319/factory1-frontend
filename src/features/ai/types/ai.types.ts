export type AiChatRole = "user" | "assistant";

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
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

export type AiChatResponse = {
  answer: string;
  metrics: AiMetric[];
  suggestions: string[];
  chart?: AiChart | null;
  actions?: AiActionProposal[];
  records?: AiRelevantRecord[];
  thinking?: string[];
  followUp?: string;
  provider: string;
  fallback: boolean;
  intent?: string;
  entity?: string;
};

export type AiRelevantRecord = {
  module: string;
  title: string;
  fields: Record<string, unknown>;
};

export type AiChatRequest = {
  message: string;
  history: AiChatMessage[];
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
  data: T;
};
