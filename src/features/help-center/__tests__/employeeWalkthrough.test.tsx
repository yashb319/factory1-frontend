import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { driver } from "driver.js";
import { FactoryWalkthrough } from "@/components/help/FactoryWalkthrough";
import type { UserRole } from "@/features/auth/types";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("driver.js", () => ({
  driver: vi.fn(() => ({ drive: vi.fn(), destroy: vi.fn() })),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("role-aware walkthrough", () => {
  it.each(["EMPLOYEE", "OWNER", "ADMIN"] as const)("preserves walkthroughs for %s with role-appropriate AI content", (role: UserRole) => {
    localStorage.setItem("factory1-walkthrough-seen:workspace", "true");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));
    const store = configureStore({ reducer: { auth: () => ({ user: { role } }) } });
    render(
      <Provider store={store}>
        <div data-tour="workspace" />
        <div data-tour="sidebar" />
        <div data-tour="ai-assistant" />
        <FactoryWalkthrough />
      </Provider>
    );
    act(() => { window.dispatchEvent(new Event("factory1:start-walkthrough")); });
    expect(driver).toHaveBeenCalledTimes(1);
    const steps = vi.mocked(driver).mock.calls[0][0]?.steps ?? [];
    if (role === "EMPLOYEE") {
      expect(steps.some((step) => step.element === "[data-tour='ai-assistant']")).toBe(false);
      expect(JSON.stringify(steps)).not.toMatch(/\bAI\b/);
      expect(JSON.stringify(steps)).toContain("Help Center");
    } else {
      expect(steps.some((step) => step.element === "[data-tour='ai-assistant']")).toBe(true);
    }
  });
});
