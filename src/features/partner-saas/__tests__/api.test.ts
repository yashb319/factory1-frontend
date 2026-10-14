import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStore } from "@/lib/store";
import { setCredentials } from "@/features/auth/authSlice";
import { partnerSaasApi } from "../api";
import { product, partnerId, productId, userId, domain } from "./fixtures";

vi.hoisted(() => { process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test"; });
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

function storeForPartner() {
  const store = createAppStore();
  store.dispatch(setCredentials({ token: "test-only-token", user: {
    id: userId, email: "partner@example.test", name: "Partner", role: "PARTNER_ADMIN",
    status: "ACTIVE", organizationId: "", organizationStatus: "ACTIVE",
  } }));
  return store;
}
function respond(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { headers: { "Content-Type": "application/json" } });
}

describe("foundation API contract boundaries", () => {
  it("uses scoped paginated product URLs and keys rather than void cross-partner caches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(respond({ items: [product], offset: 20, limit: 20, total: 21 }))));
    const store = storeForPartner();
    const args = { partnerId, platform: false, offset: 20, limit: 20 };
    const request = store.dispatch(partnerSaasApi.endpoints.getSaasProducts.initiate(args));
    expect((await request.unwrap()).items[0].displayName).toBe("Acme HR");
    const sent = vi.mocked(fetch).mock.calls[0][0] as Request;
    const url = new URL(sent.url);
    expect(url.pathname).toBe("/api/partner/v2/products");
    expect(url.searchParams.get("partnerId")).toBe(partnerId);
    expect(url.searchParams.get("offset")).toBe("20");
    expect(partnerSaasApi.endpoints.getSaasProducts.select({ ...args, partnerId: userId })(store.getState()).data).toBeUndefined();
    request.unsubscribe();
    store.dispatch(partnerSaasApi.util.resetApiState());
  });

  it("issues versioned domain suspension only, with no verified/ready/tenant fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(respond({ ...domain, status: "SUSPENDED" }))));
    const store = storeForPartner();
    const command = store.dispatch(partnerSaasApi.endpoints.updateProductDomain.initiate({
      platform: false, partnerId, productId, domainId: domain.id, expectedVersion: domain.version, status: "SUSPENDED",
    }));
    await command.unwrap();
    const sent = vi.mocked(fetch).mock.calls[0][0] as Request;
    expect(sent.method).toBe("PATCH");
    expect(new URL(sent.url).pathname).toBe(`/api/partner/v2/products/${productId}/domains/${domain.id}`);
    expect(await sent.json()).toEqual({ status: "SUSPENDED", expectedVersion: 2 });
    store.dispatch(partnerSaasApi.util.resetApiState());
  });

  it("fails explicitly on malformed foundation payloads instead of manufacturing empty success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(respond({ items: [{ organizationId: "factory", payroll: [] }] }))));
    const store = storeForPartner();
    const request = store.dispatch(partnerSaasApi.endpoints.getSaasProducts.initiate({ partnerId, platform: false, offset: 0, limit: 20 }));
    await expect(request.unwrap()).rejects.toMatchObject({ status: "CUSTOM_ERROR" });
    request.unsubscribe();
    store.dispatch(partnerSaasApi.util.resetApiState());
    vi.restoreAllMocks();
  });
});
