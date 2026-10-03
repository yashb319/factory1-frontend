import { describe, expect, it } from "vitest";
import {
  moduleContextFromPathname,
  isConversationResponseCurrent,
  rankAdaptiveQuestions,
} from "../lib/assistantContext";
import type { AiQuickQuestion } from "../types/ai.types";

const question = (
  id: string,
  module: AiQuickQuestion["module"],
  rank: number
): AiQuickQuestion => ({
  id,
  text: `${module} question ${id}`,
  module,
  reason: "Live data makes this useful.",
  category: "OPERATIONS",
  valueSignal: module === "INVENTORY" ? "CURRENT_MODULE" : "CROSS_FUNCTIONAL",
  rank,
});

describe("adaptive quick questions", () => {
  it("keeps a four-question current-module majority and at most two cross-module questions", () => {
    const ranked = rankAdaptiveQuestions(
      [
        question("1", "PAYROLL", 1),
        question("2", "INVENTORY", 2),
        question("3", "INVENTORY", 3),
        question("4", "ATTENDANCE", 4),
        question("5", "INVENTORY", 5),
        question("6", "INVENTORY", 6),
        question("7", "PRODUCTION", 7),
      ],
      "INVENTORY"
    );

    expect(ranked.filter((item) => item.module === "INVENTORY")).toHaveLength(4);
    expect(ranked.filter((item) => item.module !== "INVENTORY")).toHaveLength(2);
  });

  it("updates module context from route changes", () => {
    expect(moduleContextFromPathname("/inventory/items")).toBe("INVENTORY");
    expect(moduleContextFromPathname("/payroll")).toBe("PAYROLL");
    expect(moduleContextFromPathname("/unknown")).toBe("GENERAL");
  });

  it("rejects responses after the user switches conversations", () => {
    expect(isConversationResponseCurrent("conversation-a", "conversation-a")).toBe(true);
    expect(isConversationResponseCurrent("conversation-a", "conversation-b")).toBe(false);
    expect(isConversationResponseCurrent(undefined, undefined)).toBe(true);
    expect(isConversationResponseCurrent(undefined, "conversation-b")).toBe(false);
  });
});
