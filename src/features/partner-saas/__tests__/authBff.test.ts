import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeAuthContext,
  finishAuth,
  getAuthSession,
  logoutAuth,
  startAuth,
} from "../auth/server";
import { storefront } from "./fixtures";

const backendOrigin = "https://backend.example.test";
const host = "hr.example.test";
const handle = "A".repeat(43);
const nextHandle = "B".repeat(43);
const csrfSecret = Buffer.alloc(32, 29).toString("base64url");
const clientId = "partner-bff";
const clientSecret = "server-only:secret/with+reserved";
const edgeToken = "test-only-edge-key-not-a-real-secret-123456";
const productId = "22222222-2222-4222-8222-222222222222";
const domainId = "44444444-4444-4444-8444-444444444444";
const organizationId = "55555555-5555-4555-8555-555555555555";
const otherOrganizationId = "66666666-6666-4666-8666-666666666666";
const state = Buffer.alloc(32, 11).toString("base64url");
const nonce = Buffer.alloc(32, 12).toString("base64url");
const codeChallenge = Buffer.alloc(32, 13).toString("base64url");
const sessionExpiry = () => new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const brandedStorefront = {
  ...storefront,
  capabilities: { operationalAccess: false, sso: true, checkout: false },
};

function envelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, message: "OK", data }), {
    headers: { "Content-Type": "application/json" },
  });
}

function backendFailure(status: number, code: string) {
  return new Response(JSON.stringify({
    success: false, message: "Backend detail must not reach the browser", data: null, code, requestId: "test-request",
  }), { status, headers: { "Content-Type": "application/json" } });
}

function authorizationUrl(redirectUri = `https://${host}/auth/callback`) {
  const url = new URL("/oauth2/authorize", backendOrigin);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

function trustedStorefrontResponse() {
  return envelope(brandedStorefront);
}

function apiContext(id = organizationId, label = "Factory One") {
  return {
    organizationId: id,
    organizationName: label,
    productId,
    productName: "Acme HR",
    domainId,
    hostname: host,
  };
}

function option(id = organizationId, label = "Factory One") {
  return {
    organizationId: id,
    label,
    productId,
    productName: "Acme HR",
    domainId,
    hostname: host,
  };
}

function session(context: ReturnType<typeof apiContext> | null) {
  return {
    authenticated: true,
    expiresAt: sessionExpiry(),
    context,
    operationalAccess: false,
  };
}

function entitlements(id = organizationId, modules: string[] = ["inventory"]) {
  return { productId, organizationId: id, modules, ready: false, operationalAccess: false };
}

function installRuntime() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("PARTNER_SAAS_STOREFRONT_ENABLED", "true");
  vi.stubEnv("PARTNER_SAAS_BACKEND_ORIGIN", backendOrigin);
  vi.stubEnv("PARTNER_SAAS_EDGE_TOKEN", edgeToken);
  vi.stubEnv("PARTNER_SAAS_ASSET_HOSTS", "");
  vi.stubEnv("PARTNER_SAAS_OAUTH_CLIENT_ID", clientId);
  vi.stubEnv("PARTNER_SAAS_OAUTH_CLIENT_SECRET", clientSecret);
  vi.stubEnv("PARTNER_SAAS_CSRF_SECRET", csrfSecret);
}

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Host", host);
  return new Request(`https://${host}${path}`, {
    ...init,
    headers,
  });
}

function requestWithSession(path: string, init: RequestInit = {}, sessionHandle = handle) {
  const headers = new Headers(init.headers);
  headers.set("Host", host);
  headers.set("Cookie", `__Host-factory1_session=${sessionHandle}`);
  return request(path, { ...init, headers });
}

function testCsrf(tokenHandle = handle, tokenHost = `https://${host}`) {
  return createHmac("sha256", Buffer.from(csrfSecret, "base64url"))
    .update(`${tokenHost}\n${tokenHandle}`)
    .digest("base64url");
}

function createFetchMock(implementation: (input: RequestInfo | URL) => Promise<Response>) {
  return vi.fn<FetchMock>((input) => implementation(input));
}

