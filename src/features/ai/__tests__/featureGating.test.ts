import { describe, expect, it } from "vitest";
import { shouldShowFloatingAssistant } from "@/components/layout/AppShell";

describe("floating assistant feature gating", () => {
  it("hides when AI is disabled and preserves platform-admin behavior", () => {
    expect(shouldShowFloatingAssistant(false, ["inventory"], "/dashboard")).toBe(false);
    expect(shouldShowFloatingAssistant(false, ["ai_assistant"], "/dashboard")).toBe(true);
    expect(shouldShowFloatingAssistant(true, ["ai_assistant"], "/dashboard")).toBe(false);
  });

  it("suppresses the floating composer on full assistant routes", () => {
    expect(shouldShowFloatingAssistant(false, ["ai_assistant"], "/ai")).toBe(false);
    expect(
      shouldShowFloatingAssistant(false, ["ai_assistant"], "/ai/conversations/123")
    ).toBe(false);
    expect(
      shouldShowFloatingAssistant(false, ["ai_assistant"], "/inventory")
    ).toBe(true);
  });
});
