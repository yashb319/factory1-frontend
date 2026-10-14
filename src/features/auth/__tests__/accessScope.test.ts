import { describe, expect, it } from "vitest";
import { accessScope, authRedirect } from "../accessScope";
import type { AuthUser } from "../types";
import { navigationItems, canAccessNavigationItem } from "@/config/navigation";
import { visibleShortcuts } from "@/config/shortcuts";

const owner: AuthUser = {
  id: "owner", name: "Owner", email: "owner@example.test", role: "OWNER",
  status: "ACTIVE", organizationId: "factory-a", organizationStatus: "ACTIVE",
};

describe("administrative scope isolation", () => {
  it("requires an active known identity, not a token or a role-like prefix", () => {
    expect(accessScope(null)).toBeNull();
    expect(accessScope({ ...owner, role: "SAAS_OWNER" })).toBeNull();
    expect(accessScope({ ...owner, status: "INACTIVE" })).toBeNull();
    expect(accessScope({ ...owner, organizationId: "" })).toBeNull();
    expect(authRedirect(null, "/dashboard", false)).toBe("/login");
  });

  it("blocks control-plane pages from factory identities before mounting", () => {
    for (const role of ["OWNER", "ADMIN", "MANAGEMENT", "FINANCE", "EMPLOYEE"] as const) {
      for (const path of ["/partner", "/partner/products", "/saas-admin", "/saas-admin/factories", "/admin/load-testing"]) {
        expect(authRedirect({ ...owner, role }, path, false)).toBe("/dashboard");
      }
    }
  });

  it("contains partner admins to the exact partner route tree", () => {
    const partner = { ...owner, role: "PARTNER_ADMIN" as const, organizationId: "" };
    expect(accessScope(partner)).toBe("partner");
    expect(authRedirect(partner, "/partner/whitelabel", false)).toBeNull();
    for (const path of ["/dashboard", "/production", "/partner-evil", "/saas-admin"]) {
      expect(authRedirect(partner, path, false)).toBe("/partner/whitelabel");
    }
    expect(visibleShortcuts(partner)).toEqual([]);
    expect(navigationItems.filter((item) => canAccessNavigationItem(item, partner)).every((item) => item.href.startsWith("/partner/"))).toBe(true);
  });

  it("uses platformAdmin authority rather than assuming SAAS_OWNER grants it", () => {
    const platform = { ...owner, platformAdmin: true };
    expect(authRedirect(platform, "/saas-admin/factories", false)).toBeNull();
    expect(authRedirect(platform, "/admin/load-testing/run", false)).toBeNull();
    expect(authRedirect(platform, "/saas-admin-other", false)).toBe("/saas-admin");
    expect(authRedirect(platform, "/inventory", false)).toBe("/saas-admin");
    expect(authRedirect({ ...owner, role: "SAAS_OWNER" }, "/saas-admin", false)).toBe("/login");
  });

  it("retains employee, pending, suspended and Tally boundaries", () => {
    expect(authRedirect(owner, "/dashboard", false)).toBeNull();
    expect(authRedirect(owner, "/tally/inventory", false)).toBe("/dashboard");
    expect(authRedirect(owner, "/tally/inventory", true)).toBeNull();
    expect(authRedirect({ ...owner, role: "EMPLOYEE" }, "/payroll", false)).toBe("/dashboard");
    expect(authRedirect({ ...owner, role: "EMPLOYEE" }, "/attendance", false)).toBeNull();
    expect(authRedirect({ ...owner, organizationStatus: "PENDING_APPROVAL" }, "/inventory", false)).toBe("/registration-pending");
    expect(authRedirect({ ...owner, organizationStatus: "SUSPENDED" }, "/inventory", false)).toBe("/login");
    expect(navigationItems.filter((item) => canAccessNavigationItem(item, null))).toEqual([]);
  });
});