beforeEach(() => installRuntime());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("partner BFF OAuth and host-bound sessions", () => {
  it("fails closed when runtime credentials are absent and never contacts the backend", async () => {
    vi.stubEnv("PARTNER_SAAS_OAUTH_CLIENT_SECRET", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await startAuth(request("/auth/start"));

    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts OAuth only for a verified storefront, ignoring browser redirect and forwarded-host inputs", async () => {
    const fetchMock = createFetchMock(async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname === "/api/public/v2/storefront") return trustedStorefrontResponse();
      if (url.pathname === "/api/partner/v2/bff/oauth/transactions") {
        return envelope({
          authorizationUrl: authorizationUrl(),
          expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        });
      }
      throw new Error(`Unexpected upstream path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await startAuth(request("/auth/start?redirect_uri=https%3A%2F%2Fevil.test%2F&productId=forged", {
      headers: { "X-Forwarded-Host": "evil.test", Cookie: "legacy=must-not-forward" },
    }));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(authorizationUrl());
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const stateCookie = response.headers.get("set-cookie") ?? "";
    expect(stateCookie).toContain(`__Host-factory1_oauth_state=${state}`);
    expect(stateCookie).toContain("HttpOnly");
    expect(stateCookie).toContain("Secure");
    expect(stateCookie).toContain("SameSite=Lax");
    expect(stateCookie).not.toMatch(/;\s*Domain=/i);
    const calls = fetchMock.mock.calls;
    expect(calls).toHaveLength(2);
    const storefrontHeaders = new Headers(calls[0][1]?.headers);
    expect(storefrontHeaders.get("X-Factory1-Storefront-Host")).toBe(host);
    expect(storefrontHeaders.get("Cookie")).toBeNull();
    const transactionHeaders = new Headers(calls[1][1]?.headers);
    expect(transactionHeaders.get("Authorization")).toBe(
      `Basic ${Buffer.from(`${new URLSearchParams([["value", clientId]]).toString().slice(6)}:${new URLSearchParams([["value", clientSecret]]).toString().slice(6)}`).toString("base64")}`,
    );
    expect(transactionHeaders.get("Cookie")).toBeNull();
    expect(transactionHeaders.get("Host")).toBeNull();
    expect(transactionHeaders.get("Origin")).toBeNull();
    expect(transactionHeaders.get("X-Forwarded-Host")).toBeNull();
    expect(JSON.parse(String(calls[1][1]?.body))).toEqual({
      redirectUri: `https://${host}/auth/callback`,
    });
    expect(calls[1][1]?.redirect).toBe("error");
    expect(calls[1][1]?.credentials).toBe("omit");
    expect(calls[1][1]?.cache).toBe("no-store");
  });

  it("rejects an authorization URL outside the configured issuer without redirecting to it", async () => {
    const fetchMock = createFetchMock(async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      return url.pathname === "/api/public/v2/storefront"
        ? trustedStorefrontResponse()
        : envelope({
          authorizationUrl: "https://attacker.example.test/oauth2/authorize?code=stolen",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await startAuth(request("/auth/start"));

    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.text()).not.toContain("attacker.example.test");
  });

  it("exchanges callback code server-side and issues only an opaque Secure host-only cookie", async () => {
    const newHandle = "C".repeat(43);
    const fetchMock = createFetchMock(async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname === "/api/public/v2/storefront") return trustedStorefrontResponse();
      if (url.pathname === "/api/partner/v2/bff/oauth/exchange") {
        return envelope({ sessionHandle: newHandle, expiresAt: sessionExpiry() });
      }
      throw new Error(`Unexpected upstream path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await finishAuth(request(`/auth/callback?code=short-lived-code&state=${state}`, {
      headers: { Cookie: `__Host-factory1_oauth_state=${state}` },
    }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://${host}/`);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`__Host-factory1_session=${newHandle}`);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toMatch(/;\s*Domain=/i);
    expect(cookie).not.toContain("access_token");
    expect(response.headers.get("set-cookie")).toContain("__Host-factory1_oauth_state=;");
    const exchangeCall = fetchMock.mock.calls.find(([input]) =>
      new URL(input instanceof Request ? input.url : input.toString()).pathname.endsWith("/bff/oauth/exchange"));
    expect(exchangeCall).toBeDefined();
    expect(JSON.parse(String(exchangeCall?.[1]?.body))).toEqual({ code: "short-lived-code", state });
    const exchangeHeaders = new Headers(exchangeCall?.[1]?.headers);
    expect(exchangeHeaders.get("Cookie")).toBeNull();
    expect(exchangeHeaders.get("Host")).toBeNull();
    expect(exchangeHeaders.get("Origin")).toBeNull();
    expect(await response.text()).toBe("");
  });

  it("consumes provider cancellation without exchanging or reflecting callback secrets", async () => {
    const fetchMock = createFetchMock(async () => trustedStorefrontResponse());
    vi.stubGlobal("fetch", fetchMock);

    const response = await finishAuth(request(`/auth/callback?error=access_denied&state=${state}`, {
      headers: { Cookie: `__Host-factory1_oauth_state=${state}` },
    }));
    const target = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(303);
    expect(target.origin).toBe(`https://${host}`);
    expect(target.pathname).toBe("/");
    expect(target.searchParams.get("authError")).toBe("cancelled");
    expect(target.searchParams.has("state")).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("__Host-factory1_oauth_state=;");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects callback state not bound to this browser and never redirects an untrusted host", async () => {
    const fetchMock = createFetchMock(async () => trustedStorefrontResponse());
    vi.stubGlobal("fetch", fetchMock);
    const mismatch = await finishAuth(request(`/auth/callback?code=short-lived-code&state=${state}`, {
      headers: { Cookie: `__Host-factory1_oauth_state=${nonce}` },
    }));
    expect(mismatch.headers.get("location")).toBe(`https://${host}/?authError=invalid`);
    expect(mismatch.headers.get("set-cookie")).toContain("__Host-factory1_oauth_state=;");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const spoofed = new Request(`https://${host}/auth/callback?code=short-lived-code&state=${state}`, {
      headers: { Host: "attacker.example.test", Cookie: `__Host-factory1_oauth_state=${state}` },
    });
    const rejected = await finishAuth(spoofed);
    expect(rejected.status).toBe(421);
    expect(rejected.headers.get("location")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a no-store session bootstrap with multiple server-authorized factories and no handles or tokens", async () => {
    const firstContext = apiContext();
    const fetchMock = createFetchMock(async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname === "/api/public/v2/storefront") return trustedStorefrontResponse();
      if (url.pathname.endsWith("/bff/session/context/options")) {
        return envelope({ items: [option(), option(otherOrganizationId, "Factory Two")] });
      }
      if (url.pathname.endsWith("/bff/session/entitlements")) return envelope(entitlements());
      if (url.pathname.endsWith("/bff/session")) return envelope(session(firstContext));
      throw new Error(`Unexpected upstream path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await getAuthSession(requestWithSession("/auth/session"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(payload.data.contextOptions.items).toHaveLength(2);
    expect(payload.data.session.context.organizationId).toBe(firstContext.organizationId);
    expect(payload.data.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(payload)).not.toContain(handle);
    expect(JSON.stringify(payload)).not.toContain("access_token");
    expect(JSON.stringify(payload)).not.toContain("domainSessionToken");
    const backchannelCalls = fetchMock.mock.calls.filter(([input]) =>
      new URL(input instanceof Request ? input.url : input.toString()).pathname.includes("/bff/session"));
    expect(backchannelCalls).toHaveLength(3);
    for (const [, init] of backchannelCalls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("X-Factory1-BFF-Session")).toBe(handle);
      expect(headers.get("Cookie")).toBeNull();
      expect(headers.get("Host")).toBeNull();
      expect(headers.get("Origin")).toBeNull();
      expect(headers.get("Authorization")).toMatch(/^Basic /);
    }
  });

  it("requires same-origin CSRF before changing context and sends only the selected organization", async () => {
    const requestedContext = apiContext(otherOrganizationId, "Factory Two");
    const fetchMock = createFetchMock(async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname === "/api/public/v2/storefront") return trustedStorefrontResponse();
      if (url.pathname.endsWith("/bff/session/context/options")) {
        return envelope({ items: [option(), option(otherOrganizationId, "Factory Two")] });
      }
      if (url.pathname.endsWith("/bff/session/context")) {
        return envelope({
          sessionHandle: nextHandle,
          expiresAt: sessionExpiry(),
          context: requestedContext,
          entitlements: entitlements(otherOrganizationId, ["payroll"]),
        });
      }
      throw new Error(`Unexpected upstream path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const headers = new Headers({
      Origin: `https://${host}`,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
      "X-CSRF-Token": testCsrf(),
      "X-Forwarded-Host": "evil.example.test",
    });

    const response = await changeAuthContext(requestWithSession("/auth/context", {
      method: "POST",
      headers,
      body: JSON.stringify({ organizationId: otherOrganizationId }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(`__Host-factory1_session=${nextHandle}`);
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(JSON.stringify(payload)).not.toContain(nextHandle);
    expect(JSON.stringify(payload)).not.toContain("domainSessionToken");
    const contextCall = fetchMock.mock.calls.find(([input]) =>
      new URL(input instanceof Request ? input.url : input.toString()).pathname.endsWith("/bff/session/context"));
    expect(JSON.parse(String(contextCall?.[1]?.body))).toEqual({ organizationId: otherOrganizationId });
    expect(new Headers(contextCall?.[1]?.headers).get("X-Forwarded-Host")).toBeNull();
  });

  it("blocks cross-origin context changes before any backend call or cookie mutation", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await changeAuthContext(requestWithSession("/auth/context", {
      method: "POST",
      headers: {
        Origin: "https://evil.example.test",
        "Content-Type": "application/json",
        "X-CSRF-Token": testCsrf(),
      },
      body: JSON.stringify({ organizationId }),
    }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not allow an unlisted factory even if a browser submits its identifier", async () => {
    const fetchMock = createFetchMock(async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      return url.pathname === "/api/public/v2/storefront"
        ? trustedStorefrontResponse()
        : envelope({ items: [option()] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await changeAuthContext(requestWithSession("/auth/context", {
      method: "POST",
      headers: {
        Origin: `https://${host}`,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
        "X-CSRF-Token": testCsrf(),
      },
      body: JSON.stringify({ organizationId: otherOrganizationId }),
    }));

    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1][0] instanceof Request ? fetchMock.mock.calls[1][0].url : fetchMock.mock.calls[1][0].toString()).pathname)
      .toContain("/context/options");
  });

  it("requires CSRF for both local and family logout, then clears the opaque cookie", async () => {
    const fetchMock = createFetchMock(async () => envelope({ revoked: true, scope: "all" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await logoutAuth(requestWithSession("/auth/logout", {
      method: "POST",
      headers: {
        Origin: `https://${host}`,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
        "X-CSRF-Token": testCsrf(),
      },
      body: JSON.stringify({ scope: "all" }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("__Host-factory1_session=;");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    const call = fetchMock.mock.calls[0];
    expect(new URL(call[0] instanceof Request ? call[0].url : call[0].toString()).pathname)
      .toBe("/api/partner/v2/bff/session/logout");
    expect(JSON.parse(String(call[1]?.body))).toEqual({ scope: "all" });
  });

  it("does not clear sessions or call backend when logout CSRF is invalid", async () => {
    const fetchMock = createFetchMock(async () => envelope({}));
    vi.stubGlobal("fetch", fetchMock);
    const response = await logoutAuth(requestWithSession("/auth/logout", {
      method: "POST",
      headers: {
        Origin: `https://${host}`,
        "Content-Type": "application/json",
        "X-CSRF-Token": "invalid",
      },
      body: JSON.stringify({ scope: "domain" }),
    }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the browser cookie but reports when family revocation cannot be confirmed", async () => {
    const fetchMock = createFetchMock(async () => backendFailure(503, "BACKEND_UNAVAILABLE"));
    vi.stubGlobal("fetch", fetchMock);
    const response = await logoutAuth(requestWithSession("/auth/logout", {
      method: "POST",
      headers: {
        Origin: `https://${host}`,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
        "X-CSRF-Token": testCsrf(),
      },
      body: JSON.stringify({ scope: "all" }),
    }));

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await response.text()).not.toContain("Backend detail");
  });
});
