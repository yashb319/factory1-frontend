import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductWorkspace } from "../runtime/ProductWorkspace";
import { runtimeBootstrap } from "./runtimeFixtures";

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
