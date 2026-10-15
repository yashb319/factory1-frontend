import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bffEnvelopeSchema,
  contextSelectionSchema,
  partnerEntitlementsSchema,
  partnerSessionSchema,
  upstreamContextOptionsSchema,
  type PartnerEntitlements,
} from "../auth/contracts";
import { changeAuthContext, getAuthSession } from "../auth/server";
import contextOptions from "./fixtures/context-options.json";
import contextSelection from "./fixtures/context-selection.json";
import entitlements from "./fixtures/entitlements.json";
import sessionAfter from "./fixtures/session-after-selection.json";
import sessionBefore from "./fixtures/session-before-selection.json";

// Byte-identical copies of factory1-backend src/test/resources/partner-sso at test-only #137
// (641d07f, merged cbda4a9): actual HTTP serialization of application source 760c43a.
type Issues = { path: PropertyKey[]; code: string }[];

function issuePaths(issues: Issues) {
  return issues.map(({ path, code }) => ({ path: path.join("."), code }));
}

function accepted<T>(result: { success: true; data: T } | { success: false; error: { issues: Issues } }, label: string): T {
  if (!result.success) console.log(`Authenticated ${label} schema issues:`, JSON.stringify(issuePaths(result.error.issues)));
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(`Serialized ${label} was rejected`);
  return result.data;
}

function expectNoRuntimeCapability(parsed: PartnerEntitlements) {
  expect(parsed.operationalAccess).toBe(false);
  expect(parsed.ready).toBe(false);
  expect(parsed.runtimeRoutes).toEqual([]);
  expect(parsed.moduleDecisions.every((decision) => !decision.enabled)).toBe(true);
}

describe("actual serialized authenticated BFF DTOs", () => {
  it("contain no credentials, cookies, CSRF tokens or functional session handles", () => {
    for (const body of [sessionBefore, sessionAfter, entitlements, contextSelection, contextOptions]) {
      const text = JSON.stringify(body);
      expect(text).not.toMatch(/csrf|cookie|token|password|secret|otp|"code"|"state"|"nonce"/i);
    }
    expect(contextSelection.data.sessionHandle).toBe("PUBLIC-TEST-PLACEHOLDER-NOT-A-SESSION-HANDLE");
  });

  it("accepts the session before context selection without principal or operational access", () => {
    const session = accepted(bffEnvelopeSchema(partnerSessionSchema).safeParse(sessionBefore), "session-before-selection").data;
    expect(session).toEqual(sessionBefore.data);
    expect(session.operationalAccess).toBe(false);
  });

  it("accepts the session after context selection while keeping operational access false", () => {
    const session = accepted(bffEnvelopeSchema(partnerSessionSchema).safeParse(sessionAfter), "session-after-selection").data;
    expect(session).toEqual(sessionAfter.data);
    expect(session.operationalAccess).toBe(false);
    expect(session.principal?.platformAdmin).toBe(false);
    expect(session.principal?.organizationId).toBe(session.context?.organizationId);
  });

  it("accepts actual entitlements without granting runtime capability", () => {
    const parsed = accepted(bffEnvelopeSchema(partnerEntitlementsSchema).safeParse(entitlements), "entitlements").data;
    expect(parsed).toEqual(entitlements.data);
    expectNoRuntimeCapability(parsed);
  });

  it("accepts actual context selection entitlements without granting runtime capability", () => {
    const parsed = accepted(bffEnvelopeSchema(contextSelectionSchema).safeParse(contextSelection), "context-selection").data;
    expect(parsed.entitlements).toEqual(contextSelection.data.entitlements);
    expectNoRuntimeCapability(parsed.entitlements);
  });

  it("accepts the actual context-options list serialization upstream", () => {
    const options = accepted(bffEnvelopeSchema(upstreamContextOptionsSchema).safeParse(contextOptions), "context-options").data;
    expect(options).toEqual(contextOptions.data);
  });
});

