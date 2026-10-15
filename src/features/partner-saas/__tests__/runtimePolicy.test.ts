import { describe, expect, it } from "vitest";
import { hasOperationalAccess } from "../runtime/access";
import { reviewedRuntimeRoute, runtimeQueryAllowed, runtimeRouteAllowed, runtimeScreens } from "../runtime/policy";
import { runtimeBootstrap, factoryId } from "./runtimeFixtures";

describe("reviewed product runtime policy", () => {
  it("requires backend access, active principal, context and matching generations", () => {
    const data = runtimeBootstrap();
    expect(hasOperationalAccess(data)).toBe(true);
    expect(hasOperationalAccess({ ...data, session: { ...data.session, operationalAccess: false } })).toBe(false);
    expect(hasOperationalAccess({ ...data, session: { ...data.session, principal: null } })).toBe(false);
    expect(hasOperationalAccess({ ...data, session: { ...data.session, contextGeneration: "other-context" } })).toBe(false);
    expect(hasOperationalAccess({ ...data, entitlements: { ...data.entitlements!, productId: factoryId } })).toBe(false);
    expect(hasOperationalAccess({ ...data, entitlements: { ...data.entitlements!, ready: false } })).toBe(false);
    expect(hasOperationalAccess({ ...data, entitlements: { ...data.entitlements!, modules: [] } })).toBe(false);
    expect(hasOperationalAccess({ ...data, session: { ...data.session, expiresAt: "2020-01-01T00:00:00Z" } })).toBe(false);
  });

  it("does not widen an inventory product when another product grants payroll", () => {
    const routes = [...runtimeBootstrap().entitlements!.runtimeRoutes, { method: "GET", path: "/api/employees" }];
    expect(runtimeScreens(routes, "OWNER", ["inventory"])).toEqual([
      { href: "/inventory", label: "Inventory", path: "/api/inventory/items" },
    ]);
    expect(runtimeScreens(routes, "OWNER", ["payroll"])).toEqual([
      { href: "/employees", label: "Employees", path: "/api/employees" },
    ]);
    expect(runtimeScreens(routes, "FINANCE", ["inventory", "payroll"])).toEqual([]);
    expect(runtimeScreens(routes, "PARTNER_ADMIN", ["inventory", "payroll"])).toEqual([]);
    expect(runtimeRouteAllowed(routes, "OWNER", "POST", "/api/employees", ["payroll"])).toBe(false);
  });

  it("requires exact reviewed methods and UUID identifiers, never arbitrary paths or origins", () => {
    for (const path of ["/api/ai/chat", "/api/dashboard", "/api/saas-admin/factories", "/api/inventory/items/bulk",
      "/api/employees/invite", "//evil.test/api/employees", "/api/employees/%2e%2e", "/api/employees/123",
      "/api/employees/../../admin", "/api/employees\\evil"]) {
      expect(reviewedRuntimeRoute("GET", path)).toBeUndefined();
    }
    expect(reviewedRuntimeRoute("PATCH", "/api/employees")).toBeUndefined();
    expect(reviewedRuntimeRoute("GET", `/api/employees/${factoryId}`)).toMatchObject({ path: "/api/employees/{id}" });
    const routes = [{ method: "DELETE", path: "/api/employees/{id}" }];
    expect(runtimeRouteAllowed(routes, "MANAGEMENT", "DELETE", `/api/employees/${factoryId}`, ["payroll"])).toBe(false);
    expect(runtimeRouteAllowed(routes, "ADMIN", "DELETE", `/api/employees/${factoryId}`, ["payroll"])).toBe(true);
  });

  it("rejects tenant-authority queries and duplicate/oversized query values", () => {
    expect(runtimeQueryAllowed(new URLSearchParams({ page: "0", size: "20", search: "steel" }))).toBe(true);
    for (const query of ["organizationId=forged", "productId=forged", "partnerId=forged", "page=0&page=1", `search=${"a".repeat(201)}`]) {
      expect(runtimeQueryAllowed(new URLSearchParams(query))).toBe(false);
    }
  });
});
