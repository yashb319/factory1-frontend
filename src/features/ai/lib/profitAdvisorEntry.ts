import type { AiProfitRequest } from "../types/ai.types";

export const AI_PROFIT_ADVISOR_EVENT = "factory1:profit-advisor-request";

export type AiProfitAdvisorEntryRequest = {
  question: string;
  profit: AiProfitRequest;
};

export function requestProfitAdvisor(entry: AiProfitAdvisorEntryRequest) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AiProfitAdvisorEntryRequest>(AI_PROFIT_ADVISOR_EVENT, {
      detail: entry,
    })
  );
}
