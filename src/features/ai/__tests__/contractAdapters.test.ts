import { describe, expect, it } from "vitest";
import { serializeAiChatRequest } from "../lib/contractAdapters";

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
});
