import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { hasOperationalAccess } from "../runtime/access";
import { reviewedRoutes, reviewedRuntimeRoute, runtimeQueryAllowed, runtimeRouteAllowed, runtimeScreens } from "../runtime/policy";
import { runtimeBootstrap, factoryId } from "./runtimeFixtures";

describe("reviewed product runtime policy", () => {
  it("matches all 105 frozen backend method/path/dependency/role rows at 6522bfce", () => {
    const rows = reviewedRoutes.map((route) =>
      `${route.method} ${route.path}|${route.features.join("+")}|${route.roles.join(",")}`).sort();
    expect(rows).toHaveLength(105);
    expect(createHash("sha256").update(rows.join("\n")).digest("hex"))
      .toBe("a325dd97ab2a293921c17572fbb6e81939eb6f89661ad35b2befa090e1f15cd5");
  });
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

  it("intersects every reviewed route with all role and module dependencies and explicit denials", () => {
    for (const route of reviewedRoutes) {
      const concrete = route.path.replace(/\{attendanceDate\}/g, "2026-05-12").replace(/\{[^}]+\}/g, factoryId);
      expect(reviewedRuntimeRoute(route.method, concrete)).toBe(route);
      const grant = [{ method: route.method, path: route.path }];
      for (const role of ["OWNER", "ADMIN", "MANAGEMENT", "FINANCE", "EMPLOYEE", "PARTNER_ADMIN"]) {
        expect(runtimeRouteAllowed(grant, role, route.method, concrete, route.features)).toBe(route.roles.includes(role));
      }
      expect(runtimeRouteAllowed(grant, route.roles[0], route.method, concrete, route.features)).toBe(true);
      expect(runtimeRouteAllowed([], route.roles[0], route.method, concrete, route.features)).toBe(false);
      expect(runtimeRouteAllowed(grant, "PARTNER_ADMIN", route.method, concrete, route.features)).toBe(false);
      for (const dependency of route.features) {
        expect(runtimeRouteAllowed(grant, route.roles[0], route.method, concrete,
          route.features.filter((feature) => feature !== dependency))).toBe(false);
        expect(runtimeRouteAllowed(grant, route.roles[0], route.method, concrete, route.features,
          [{ key: dependency, enabled: false }])).toBe(false);
      }
    }
  });

  it("keeps accounting read-only and quantity mutations behind both production and inventory", () => {
    expect(reviewedRoutes.filter((route) => route.path.startsWith("/api/accounting/")).every((route) => route.method === "GET")).toBe(true);
    const grant = [{ method: "POST", path: "/api/production/orders/{orderId}/steps/{stepId}/record" }];
    const path = `/api/production/orders/${factoryId}/steps/${factoryId}/record`;
    expect(runtimeRouteAllowed(grant, "MANAGEMENT", "POST", path, ["production_tracking"])).toBe(false);
    expect(runtimeRouteAllowed(grant, "MANAGEMENT", "POST", path, ["production_tracking", "inventory"])).toBe(true);
    expect(runtimeRouteAllowed(grant, "FINANCE", "POST", path, ["production_tracking", "inventory"])).toBe(false);
  });

  it("allows only contextual inventory export jobs, not file URLs, legacy jobs or arbitrary export suffixes", () => {
    expect(reviewedRuntimeRoute("POST", "/exports/inventory")?.path).toBe("/exports/inventory");
    expect(reviewedRuntimeRoute("GET", `/exports/inventory/${factoryId}/download`)?.path).toBe("/exports/inventory/{id}/download");
    for (const path of ["/exports/payroll", "/exports/inventory/legacy/download", `/exports/inventory/${factoryId}/files`,
      "/api/exports", "/api/files", "/api/attendance/public/qr", "/api/production/orders/preview"]) {
      expect(reviewedRuntimeRoute("GET", path)).toBeUndefined();
    }
    expect(runtimeQueryAllowed(new URLSearchParams({ productId: factoryId }), "/api/production/boms")).toBe(true);
    expect(runtimeQueryAllowed(new URLSearchParams({ productId: factoryId }), "/api/billing/bills")).toBe(false);
  });
});
