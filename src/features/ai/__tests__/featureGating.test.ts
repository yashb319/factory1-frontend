import { describe, expect, it } from "vitest";
import { shouldShowFloatingAssistant } from "@/components/layout/AppShell";

describe("floating assistant feature gating", () => {
  it("never shows the assistant in the employee portal, without changing other roles", () => {
    expect(shouldShowFloatingAssistant(false, ["ai_assistant"], "/dashboard", "EMPLOYEE")).toBe(false);
    expect(shouldShowFloatingAssistant(false, ["ai_assistant"], "/help", "EMPLOYEE")).toBe(false);
    for (const role of ["OWNER", "ADMIN", "FINANCE", "MANAGEMENT"] as const) {
      expect(shouldShowFloatingAssistant(false, ["ai_assistant"], "/dashboard", role)).toBe(true);
    }
  });

  it("hides when AI is disabled and preserves platform-admin behavior", () => {
    expect(shouldShowFloatingAssistant(false, ["inventory"], "/dashboard")).toBe(false);
    expect(shouldShowFloatingAssistant(false, ["ai_assistant"], "/dashboard")).toBe(true);
    expect(shouldShowFloatingAssistant(true, ["ai_assistant"], "/dashboard")).toBe(false);
    expect(shouldShowFloatingAssistant(false, ["ai_assistant"], "/partner/whitelabel", "PARTNER_ADMIN")).toBe(false);
    expect(shouldShowFloatingAssistant(false, ["ai_assistant"], "/saas-admin", "SAAS_OWNER")).toBe(false);
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
