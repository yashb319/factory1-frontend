import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductCustomers } from "../components/ProductCustomers";
import { PartnerModulePolicy, DomainModulePolicy } from "../components/ModulePolicies";
import { partnerId, productId, userId, domain } from "./fixtures";

const customerId = "99999999-9999-4999-8999-999999999999";
const customer = {
  id: customerId, productId, organizationId: "55555555-5555-4555-8555-555555555555",
  factoryName: "Pending Factory", subscriptionId: "88888888-8888-4888-8888-888888888888",
  subscriptionStatus: "PENDING", organizationStatus: "PENDING_APPROVAL", ownerUserId: userId,
  invitation: { id: customerId, status: "PENDING", expiresAt: "2026-11-01T00:00:00Z" }, createdAt: "2026-10-15T00:00:00Z",
};
const mocks = vi.hoisted(() => ({
  user: { role: "PARTNER_ADMIN", status: "ACTIVE", platformAdmin: false, organizationId: "" },
  onboard: vi.fn(), ceiling: vi.fn(), domain: vi.fn(), policy: vi.fn(), grants: vi.fn(),
}));
vi.mock("@/lib/hook", () => ({
  useAppSelector: (select: (state: { auth: { user: typeof mocks.user } }) => unknown) => select({ auth: { user: mocks.user } }),
}));
vi.mock("../api", () => ({
  useGetProductOnboardingPolicyQuery: () => ({ currentData: { enabled: true, invitationDelivery: false, activationMode: "PLATFORM_EVIDENCE_REQUIRED", checkout: false, existingIdentityAcceptance: "AUTHENTICATED_EXPLICIT" } }),
  useGetProductCustomersQuery: () => ({ currentData: { items: [customer], offset: 0, limit: 20, total: 1 } }),
  useGetProductCustomerQuery: () => ({ currentData: customer }),
  useOnboardProductCustomerMutation: () => [mocks.onboard, { isLoading: false, reset: vi.fn() }],
  useGetPartnerEntitlementPolicyQuery: () => { mocks.policy(); return { currentData: { featureKeys: ["inventory"], approved: false, version: 7 } }; },
  useGetSaasProductFeaturesQuery: () => ({ currentData: ["inventory", "payroll"] }),
  useUpdatePartnerEntitlementPolicyMutation: () => [mocks.ceiling, { isLoading: false }],
  useGetDomainModulePolicyQuery: () => ({ currentData: { featureKeys: null, version: 3 } }),
  useUpdateDomainModulePolicyMutation: () => [mocks.domain, { isLoading: false }],
  useGetTenantMembershipsQuery: () => { throw new Error("Partner mounted platform tenant membership hooks"); },
  useGetUserProductGrantsQuery: () => { mocks.grants(); throw new Error("Partner mounted product grant hooks"); },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { role: "PARTNER_ADMIN", status: "ACTIVE", platformAdmin: false, organizationId: "" };
  mocks.onboard.mockReturnValue({ unwrap: async () => customer });
  mocks.ceiling.mockReturnValue({ unwrap: async () => ({ featureKeys: ["inventory"], approved: true, version: 8 }) });
  mocks.domain.mockReturnValue({ unwrap: async () => ({ featureKeys: [], version: 4 }) });
});

describe("explicit onboarding and platform-only module policies", () => {
  it("shows pending customer metadata without factory APIs or platform access hooks", () => {
    render(<ProductCustomers scope={{ partnerId, platform: false }} productId={productId} canOnboard={false} />);
    expect(screen.getByText(/Invitation delivery is not enabled/)).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Onboard factory" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View Pending Factory" }));
    expect(screen.getByRole("region", { name: "Customer details" })).toHaveTextContent("No payment has been collected");
    expect(mocks.grants).not.toHaveBeenCalled();
  });

  it("submits explicit owner invitation details and leaves approval/subscription pending", async () => {
    render(<ProductCustomers scope={{ partnerId, platform: false }} productId={productId} canOnboard />);
    fireEvent.change(screen.getByRole("textbox", { name: "Factory name" }), { target: { value: "Pending Factory" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Owner name" }), { target: { value: "Invited Owner" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Owner email" }), { target: { value: "owner@example.test" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I am authorized/ }));
    fireEvent.submit(screen.getByRole("form", { name: "Onboard factory" }));
    await waitFor(() => expect(mocks.onboard).toHaveBeenCalledTimes(1));
    expect(mocks.onboard).toHaveBeenCalledWith({
      partnerId, platform: false, productId,
      body: { idempotencyKey: expect.any(String), factoryName: "Pending Factory", ownerName: "Invited Owner", ownerEmail: "owner@example.test" },
    });
    expect(await screen.findByText(/Pending Factory was recorded/)).toHaveTextContent("PENDING_APPROVAL");
    expect(screen.queryByText(/payment successful|subscription activated/i)).not.toBeInTheDocument();
  });

  it("retries an uncertain onboarding response with the exact same idempotency key/body", async () => {
    mocks.onboard.mockReturnValue({ unwrap: async () => { throw { status: "FETCH_ERROR", error: "Connection lost" }; } });
    render(<ProductCustomers scope={{ partnerId, platform: false }} productId={productId} canOnboard />);
    fireEvent.change(screen.getByRole("textbox", { name: "Factory name" }), { target: { value: "Pending Factory" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Owner name" }), { target: { value: "Invited Owner" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Owner email" }), { target: { value: "owner@example.test" } });
    fireEvent.submit(screen.getByRole("form", { name: "Onboard factory" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry same onboarding request" }));
    await waitFor(() => expect(mocks.onboard).toHaveBeenCalledTimes(2));
    expect(mocks.onboard.mock.calls[0][0]).toEqual(mocks.onboard.mock.calls[1][0]);
    expect(screen.getByRole("textbox", { name: "Factory name" })).toBeDisabled();
  });

  it("never mounts platform ceiling queries for a partner", () => {
    render(<PartnerModulePolicy partnerId={partnerId} />);
    expect(mocks.policy).not.toHaveBeenCalled();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("saves independent partner approval with a reviewed version, not product or tenant flags", async () => {
    mocks.user = { role: "SAAS_OWNER", status: "ACTIVE", platformAdmin: true, organizationId: "" };
    render(<PartnerModulePolicy partnerId={partnerId} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Approve this partner to resell only the selected modules" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save partner resale policy" }));
    await waitFor(() => expect(mocks.ceiling).toHaveBeenCalledWith({
      partnerId, body: { featureKeys: ["inventory"], approved: true, expectedVersion: 7 },
    }));
  });

  it("distinguishes inherit-null from explicit empty-domain-deny-all", async () => {
    mocks.user = { role: "SAAS_OWNER", status: "ACTIVE", platformAdmin: true, organizationId: "" };
    render(<DomainModulePolicy partnerId={partnerId} productId={productId} domainId={domain.id} productFeatures={["inventory", "payroll"]} readOnly={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Save domain module restriction" }));
    await waitFor(() => expect(mocks.domain).toHaveBeenCalledWith({
      partnerId, productId, domainId: domain.id, body: { featureKeys: null, expectedVersion: 3 },
    }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Inherit the product module bundle" }));
    fireEvent.click(screen.getByRole("button", { name: "Save domain module restriction" }));
    await waitFor(() => expect(mocks.domain).toHaveBeenLastCalledWith({
      partnerId, productId, domainId: domain.id, body: { featureKeys: [], expectedVersion: 3 },
    }));
  });
});
