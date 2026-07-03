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
  provider: string;
  fallback: boolean;
};

export type AiChatRequest = {
  message: string;
  history: AiChatMessage[];
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};
