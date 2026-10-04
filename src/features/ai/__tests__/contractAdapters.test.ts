import { describe, expect, it } from "vitest";
import {
  adaptChatResponse,
  serializeAiChatRequest,
  unwrapAiData,
  unwrapAiNullData,
} from "../lib/contractAdapters";

describe("AI v2 request contract", () => {
  it("serializes server-history chat requests without client history", () => {
    expect(
      serializeAiChatRequest({
        message: "What needs my attention today?",
        conversationId: "38bc9452-544f-4f61-92be-52cc290fae27",
        moduleContext: "GENERAL",
        currentRoute: "/dashboard",
      })
    ).toEqual({
      message: "What needs my attention today?",
      conversationId: "38bc9452-544f-4f61-92be-52cc290fae27",
      moduleContext: "GENERAL",
      currentRoute: "/dashboard",
    });
  });

  it("omits optional fields rather than sending null placeholders", () => {
    expect(serializeAiChatRequest({ message: "Hello" })).toEqual({
      message: "Hello",
    });
  });

  it("serializes optional grounded profit context without changing legacy requests", () => {
    expect(
      serializeAiChatRequest({
        message: "Explain this product margin",
        moduleContext: "PROFIT",
        currentRoute:
          "/products?view=profitability&profitabilityProduct=product-1",
        profit: {
          focus: "PRICE_CHANGE_WHAT_IF",
          from: "2026-09-01",
          to: "2026-09-30",
          productId: "product-1",
          pricePercentChange: 5,
        },
      })
    ).toEqual({
      message: "Explain this product margin",
      moduleContext: "PROFIT",
      currentRoute:
        "/products?view=profitability&profitabilityProduct=product-1",
      profit: {
        focus: "PRICE_CHANGE_WHAT_IF",
        from: "2026-09-01",
        to: "2026-09-30",
        productId: "product-1",
        pricePercentChange: 5,
      },
    });
  });

  it("keeps pre-Phase-4 chat responses backward compatible", () => {
    const response = {
      answer: "Grounded answer",
      conversationId: "conversation-1",
      userMessageId: "user-1",
      assistantMessageId: "assistant-1",
      title: "Answer",
      module: "GENERAL" as const,
      metrics: [],
      suggestions: [],
      chart: null,
      actions: [],
      records: [],
      thinking: [],
      followUp: null,
      provider: "primary",
      fallback: false,
      intent: null,
      entity: null,
      provenance: null,
    };

    expect(adaptChatResponse(response)).toBe(response);
    expect(adaptChatResponse(response).profit).toBeUndefined();
  });

  it("rejects null data for endpoints that require a DTO", () => {
    expect(() =>
      unwrapAiData({
        success: true,
        message: "Unexpected",
        data: null,
      })
    ).toThrow(/null data/i);
  });

  it("accepts only data:null for the delete envelope", () => {
    expect(
      unwrapAiNullData({
        success: true,
        message: "Deleted",
        data: null,
      })
    ).toBeUndefined();
    expect(() =>
      unwrapAiNullData({
        success: true,
        message: "Invalid",
        data: "not-null" as never,
      })
    ).toThrow(/must contain null data/i);
  });
});
