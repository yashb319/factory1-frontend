import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../types";
import { createAppStore } from "@/lib/store";
import { setCredentials } from "../authSlice";

const mocks = vi.hoisted(() => ({
  path: "/partner/whitelabel",
  replace: vi.fn(),
  factory: vi.fn(),
  branding: { displayName: "Factory1", logoUrl: null },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.path,
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/features/whitelabel/components/BrandingProvider", () => ({
  useBranding: () => mocks.branding,
}));
vi.mock("@/features/organization-features/api/organizationFeaturesApi", () => ({
  useGetOrganizationFeaturesQuery: () => { throw new Error("Control plane mounted tenant feature query"); },
}));
vi.mock("@/features/dashboard/api/dashboardApi", () => ({
  useGetDashboardSummaryQuery: () => { throw new Error("Control plane mounted tenant dashboard query"); },
}));

import { AuthGuard } from "../components/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";

const user: AuthUser = {
  id: "partner", name: "Partner", email: "partner@example.test", role: "PARTNER_ADMIN",
  status: "ACTIVE", organizationId: "", organizationStatus: "ACTIVE",
};

function TenantPage() {
  mocks.factory();
  return <p>Operational page</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.path = "/partner/whitelabel";
  localStorage.clear();
});

describe("render-time role boundaries", () => {
  it.each([
    [user, "/dashboard", "/partner/whitelabel"],
    [{ ...user, role: "OWNER", organizationId: "factory" }, "/partner/whitelabel", "/dashboard"],
    [{ ...user, platformAdmin: true }, "/inventory", "/saas-admin"],
  ] as const)("never mounts a forbidden page", async (identity, path, target) => {
    mocks.path = path;
    const store = createAppStore();
    store.dispatch(setCredentials({ token: "session", user: identity }));
    render(<Provider store={store}><AuthGuard><TenantPage /></AuthGuard></Provider>);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(target));
    expect(mocks.factory).not.toHaveBeenCalled();
    expect(screen.queryByText("Operational page")).not.toBeInTheDocument();
  });

  it("control-plane chrome has no factory dashboard/search/AI/shortcuts", () => {
    const store = createAppStore();
    store.dispatch(setCredentials({ token: "session", user }));
    render(<Provider store={store}><AppShell><h1>Partner brands</h1></AppShell></Provider>);
    expect(screen.getByRole("navigation", { name: "Administration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search modules, invoices, stock...")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Payroll" })).not.toBeInTheDocument();
  });
});
