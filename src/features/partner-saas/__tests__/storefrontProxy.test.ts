import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyStorefront } from "../storefrontProxy";
import { GET } from "@/app/api/public/v2/storefront/route";
import { storefront } from "./fixtures";

const config = { enabled: true, backendOrigin: "https://backend.example.test", edgeToken: "test-only-edge-key-not-a-real-secret-123456" };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("public storefront trust boundary", () => {
  it("does no network work with rollout disabled or malformed authority", async () => {
    vi.stubGlobal("fetch", vi.fn());
    expect((await proxyStorefront("brand.example.test", { ...config, enabled: false })).status).toBe(503);
    expect((await proxyStorefront("good.test,evil.test", config)).status).toBe(421);
    expect((await proxyStorefront("brand.example.test:444", config)).status).toBe(421);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not fall back if proxy configuration is absent or unsafe", async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const backendOrigin of [undefined, "http://backend.test", "https://user:pass@backend.test", "https://backend.test/redirect"]) {
      expect((await proxyStorefront("brand.test", { ...config, backendOrigin })).status).toBe(503);
    }
    expect(fetch).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("forwards only incoming Host and server trust, ignoring client spoofing/auth/query", async () => {
    vi.stubEnv("PARTNER_SAAS_STOREFRONT_ENABLED", "true");
    vi.stubEnv("PARTNER_SAAS_BACKEND_ORIGIN", config.backendOrigin);
    vi.stubEnv("PARTNER_SAAS_EDGE_TOKEN", config.edgeToken);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", {
      headers: { "Set-Cookie": "not-allowed=value", "Cache-Control": "public,max-age=999" },
    })));
    const result = await GET(new Request("https://brand.example.test/api/public/v2/storefront?domain=evil.test", {
      headers: {
        host: "brand.example.test",
        "x-factory1-storefront-host": "evil.test",
        "x-factory1-edge-token": "browser-key",
        "x-forwarded-host": "evil.test",
        Authorization: "Bearer browser-test-token",
        Cookie: "browser=test",
      },
    }));
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(options?.headers).toEqual({
      "X-Factory1-Storefront-Host": "brand.example.test",
      "X-Factory1-Edge-Token": config.edgeToken,
      Accept: "application/json",
    });
    expect(options?.credentials).toBe("omit");
    expect(options?.redirect).toBe("error");
    expect(result.headers.get("set-cookie")).toBeNull();
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it.each([404, 421, 503])("preserves explicit unavailable state %s without default branding", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, code: "STOREFRONT_UNAVAILABLE", data: null }), { status })));
    const result = await proxyStorefront("brand.test", config);
    expect(result.status).toBe(status);
    expect(await result.json()).toMatchObject({ success: false, data: null });
  });

  it("never returns an upstream echoed trust secret or debug fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false, code: "STOREFRONT_UNAVAILABLE", message: config.edgeToken, debug: config.edgeToken,
    }), { status: 404 })));
    const result = await proxyStorefront("hr.example.test", config);
    expect(await result.text()).not.toContain(config.edgeToken);
  });

  it("strips extra data on success and checks canonical host, assets and runtime capabilities", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      success: true, edgeToken: config.edgeToken, data: { ...storefront, debug: config.edgeToken },
    })))));
    const response = await proxyStorefront("hr.example.test", config);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.text()).not.toContain(config.edgeToken);
    const mismatch = await proxyStorefront("different.example.test", config);
    expect(mismatch.status).toBe(502);
  });

  it("refuses a trust secret echoed inside even otherwise valid public fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true, data: { ...storefront, storefront: { ...storefront.storefront, displayName: config.edgeToken } },
    }))));
    const response = await proxyStorefront("hr.example.test", config);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(config.edgeToken);
  });

  it("does not follow redirects or log the edge token on transport failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(`provider response ${config.edgeToken}`)));
    const response = await proxyStorefront("hr.example.test", config);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(config.edgeToken);
    expect(JSON.stringify(log.mock.calls)).not.toContain(config.edgeToken);
    expect(vi.mocked(fetch).mock.calls[0][1]?.redirect).toBe("error");
    log.mockRestore();
  });
});
