import { describe, expect, it } from "vitest";
import type { AuthUser, UserRole } from "@/features/auth/types";
import {
  canManageProductCosting,
  canManageProductOperations,
  isProductCostingEnabled,
} from "../utils/costingAccess";

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

describe("product costing access", () => {
  it.each(["OWNER", "ADMIN", "FINANCE"] as const)(
    "allows %s to manage costing",
    (role) => {
      expect(canManageProductCosting(user(role))).toBe(true);
    }
  );

  it("does not grant finance product operations", () => {
    expect(canManageProductOperations(user("FINANCE"))).toBe(false);
  });

  it("does not grant costing to management or employees", () => {
    expect(canManageProductCosting(user("MANAGEMENT"))).toBe(false);
    expect(canManageProductCosting(user("EMPLOYEE"))).toBe(false);
  });

  it("fails open while features load and honors the costing entitlement once loaded", () => {
    expect(isProductCostingEnabled(undefined)).toBe(true);
    expect(isProductCostingEnabled(["product_costing"])).toBe(true);
    expect(isProductCostingEnabled(["inventory"])).toBe(false);
  });
});
