import { describe, expect, it } from "vitest";
import type { AuthUser, UserRole } from "@/features/auth/types";
import type { AiActionProposal, AiQuickQuestion } from "../types/ai.types";
import {
  canUseProfitAdvisor,
  filterProfitQuickQuestions,
  getSafeProfitNavigationRoute,
  moduleContextFromRoute,
  productCostingRoute,
  productProfitabilityRoute,
} from "../lib/profitAdvisor";

function user(role: UserRole): AuthUser {
  return {
    id: "user-1",
    name: "User",
    email: "user@example.com",
    role,
    status: "ACTIVE",
    organizationId: "org-1",
    organizationStatus: "ACTIVE",
  };
}

function action(overrides: Partial<AiActionProposal> = {}): AiActionProposal {
  return {
    id: "open-profitability",
    module: "PROFIT",
    recordId: "product-1",
    recordLabel: "Cabinet profitability",
    field: "",
    currentValue: "",
    newValue: "",
    confirmationText: "Open the grounded profitability record",
    actionType: "NAVIGATE",
    displayOnly: true,
    route:
      "/products?view=profitability&profitabilityProduct=product-1",
    ...overrides,
  };
}

const questions: AiQuickQuestion[] = [
  {
    id: "profit",
    text: "Which product has the lowest contribution margin?",
    module: "PROFIT",
    reason: "Grounded portfolio facts",
    category: "FINANCE",
    valueSignal: "CROSS_FUNCTIONAL",
    rank: 1,
  },
  {
    id: "inventory",
    text: "What inventory needs attention?",
    module: "INVENTORY",
    reason: "Inventory facts",
    category: "INVENTORY",
    valueSignal: "CURRENT_MODULE",
    rank: 2,
  },
];

describe("profit advisor access and navigation", () => {
  it.each(["OWNER", "ADMIN", "FINANCE", "MANAGEMENT"] as const)(
    "allows %s only when both features are enabled",
    (role) => {
      expect(
        canUseProfitAdvisor(user(role), ["ai_assistant", "product_costing"])
      ).toBe(true);
      expect(canUseProfitAdvisor(user(role), ["ai_assistant"])).toBe(false);
      expect(canUseProfitAdvisor(user(role), undefined)).toBe(false);
    }
  );

  it("filters profit quick questions for unsupported roles", () => {
    expect(
      canUseProfitAdvisor(user("EMPLOYEE"), [
        "ai_assistant",
        "product_costing",
      ])
    ).toBe(false);
    expect(filterProfitQuickQuestions(questions, false)).toEqual([
      questions[1],
    ]);
    expect(filterProfitQuickQuestions(questions, true)).toEqual(questions);
  });

  it("uses PROFIT context only on the profitability route", () => {
    expect(
      moduleContextFromRoute(
        "/products",
        new URLSearchParams("view=profitability")
      )
    ).toBe("PROFIT");
    expect(
      moduleContextFromRoute("/products", new URLSearchParams())
    ).toBeNull();
  });

  it("accepts only explicit internal display-only profit navigation actions", () => {
    expect(getSafeProfitNavigationRoute(action())).toBe(
      "/products?view=profitability&profitabilityProduct=product-1"
    );
    expect(
      getSafeProfitNavigationRoute(
        action({
          route: "/products?view=profitability",
        })
      )
    ).toBe("/products?view=profitability");
    expect(
      getSafeProfitNavigationRoute(
        action({
          id: "open-profit-simulator",
          route:
            "/products?view=profitability&profitabilityProduct=product-1&profitSimulator=open&snapshotId=snapshot-1",
        })
      )
    ).toContain("profitSimulator=open");
    expect(
      getSafeProfitNavigationRoute(action({ displayOnly: false }))
    ).toBeNull();
    expect(
      getSafeProfitNavigationRoute(
        action({ route: "https://attacker.example/products?view=profitability" })
      )
    ).toBeNull();
    expect(
      getSafeProfitNavigationRoute(action({ route: "not a valid route" }))
    ).toBeNull();
    expect(
      getSafeProfitNavigationRoute(
        action({ actionType: undefined, route: "/products" })
      )
    ).toBeNull();
  });

  it("builds exact product profitability and costing record links", () => {
    expect(productProfitabilityRoute("product 1")).toBe(
      "/products?view=profitability&profitabilityProduct=product+1"
    );
    expect(productCostingRoute("product 1", "snapshot/1")).toBe(
      "/products?costingProduct=product+1&snapshotId=snapshot%2F1"
    );
  });
});