// Drives both production BFF consumers of context options (session bootstrap and /auth/context)
// with the exact backend response bytes. Only the storefront and secrets are test-constructed.
describe("BFF consumers of actual serialized authenticated DTOs", () => {
  const raw = (name: string) => readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8");
  const json = (body: string) => new Response(body, { headers: { "Content-Type": "application/json" } });
  const host = sessionAfter.data.context.hostname;
  const handle = "A".repeat(43);
  const csrfSecret = Buffer.alloc(32, 29).toString("base64url");
  const storefront = {
    success: true,
    message: "OK",
    data: {
      schemaVersion: 2,
      storefront: {
        partnerId: "70000000-0000-4000-8000-000000000013", productId: sessionAfter.data.context.productId,
        canonicalOrigin: `https://${host}`, displayName: "Product A",
        logoUrl: null, faviconUrl: null, primaryColorHex: null, accentColorHex: null,
      },
      capabilities: { operationalAccess: false, sso: true, checkout: false },
    },
  };

  function backend(sessionBody: string) {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname === "/api/public/v2/storefront") return json(JSON.stringify(storefront));
      if (url.pathname === "/api/partner/v2/bff/session") return json(sessionBody);
      if (url.pathname === "/api/partner/v2/bff/session/context/options") return json(raw("context-options"));
      if (url.pathname === "/api/partner/v2/bff/session/entitlements") return json(raw("entitlements"));
      if (url.pathname === "/api/partner/v2/bff/session/context") return json(raw("context-selection"));
      throw new Error(`Unexpected upstream path: ${url.pathname}`);
    });
  }

  function browserRequest(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Host", host);
    headers.set("Cookie", `__Host-factory1_session=${handle}`);
    return new Request(`https://${host}${path}`, { ...init, headers });
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T11:55:00Z"));
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PARTNER_SAAS_STOREFRONT_ENABLED", "true");
    vi.stubEnv("PARTNER_SAAS_BACKEND_ORIGIN", "https://backend.example.test");
    vi.stubEnv("PARTNER_SAAS_EDGE_TOKEN", "test-only-edge-key-not-a-real-secret-123456");
    vi.stubEnv("PARTNER_SAAS_ASSET_HOSTS", "");
    vi.stubEnv("PARTNER_SAAS_OAUTH_CLIENT_ID", "partner-bff");
    vi.stubEnv("PARTNER_SAAS_OAUTH_CLIENT_SECRET", "test-only-client-secret");
    vi.stubEnv("PARTNER_SAAS_CSRF_SECRET", csrfSecret);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    ["session-before-selection", sessionBefore, null],
    ["session-after-selection", sessionAfter, entitlements.data],
  ] as const)("session bootstrap accepts actual %s with exact context options", async (name, sessionBody, expectedEntitlements) => {
    const errors = vi.spyOn(console, "error");
    vi.stubGlobal("fetch", backend(raw(name)));

    const response = await getAuthSession(browserRequest("/auth/session"));
    const body = await response.json();

    expect(errors).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(body.data.contextOptions).toEqual({ items: contextOptions.data });
    expect(body.data.session.context).toEqual(sessionBody.data.context);
    expect(body.data.session.operationalAccess).toBe(false);
    expect(body.data.entitlements).toEqual(expectedEntitlements);
    expect(body.data.entitlements?.operationalAccess ?? false).toBe(false);
    expect(JSON.stringify(body)).not.toContain(handle);
  });

  it("/auth/context accepts the exact context options and actual selection without operational access", async () => {
    const errors = vi.spyOn(console, "error");
    const upstream = backend(raw("session-after-selection"));
    vi.stubGlobal("fetch", upstream);
    const csrf = createHmac("sha256", Buffer.from(csrfSecret, "base64url"))
      .update(`https://${host}\n${handle}`).digest("base64url");

    const response = await changeAuthContext(browserRequest("/auth/context", {
      method: "POST",
      headers: {
        Origin: `https://${host}`,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
      body: JSON.stringify({ organizationId: contextSelection.data.context.organizationId }),
    }));
    const body = await response.json();

    expect(errors).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(upstream.mock.calls.map(([input]) => new URL(input.toString()).pathname))
      .toContain("/api/partner/v2/bff/session/context/options");
    expect(body.data.context).toEqual(contextSelection.data.context);
    expect(body.data.entitlements).toEqual(contextSelection.data.entitlements);
    expect(body.data.operationalAccess).toBe(false);
    expect(JSON.stringify(body)).not.toContain(contextSelection.data.sessionHandle);
    expect(JSON.stringify(body)).not.toContain(handle);
  });
});
