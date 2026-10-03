import { describe, expect, it } from "vitest";
import {
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
