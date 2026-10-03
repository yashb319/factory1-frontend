import { describe, expect, it } from "vitest";
import { shouldShowFloatingAssistant } from "@/components/layout/AppShell";

describe("floating assistant feature gating", () => {
  it("hides when AI is disabled and preserves platform-admin behavior", () => {
    expect(shouldShowFloatingAssistant(false, ["inventory"])).toBe(false);
    expect(shouldShowFloatingAssistant(false, ["ai_assistant"])).toBe(true);
    expect(shouldShowFloatingAssistant(true, ["ai_assistant"])).toBe(false);
  });
});
