import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductWorkspace } from "../runtime/ProductWorkspace";
import { runtimeBootstrap } from "./runtimeFixtures";
import { reviewedRoutes } from "../runtime/policy";

const location = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({
  usePathname: () => location.pathname, useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
afterEach(() => { vi.unstubAllGlobals(); location.pathname = "/dashboard"; });

describe("isolated product factory workspace", () => {
  it("shows only reviewed product module cards without mounting mixed dashboard APIs", () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    render(<ProductWorkspace data={runtimeBootstrap()} />);
    expect(screen.getByRole("link", { name: "Open Inventory" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Employees|Payroll|Accounting|Tally|AI Assistant/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Role: OWNER/)).toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
  });

  it("does not mount operational hooks without the backend enforcement signal", () => {
    location.pathname = "/inventory";
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const data = runtimeBootstrap();
    data.session.operationalAccess = false;
    render(<ProductWorkspace data={data} />);
    expect(screen.getByRole("alert")).toHaveTextContent("has not been authorized by the backend");
    expect(network).not.toHaveBeenCalled();
  });

  it("honors explicit disabled decisions rather than deriving cards from purchased modules", () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const data = runtimeBootstrap();
    data.entitlements!.moduleDecisions = [{ key: "inventory", enabled: false, reasons: ["DOMAIN_DISABLED"] }];
    render(<ProductWorkspace data={data} />);
    expect(screen.queryByRole("link", { name: "Open Inventory" })).not.toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
  });

  it("gives finance only its reviewed role-intersected module cards", () => {
    const data = runtimeBootstrap();
    data.session.principal!.role = "FINANCE";
    data.entitlements!.role = "FINANCE";
    data.entitlements!.modules = ["inventory", "payroll", "billing", "accounting", "production_tracking"];
    data.entitlements!.runtimeRoutes = reviewedRoutes.map(({ method, path }) => ({ method, path }));
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    render(<ProductWorkspace data={data} />);
    for (const name of ["Open Payroll", "Open Billing", "Open Accounting reports"]) expect(screen.getByRole("link", { name })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open (Inventory|Employees|Production|Customers|Suppliers)/ })).not.toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    ["/leave", "Leave management", 4],
    ["/production", "Production", 1],
    ["/billing", "Billing", 1],
    ["/accounting", "Accounting reports", 6],
  ] as const)("mounts %s using reviewed existing APIs, never hidden legacy dependencies", async (pathname, heading, count) => {
    location.pathname = pathname;
    const data = runtimeBootstrap();
    data.entitlements!.modules = ["inventory", "payroll", "leave_management", "billing", "accounting", "production_tracking"];
    data.entitlements!.runtimeRoutes = reviewedRoutes.map(({ method, path }) => ({ method, path }));
    const network = vi.fn().mockImplementation(async (input: string) => {
      const path = new URL(input, "https://product.test").pathname.replace("/api/product-runtime", "");
      const reports: Record<string, unknown> = {
        "/api/accounting/ledgers": { totalReceivables: 0, totalPayables: 0, netReceivable: 0, parties: [] },
        "/api/accounting/trial-balance": { totalClosingDebit: 0, totalClosingCredit: 0, rows: [] },
        "/api/accounting/profit-loss": { grossProfit: 0, netProfit: 0, rows: [] },
        "/api/accounting/balance-sheet": { totalAssets: 0, totalLiabilities: 0, assets: [], liabilities: [] },
        "/api/accounting/aging": { rows: [], currentAmount: 0, days1To30Amount: 0, days31To60Amount: 0, days61To90Amount: 0, over90Amount: 0, totalOutstanding: 0 },
      };
      const payload = reports[path] ?? (["/api/leave/types", "/api/leave/calendar", "/api/leave/holidays"].includes(path)
        ? [] : { content: [], page: 0, size: 20, totalPages: 0, totalElements: 0 });
      return new Response(JSON.stringify({ success: true, message: "OK", data: payload }));
    });
    vi.stubGlobal("fetch", network);
    render(<ProductWorkspace data={data} />);
    expect(await screen.findByRole("heading", { name: heading }, { timeout: 10_000 })).toBeInTheDocument();
    await waitFor(() => expect(network).toHaveBeenCalledTimes(count));
    for (const [url] of network.mock.calls) {
      expect(url).toMatch(/^\/api\/product-runtime\//);
      expect(url).not.toMatch(/organization-settings|\/products|user-accounts|\/balances|\/public|\/jobs|\/ai/);
    }
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  }, 15_000);

  it.each(["/employees", "/payroll", "/tally/inventory", "/ai", "/partner/products", "/payslip/token"])(
    "blocks direct navigation to %s before operational hooks mount", (pathname) => {
      location.pathname = pathname;
      const network = vi.fn();
      vi.stubGlobal("fetch", network);
      render(<ProductWorkspace data={runtimeBootstrap()} />);
      expect(screen.getByRole("alert")).toHaveTextContent("This screen is unavailable for this product");
      expect(network).not.toHaveBeenCalled();
    },
  );

  it("requests only same-origin opaque-cookie inventory data with context generation and no bearer", async () => {
    location.pathname = "/inventory";
    const network = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      success: true, message: "OK", data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
    })));
    vi.stubGlobal("fetch", network);
    render(<ProductWorkspace data={runtimeBootstrap()} />);
    expect(await screen.findByText("No inventory items found.")).toBeInTheDocument();
    expect(network).toHaveBeenCalledWith("/api/product-runtime/api/inventory/items?page=0&size=10&sortBy=createdAt&sortDirection=DESC", expect.objectContaining({
      credentials: "same-origin", cache: "no-store", headers: expect.objectContaining({
        "X-Factory1-Context-Generation": runtimeBootstrap().session.contextGeneration,
      }),
    }));
    expect(JSON.stringify(network.mock.calls)).not.toContain("Bearer");
    expect(localStorage.length).toBe(0);
  });

  it("unmounts all factory data when context is revoked, rather than keeping stale records visible", async () => {
    location.pathname = "/inventory";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, code: "AUTH_REQUIRED" }), { status: 401 })));
    render(<ProductWorkspace data={runtimeBootstrap()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your factory access changed or expired");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
