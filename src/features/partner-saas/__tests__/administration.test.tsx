import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { partnerId, productId, userId, domain, product } from "./fixtures";
import { PartnerProductAdmin } from "../components/PartnerProductAdmin";
import { ProductDomains } from "../components/ProductDomains";
import { ProductEditor } from "../components/ProductEditor";

const mocks = vi.hoisted(() => ({
  enabled: true, role: "VIEWER", verification: false,
  user: { role: "PARTNER_ADMIN", status: "ACTIVE", platformAdmin: false, organizationId: "" },
  memberships: vi.fn(), products: vi.fn(), features: vi.fn(), domains: vi.fn(),
  create: vi.fn(), update: vi.fn(), request: vi.fn(), verify: vi.fn(), renew: vi.fn(), updateDomain: vi.fn(),
}));
vi.mock("../config", () => ({ get PARTNER_SAAS_V2_ENABLED() { return mocks.enabled; } }));
vi.mock("@/lib/hook", () => ({
  useAppSelector: (select: (state: { auth: { user: typeof mocks.user } }) => unknown) => select({ auth: { user: mocks.user } }),
}));
vi.mock("@/features/whitelabel/api/whitelabelApi", () => ({
  useGetSaasWhitelabelPartnersQuery: () => { throw new Error("Partner attempted global partner enumeration"); },
}));
vi.mock("../api", () => ({
  useGetPartnerMembershipsQuery: () => { mocks.memberships(); return { currentData: {
    items: [{ partnerId, userId, role: mocks.role, active: true, version: 0 }], offset: 0, limit: 20, total: 1,
  }, refetch: vi.fn() }; },
  useGetSaasProductsQuery: (args: unknown) => { mocks.products(args); return { currentData: { items: [product], offset: 0, limit: 20, total: 1 }, refetch: vi.fn() }; },
  useGetSaasProductFeaturesQuery: () => { mocks.features(); return { currentData: ["payroll", "inventory"], refetch: vi.fn() }; },
  useCreateSaasProductMutation: () => [mocks.create, { isLoading: false }],
  useUpdateSaasProductMutation: () => [mocks.update, { isLoading: false }],
  useGetProductDomainsQuery: () => { mocks.domains(); return { currentData: {
    domains: { items: [domain], offset: 0, limit: 20, total: 1 },
    capabilities: { ownershipVerification: mocks.verification, routingProvisioning: false, tlsProvisioning: false, storefrontRollout: false },
  }, refetch: vi.fn() }; },
  useRequestProductDomainMutation: () => [mocks.request, { isLoading: false }],
  useVerifyProductDomainMutation: () => [mocks.verify, { isLoading: false }],
  useRenewProductDomainChallengeMutation: () => [mocks.renew, { isLoading: false }],
  useUpdateProductDomainMutation: () => [mocks.updateDomain, { isLoading: false }],
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enabled = true; mocks.role = "VIEWER"; mocks.verification = false;
  mocks.user = { role: "PARTNER_ADMIN", status: "ACTIVE", platformAdmin: false, organizationId: "" };
  mocks.create.mockReturnValue({ unwrap: async () => product });
  mocks.update.mockReturnValue({ unwrap: async () => product });
  mocks.verify.mockReturnValue({ unwrap: async () => domain });
  mocks.request.mockReturnValue({ unwrap: async () => domain });
  mocks.renew.mockReturnValue({ unwrap: async () => domain });
  mocks.updateDomain.mockReturnValue({ unwrap: async () => domain });
});

describe("scoped foundation administration", () => {
  it("does not mount discovery or product query hooks while rollout is disabled", () => {
    mocks.enabled = false;
    render(<PartnerProductAdmin />);
    expect(screen.getByRole("heading", { name: /foundation is disabled/ })).toBeInTheDocument();
    expect(mocks.memberships).not.toHaveBeenCalled();
    expect(mocks.products).not.toHaveBeenCalled();
  });

  it("blocks factory identities before discovery and does not enumerate global partner rows", () => {
    mocks.user.role = "OWNER"; mocks.user.organizationId = "factory";
    render(<PartnerProductAdmin />);
    expect(screen.getByRole("alert")).toHaveTextContent("not available");
    expect(mocks.memberships).not.toHaveBeenCalled();
  });

  it("discovers only authorized scopes and makes VIEWER product/domain controls read-only", () => {
    render(<PartnerProductAdmin />);
    expect(mocks.products).toHaveBeenCalledWith({ platform: false, partnerId, offset: 0, limit: 20 });
    expect(screen.queryByRole("button", { name: "New SaaS product" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manage Acme HR" }));
    expect(screen.getByRole("textbox", { name: "Display name" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request domain" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /payroll|inventory/i })).not.toBeInTheDocument();
  });

  it("shows separate ownership, routing and TLS, without activation or false SSL readiness", () => {
    render(<ProductDomains scope={{ platform: false, partnerId }} productId={productId} canEdit />);
    expect(screen.getByRole("button", { name: `Check ownership of ${domain.hostname}` })).toBeDisabled();
    const list = screen.getByRole("list");
    expect(within(list).getByText("VERIFIED")).toBeInTheDocument();
    expect(within(list).getAllByText("PENDING")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /activate|provision|ready/i })).not.toBeInTheDocument();
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("captures the reviewed version in domain retirement and does not submit before confirmation", async () => {
    render(<ProductDomains scope={{ platform: false, partnerId }} productId={productId} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "Retire domain" }));
    expect(mocks.updateDomain).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("retire permanently");
    fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
    await waitFor(() => expect(mocks.updateDomain).toHaveBeenCalledWith({
      partnerId, platform: false, productId, domainId: domain.id, expectedVersion: 2, status: "RETIRED",
    }));
  });

  it("supports keyboard dialog cancellation with an accessible name and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(<ProductDomains scope={{ platform: false, partnerId }} productId={productId} canEdit />);
    const trigger = screen.getByRole("button", { name: "Retire domain" });
    await user.click(trigger);
    expect(screen.getByRole("alertdialog", { name: "Confirm domain change" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(mocks.updateDomain).not.toHaveBeenCalled();
  });

  it("replaces only product metadata/package with a reviewed version, not owner/code/tenant scope", async () => {
    render(<ProductEditor scope={{ platform: false, partnerId }} product={product} features={["payroll", "inventory"]} canEdit onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), { target: { value: "New name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({
      platform: false, partnerId, productId, body: {
        displayName: "New name", featureKeys: ["payroll"], logoUrl: null, faviconUrl: null,
        primaryColorHex: "#123456", accentColorHex: null, status: "DRAFT", expectedVersion: 3,
      },
    }));
  });

  it("surfaces version conflict without retry or success", async () => {
    mocks.update.mockReturnValue({ unwrap: async () => { throw { status: 409, data: { code: "VERSION_CONFLICT", message: "Refresh and review this product again" } }; } });
    const saved = vi.fn();
    render(<ProductEditor scope={{ platform: false, partnerId }} product={product} features={["payroll"]} canEdit onClose={vi.fn()} onSaved={saved} />);
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Refresh and review"));
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();
  });
});
