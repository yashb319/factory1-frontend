import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import {
  authBootstrapSchema,
  bffEnvelopeSchema,
  contextSelectionSchema,
  logoutResultSchema,
  oauthExchangeSchema,
  oauthTransactionSchema,
  partnerContextOptionsSchema,
  partnerEntitlementsSchema,
  partnerSessionSchema,
  type PartnerContext,
  type PartnerContextOptions,
  type PartnerEntitlements,
} from "./contracts";
import { isPartnerAuthRuntimeReady, partnerAuthRuntimeConfig } from "./runtime";
import { canonicalHost } from "../host";
import { envelopeSchema, storefrontSchema } from "../contracts";
import { proxyStorefront } from "../storefrontProxy";
import { z } from "zod";
import { hasOperationalAccess } from "../runtime/access";
import { reviewedRuntimeRoute, runtimeQueryAllowed, runtimeRouteAllowed } from "../runtime/policy";
import { invitationResultSchema } from "../onboarding/contracts";
import { passwordSchema } from "@/lib/passwordPolicy";

const cookieName = "__Host-factory1_session";
const oauthStateCookieName = "__Host-factory1_oauth_state";
const absoluteSessionSeconds = 8 * 60 * 60;
const oauthStateSeconds = 10 * 60;
const bodyLimitBytes = 2048;

type RuntimeConfig = {
  backendOrigin: string;
  clientId: string;
  clientSecret: string;
  csrfSecret: string;
};

export class BffError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "BffError";
  }
}

function runtimeConfig(): RuntimeConfig {
  const raw = partnerAuthRuntimeConfig();
  if (!isPartnerAuthRuntimeReady(raw)) throw new BffError(503, "SSO_DISABLED");
  if (!raw.backendOrigin || !raw.clientId || !raw.clientSecret || !raw.csrfSecret) {
    throw new BffError(503, "SSO_DISABLED");
  }
  return {
    backendOrigin: new URL(raw.backendOrigin).origin,
    clientId: raw.clientId.trim(),
    clientSecret: raw.clientSecret,
    csrfSecret: raw.csrfSecret,
  };
}

function noStoreHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store, private");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Vary", "Cookie, Origin");
  return headers;
}

export function bffJson(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return Response.json({ success: true, message: "OK", data }, {
    status,
    headers: noStoreHeaders(extraHeaders),
  });
}

function failure(status: number, code: string, extraHeaders?: HeadersInit) {
  const messages: Record<string, string> = {
    SSO_DISABLED: "Partner sign-in is not enabled for this address.",
    AUTH_REQUIRED: "Your sign-in has expired or was revoked. Sign in again.",
    INVALID_CONTEXT: "This factory is no longer available for this product.",
    ENTITLEMENTS_NOT_READY: "Factory workspace access is not ready.",
    CSRF_INVALID: "This request could not be verified. Reload and try again.",
    INVALID_REQUEST: "This sign-in request could not be completed.",
    STOREFRONT_UNAVAILABLE: "This product address is unavailable.",
    AUTH_UNAVAILABLE: "Sign-in is temporarily unavailable. Try again.",
    AUTH_FAILED: "Sign-in could not be verified. Start again.",
    LOGOUT_UNCONFIRMED: "Local sign-out completed, but server revocation could not be confirmed.",
    RUNTIME_ROUTE_DENIED: "This operation is not available for your selected product and role.",
    CONTEXT_CHANGED: "Your factory context changed. Reload before continuing.",
    CONTEXT_REQUIRED: "Select a factory before continuing.",
    CONTEXT_GENERATION_MISMATCH: "Your factory context changed. Reload before continuing.",
    DOMAIN_CONTEXT_MISMATCH: "This address does not match your current factory context.",
    INVITATION_INVALID: "This invitation is invalid, expired, revoked or belongs to another product.",
    INVITATION_IDENTITY_MISMATCH: "Sign in with the explicitly invited account before accepting.",
    ONBOARDING_DISABLED: "Factory onboarding is not enabled for this product.",
    OWNER_IDENTITY_EXISTS: "An account with this email already exists. Select the existing owner instead.",
    IDEMPOTENCY_CONFLICT: "This request was already submitted with different details. Start a new request.",
    ACCESS_CHANGED: "Your permissions changed. Reload factory access before retrying.",
    RUNTIME_JOB_DENIED: "This export is not available in your current factory context.",
    EXPORT_NOT_READY: "This export is not ready. Check its status before downloading.",
    EXPORT_EXPIRED: "This export expired. Request a new export.",
    EXPORT_LIMIT: "The active export limit was reached. Wait before creating another.",
  };
  const headers = noStoreHeaders(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify({
    success: false,
    message: messages[code] ?? "The request could not be completed.",
    data: null,
    code,
    requestId: randomUUID(),
  }), { status, headers });
}

function authErrorRedirect(
  canonicalOrigin: string,
  code: "cancelled" | "invalid" | "unavailable",
  extraHeaders?: HeadersInit,
) {
  const target = new URL("/", canonicalOrigin);
  target.searchParams.set("authError", code);
  const headers = noStoreHeaders(extraHeaders);
  headers.set("Location", target.toString());
  return new Response(null, {
    status: 303,
    headers,
  });
}

function configuredBackendPath(config: RuntimeConfig, path: string) {
  if ((!path.startsWith("/api/partner/v2/bff/") && path !== "/api/public/v2/onboarding/activate") || path.startsWith("//")) {
    throw new BffError(503, "SSO_DISABLED");
  }
  return new URL(path, config.backendOrigin);
}

function basicAuth(config: RuntimeConfig) {
  const encodeFormValue = (value: string) => new URLSearchParams([["value", value]]).toString().slice("value=".length);
  return `Basic ${Buffer.from(`${encodeFormValue(config.clientId)}:${encodeFormValue(config.clientSecret)}`).toString("base64")}`;
}

const backendErrorSchema = z.object({
  success: z.literal(false),
  code: z.string().optional(),
});

function backendStatus(code: string | undefined, status: number) {
  if (code === "SSO_DISABLED") return 503;
  if (code === "AUTH_REQUIRED" || status === 401) return 401;
  if (status === 403 || code === "INVALID_CONTEXT" || code === "CSRF_INVALID" || code === "ENTITLEMENTS_NOT_READY") return 403;
  if (status === 404) return 404;
  if ([400, 409, 410, 422, 429, 503].includes(status)) return status;
  return 502;
}

async function backendRequest<T>(
  config: RuntimeConfig,
  path: string,
  schema: z.ZodType<T>,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    sessionHandle?: string;
    storefrontHost?: string;
    contextGeneration?: string;
  } = {},
): Promise<T> {
  const headers = new Headers({
    Accept: "application/json",
    Authorization: basicAuth(config),
  });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.sessionHandle) headers.set("X-Factory1-BFF-Session", options.sessionHandle);
  if (options.contextGeneration) headers.set("X-Factory1-Context-Generation", options.contextGeneration);
  if (options.storefrontHost) {
    const edgeToken = process.env.PARTNER_SAAS_EDGE_TOKEN;
    if (!edgeToken || edgeToken.length < 32) throw new BffError(503, "SSO_DISABLED");
    headers.set("X-Factory1-Storefront-Host", options.storefrontHost);
    headers.set("X-Factory1-Edge-Token", edgeToken);
  }

  let response: Response;
  try {
    response = await fetch(configuredBackendPath(config, path), {
      method: options.method ?? "GET",
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Partner BFF backchannel request failed", error instanceof Error ? error.name : "UnknownError");
    throw new BffError(502, "AUTH_UNAVAILABLE");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    console.error("Partner BFF received a non-JSON backchannel response", response.status);
    throw new BffError(502, "AUTH_UNAVAILABLE");
  }
  if (!response.ok) {
    const parsedError = backendErrorSchema.safeParse(payload);
    const code = parsedError.success ? parsedError.data.code : undefined;
    console.error("Partner BFF backchannel rejected a request", response.status);
    throw new BffError(backendStatus(code, response.status), code ?? "AUTH_UNAVAILABLE");
  }

  const parsed = bffEnvelopeSchema(schema).safeParse(payload);
  if (!parsed.success) {
    console.error("Partner BFF response did not match the versioned contract");
    throw new BffError(502, "AUTH_UNAVAILABLE");
  }
  return parsed.data.data;
}

function requestAuthority(request: Request) {
  const url = new URL(request.url);
  const hostHeader = request.headers.get("host");
  const host = canonicalHost(hostHeader);
  if (!host || host !== url.host.toLowerCase()) throw new BffError(421, "INVALID_REQUEST");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new BffError(421, "INVALID_REQUEST");
  }
  return { url, host };
}

async function verifiedStorefront(request: Request) {
  const { url, host } = requestAuthority(request);
  const response = await proxyStorefront(host, {
    enabled: process.env.PARTNER_SAAS_STOREFRONT_ENABLED === "true",
    backendOrigin: process.env.PARTNER_SAAS_BACKEND_ORIGIN,
    edgeToken: process.env.PARTNER_SAAS_EDGE_TOKEN,
    assetHosts: process.env.PARTNER_SAAS_ASSET_HOSTS,
  });
  if (!response.ok) throw new BffError(response.status, "STOREFRONT_UNAVAILABLE");
  const parsed = envelopeSchema(storefrontSchema).safeParse(await response.json());
  if (!parsed.success || !parsed.data.data.capabilities.sso) {
    throw new BffError(503, "SSO_DISABLED");
  }
  const canonicalOrigin = new URL(parsed.data.data.storefront.canonicalOrigin);
  if (canonicalOrigin.origin !== url.origin || canonicalOrigin.hostname !== host.split(":")[0]) {
    throw new BffError(421, "INVALID_REQUEST");
  }
  return {
    canonicalOrigin: canonicalOrigin.origin,
    productId: parsed.data.data.storefront.productId,
    hostname: canonicalOrigin.hostname,
    operationalAccess: parsed.data.data.capabilities.operationalAccess,
    url,
  };
}

function validateAuthorizationUrl(
  config: RuntimeConfig,
  rawUrl: string,
  callbackUri: string,
  expiresAt: string,
) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BffError(502, "AUTH_UNAVAILABLE");
  }
  const expectedKeys = new Set([
    "response_type", "client_id", "redirect_uri", "state", "nonce",
    "code_challenge", "code_challenge_method", "scope",
  ]);
  const keys = [...url.searchParams.keys()];
  if (url.origin !== config.backendOrigin || url.pathname !== "/oauth2/authorize" ||
      url.protocol !== "https:" || url.username || url.password || url.hash ||
      keys.some((key) => !expectedKeys.has(key)) ||
      [...expectedKeys].some((key) => url.searchParams.getAll(key).length > 1) ||
      url.searchParams.get("response_type") !== "code" ||
      url.searchParams.get("client_id") !== config.clientId ||
      url.searchParams.get("redirect_uri") !== callbackUri ||
      url.searchParams.get("code_challenge_method") !== "S256" ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(url.searchParams.get("state") ?? "") ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(url.searchParams.get("nonce") ?? "") ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(url.searchParams.get("code_challenge") ?? "")) {
    throw new BffError(502, "AUTH_UNAVAILABLE");
  }
  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new BffError(502, "AUTH_UNAVAILABLE");
  return url;
}

function appendSessionCookie(headers: Headers, handle: string, expiresAt: string) {
  const expirySeconds = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000);
  if (expirySeconds <= 0) throw new BffError(401, "AUTH_REQUIRED");
  const maxAge = Math.min(absoluteSessionSeconds, expirySeconds);
  headers.append("Set-Cookie", `${cookieName}=${handle}; Path=/; Max-Age=${maxAge}; Expires=${new Date(Date.now() + maxAge * 1000).toUTCString()}; HttpOnly; Secure; SameSite=Lax`);
}

function appendOAuthStateCookie(headers: Headers, state: string, expiresAt: string) {
  const expirySeconds = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000);
  if (expirySeconds <= 0) throw new BffError(502, "AUTH_UNAVAILABLE");
  const maxAge = Math.min(oauthStateSeconds, expirySeconds);
  headers.append("Set-Cookie", `${oauthStateCookieName}=${state}; Path=/; Max-Age=${maxAge}; Expires=${new Date(Date.now() + maxAge * 1000).toUTCString()}; HttpOnly; Secure; SameSite=Lax`);
}

function clearSessionCookie(headers: Headers) {
  headers.append("Set-Cookie", `${cookieName}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`);
}

function clearOAuthStateCookie(headers: Headers) {
  headers.append("Set-Cookie", `${oauthStateCookieName}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`);
}

function oauthStateFromRequest(request: Request) {
  const values = (request.headers.get("cookie") ?? "").split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${oauthStateCookieName}=`))
    .map((part) => part.slice(oauthStateCookieName.length + 1));
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{43,128}$/.test(values[0])) return null;
  return values[0];
}

function sessionHandleFromRequest(request: Request) {
  const values = (request.headers.get("cookie") ?? "").split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${cookieName}=`))
    .map((part) => part.slice(cookieName.length + 1));
  if (values.length > 1) throw new BffError(400, "INVALID_REQUEST");
  if (!values[0]) throw new BffError(401, "AUTH_REQUIRED");
  const parsed = z.string().regex(/^[A-Za-z0-9_-]{32,512}$/).safeParse(values[0]);
  if (!parsed.success) throw new BffError(401, "AUTH_REQUIRED");
  return parsed.data;
}

function csrfForSession(handle: string, origin: string, secret: string) {
  return createHmac("sha256", Buffer.from(secret, "base64url"))
    .update(`${origin}\n${handle}`)
    .digest("base64url");
}

function assertSameOriginMutation(request: Request, handle: string, config: RuntimeConfig) {
  const { url } = requestAuthority(request);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || origin !== url.origin || (fetchSite && fetchSite !== "same-origin")) {
    throw new BffError(403, "CSRF_INVALID");
  }
  const supplied = request.headers.get("x-csrf-token") ?? "";
  const expected = csrfForSession(handle, url.origin, config.csrfSecret);
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    throw new BffError(403, "CSRF_INVALID");
  }
}

async function requestJson<T extends z.ZodType>(request: Request, schema: T, limit = bodyLimitBytes): Promise<z.infer<T>> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json" || !Number.isFinite(contentLength) ||
      (contentLength > 0 && contentLength > limit) || !request.body) {
    throw new BffError(400, "INVALID_REQUEST");
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new BffError(413, "INVALID_REQUEST");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof BffError) throw error;
    throw new BffError(400, "INVALID_REQUEST");
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new BffError(400, "INVALID_REQUEST");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BffError(400, "INVALID_REQUEST");
  return parsed.data;
}

function contextOptionsMatchDomain(
  options: PartnerContextOptions,
  context: PartnerContext | null,
  productId: string,
  hostname: string,
) {
  const first = context ?? options.items[0];
  if (context && (context.productId !== productId || context.hostname.toLowerCase() !== hostname.toLowerCase())) {
    return false;
  }
  if (options.items.some((item) => item.productId !== productId || item.hostname.toLowerCase() !== hostname.toLowerCase())) {
    return false;
  }
  if (context && !options.items.some((item) =>
    item.organizationId === context.organizationId && item.domainId === context.domainId)) {
    return false;
  }
  if (!first) return true;
  return options.items.every((item) =>
    item.productId === first.productId && item.domainId === first.domainId &&
    item.hostname.toLowerCase() === first.hostname.toLowerCase());
}

function entitlementsMatchContext(entitlements: PartnerEntitlements, context: PartnerContext) {
  return entitlements.organizationId === context.organizationId && entitlements.productId === context.productId;
}

async function loadSession(config: RuntimeConfig, handle: string, productId: string, hostname: string) {
  const session = await backendRequest(config, "/api/partner/v2/bff/session", partnerSessionSchema, {
    sessionHandle: handle,
  });
  const contextOptions = await backendRequest(config, "/api/partner/v2/bff/session/context/options", partnerContextOptionsSchema, {
    sessionHandle: handle,
  });
  if (!contextOptionsMatchDomain(contextOptions, session.context, productId, hostname)) {
    throw new BffError(502, "AUTH_UNAVAILABLE");
  }
  let entitlements: PartnerEntitlements | null = null;
  if (session.context) {
    entitlements = await backendRequest(config, "/api/partner/v2/bff/session/entitlements", partnerEntitlementsSchema, {
      sessionHandle: handle,
    });
    if (!entitlementsMatchContext(entitlements, session.context)) {
      throw new BffError(502, "AUTH_UNAVAILABLE");
    }
  }
  if ((session.context === null) !== (entitlements === null)) {
    throw new BffError(502, "AUTH_UNAVAILABLE");
  }
  return { session, contextOptions, entitlements };
}

function bffFailure(error: unknown, extraHeaders?: HeadersInit) {
  if (error instanceof BffError) return failure(error.status, error.code, extraHeaders);
  console.error("Partner BFF request failed", error instanceof Error ? error.name : "UnknownError");
  return failure(502, "AUTH_UNAVAILABLE", extraHeaders);
}

export async function startAuth(request: Request) {
  try {
    const config = runtimeConfig();
    const { canonicalOrigin } = await verifiedStorefront(request);
    const redirectUri = `${canonicalOrigin}/auth/callback`;
    const transaction = await backendRequest(
      config,
      "/api/partner/v2/bff/oauth/transactions",
      oauthTransactionSchema,
      { method: "POST", body: { redirectUri } },
    );
    const authorizationUrl = validateAuthorizationUrl(config, transaction.authorizationUrl, redirectUri, transaction.expiresAt);
    const headers = noStoreHeaders({ Location: authorizationUrl.toString() });
    appendOAuthStateCookie(headers, authorizationUrl.searchParams.get("state") ?? "", transaction.expiresAt);
    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    return bffFailure(error);
  }
}

export async function finishAuth(request: Request) {
  let config: RuntimeConfig;
  let canonicalOrigin: string;
  try {
    config = runtimeConfig();
    canonicalOrigin = (await verifiedStorefront(request)).canonicalOrigin;
  } catch (error) {
    return bffFailure(error);
  }

  const callbackHeaders = noStoreHeaders();
  clearOAuthStateCookie(callbackHeaders);
  try {
    const url = new URL(request.url);
    const codes = url.searchParams.getAll("code");
    const states = url.searchParams.getAll("state");
    const errors = url.searchParams.getAll("error");
    if (codes.length > 1 || states.length !== 1 || errors.length > 1 ||
        states[0] !== oauthStateFromRequest(request) ||
        errors.some((value) => !["access_denied", "invalid_request", "server_error"].includes(value)) ||
        (errors.length > 0 && codes.length > 0)) {
      return authErrorRedirect(canonicalOrigin, "invalid", callbackHeaders);
    }
    if (errors.length > 0) {
      return authErrorRedirect(canonicalOrigin, errors[0] === "access_denied" ? "cancelled" : "invalid", callbackHeaders);
    }
    if (codes.length !== 1 || states.length !== 1 || !codes[0] || codes[0].length > 4096 ||
        !/^[A-Za-z0-9_-]{43,128}$/.test(states[0] ?? "")) {
      return authErrorRedirect(canonicalOrigin, "invalid", callbackHeaders);
    }

    const exchange = await backendRequest(
      config,
      "/api/partner/v2/bff/oauth/exchange",
      oauthExchangeSchema,
      { method: "POST", body: { code: codes[0], state: states[0] } },
    );
    const headers = noStoreHeaders({ Location: `${canonicalOrigin}/` });
    clearOAuthStateCookie(headers);
    appendSessionCookie(headers, exchange.sessionHandle, exchange.expiresAt);
    return new Response(null, { status: 303, headers });
  } catch (error) {
    const code = error instanceof BffError && error.status >= 500 ? "unavailable" : "invalid";
    return authErrorRedirect(canonicalOrigin, code, callbackHeaders);
  }
}

export async function getAuthSession(request: Request) {
  try {
    const config = runtimeConfig();
    const storefront = await verifiedStorefront(request);
    const handle = sessionHandleFromRequest(request);
    const { session, contextOptions, entitlements } = await loadSession(
      config, handle, storefront.productId, storefront.hostname,
    );
    const csrfToken = csrfForSession(handle, new URL(request.url).origin, config.csrfSecret);
    const payload = authBootstrapSchema.parse({ session, contextOptions, entitlements, csrfToken });
    return bffJson(payload);
  } catch (error) {
    const headers = noStoreHeaders();
    if (error instanceof BffError && error.code === "AUTH_REQUIRED") clearSessionCookie(headers);
    return bffFailure(error, headers);
  }
}

const contextBodySchema = z.object({ organizationId: z.uuid() }).strict();

export async function changeAuthContext(request: Request) {
  let handle = "";
  try {
    const config = runtimeConfig();
    handle = sessionHandleFromRequest(request);
    assertSameOriginMutation(request, handle, config);
    const storefront = await verifiedStorefront(request);
    const body = await requestJson(request, contextBodySchema);
    const options = await backendRequest(config, "/api/partner/v2/bff/session/context/options", partnerContextOptionsSchema, {
      sessionHandle: handle,
    });
    if (!contextOptionsMatchDomain(options, null, storefront.productId, storefront.hostname)) {
      throw new BffError(502, "AUTH_UNAVAILABLE");
    }
    const requested = options.items.find((item) => item.organizationId === body.organizationId);
    if (!requested) throw new BffError(403, "INVALID_CONTEXT");

    const changed = await backendRequest(
      config,
      "/api/partner/v2/bff/session/context",
      contextSelectionSchema,
      { method: "POST", body, sessionHandle: handle },
    );
    if (changed.sessionHandle === handle ||
        changed.context.organizationId !== body.organizationId ||
        changed.context.productId !== requested.productId ||
        changed.context.domainId !== requested.domainId ||
        changed.context.hostname.toLowerCase() !== requested.hostname.toLowerCase() ||
        !entitlementsMatchContext(changed.entitlements, changed.context)) {
      throw new BffError(502, "AUTH_UNAVAILABLE");
    }
    const headers = noStoreHeaders();
    appendSessionCookie(headers, changed.sessionHandle, changed.expiresAt);
    return bffJson({
      context: changed.context,
      entitlements: changed.entitlements,
      operationalAccess: changed.entitlements.operationalAccess,
    }, 200, headers);
  } catch (error) {
    const headers = noStoreHeaders();
    if (error instanceof BffError && error.code === "AUTH_REQUIRED") clearSessionCookie(headers);
    return bffFailure(error, headers);
  }

}

export async function productRuntimeRequest(request: Request) {
  try {
    const config = runtimeConfig();
    const url = new URL(request.url);
    const prefix = "/api/product-runtime";
    const path = url.pathname.slice(prefix.length);
    const reviewed = reviewedRuntimeRoute(request.method, path);
    if (!url.pathname.startsWith(`${prefix}/`) || !reviewed || !runtimeQueryAllowed(url.searchParams, path)) {
      throw new BffError(403, "RUNTIME_ROUTE_DENIED");
    }
    const handle = sessionHandleFromRequest(request);
    if (request.method !== "GET") assertSameOriginMutation(request, handle, config);
    const storefront = await verifiedStorefront(request);
    const data = await loadSession(config, handle, storefront.productId, storefront.hostname);
    if (!storefront.operationalAccess || !hasOperationalAccess(data) || !data.entitlements ||
        !runtimeRouteAllowed(data.entitlements.runtimeRoutes, data.entitlements.role, request.method, path, data.entitlements.modules, data.entitlements.moduleDecisions)) {
      throw new BffError(403, "RUNTIME_ROUTE_DENIED");
    }
    if (request.headers.get("X-Factory1-Context-Generation") !== data.session.contextGeneration) {
      throw new BffError(409, "CONTEXT_CHANGED");
    }
    const method = reviewed.method as "GET" | "POST" | "PUT" | "DELETE";
    const body = method === "POST" || method === "PUT"
      ? await requestJson(request, z.record(z.string(), z.unknown()), 64 * 1024) : undefined;
    if (body && ["organizationId", "tenantId", "partnerId", "domainId", "modules", "role", "userId",
      ...(path.startsWith("/api/production/") ? [] : ["productId"])]
      .some((key) => key in body)) throw new BffError(400, "INVALID_REQUEST");
    const result = await backendRequest(
      config, `/api/partner/v2/bff/runtime${path}${url.search}`, z.unknown(),
      { method, sessionHandle: handle, body, storefrontHost: storefront.hostname,
        contextGeneration: data.session.contextGeneration ?? undefined },
    );
    const serialized = JSON.stringify(result);
    if ([handle, config.clientSecret, process.env.PARTNER_SAAS_EDGE_TOKEN].some((secret) => secret && serialized?.includes(secret))) {
      throw new BffError(502, "AUTH_UNAVAILABLE");
    }
    return bffJson(result);
  } catch (error) {
    const headers = noStoreHeaders();
    if (error instanceof BffError && error.code === "AUTH_REQUIRED") clearSessionCookie(headers);
    return bffFailure(error, headers);
  }
}

const invitationCsrfCookie = "__Host-factory1_invitation_csrf";
const invitationToken = z.string().min(32).max(4096);

export async function getInvitationChallenge(request: Request) {
  try {
    const config = runtimeConfig();
    await verifiedStorefront(request);
    const nonce = `${randomUUID()}.${Date.now()}`;
    const headers = noStoreHeaders();
    headers.append("Set-Cookie", `${invitationCsrfCookie}=${nonce}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Strict`);
    return bffJson({ csrfToken: csrfForSession(nonce, new URL(request.url).origin, config.csrfSecret) }, 200, headers);
  } catch (error) { return bffFailure(error); }
}

export async function activateProductInvitation(request: Request) {
  try {
    const config = runtimeConfig();
    const nonces = (request.headers.get("cookie") ?? "").split(";")
      .map((part) => part.trim()).filter((part) => part.startsWith(`${invitationCsrfCookie}=`))
      .map((part) => part.slice(invitationCsrfCookie.length + 1));
    if (nonces.length !== 1 || !/^[0-9a-f-]{36}\.\d{13}$/.test(nonces[0])) throw new BffError(403, "CSRF_INVALID");
    const age = Date.now() - Number(nonces[0].split(".")[1]);
    if (age < 0 || age > 600_000) throw new BffError(403, "CSRF_INVALID");
    assertSameOriginMutation(request, nonces[0], config);
    const storefront = await verifiedStorefront(request);
    const body = await requestJson(request, z.object({ token: invitationToken, password: passwordSchema }).strict(), 8192);
    const result = await backendRequest(config, "/api/public/v2/onboarding/activate", invitationResultSchema, {
      method: "POST", body, storefrontHost: storefront.hostname,
    });
    const headers = noStoreHeaders();
    headers.append("Set-Cookie", `${invitationCsrfCookie}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
    return bffJson(result, 200, headers);
  } catch (error) { return bffFailure(error); }
}

export async function acceptProductInvitation(request: Request) {
  try {
    const config = runtimeConfig();
    const handle = sessionHandleFromRequest(request);
    assertSameOriginMutation(request, handle, config);
    const storefront = await verifiedStorefront(request);
    const body = await requestJson(request, z.object({ token: invitationToken }).strict(), 8192);
    const result = await backendRequest(config, "/api/partner/v2/bff/onboarding/accept", invitationResultSchema, {
      method: "POST", body, sessionHandle: handle, storefrontHost: storefront.hostname,
    });
    return bffJson(result);
  } catch (error) { return bffFailure(error); }
}

const logoutBodySchema = z.object({ scope: z.enum(["domain", "all"]) }).strict();

export async function logoutAuth(request: Request) {
  const headers = noStoreHeaders();
  let logoutAttempted = false;
  try {
    const config = runtimeConfig();
    const handle = sessionHandleFromRequest(request);
    assertSameOriginMutation(request, handle, config);
    const body = await requestJson(request, logoutBodySchema);
    logoutAttempted = true;
    const result = await backendRequest(
      config,
      "/api/partner/v2/bff/session/logout",
      logoutResultSchema,
      { method: "POST", body, sessionHandle: handle },
    );
    if (result.scope !== body.scope) throw new BffError(502, "AUTH_UNAVAILABLE");
    clearSessionCookie(headers);
    return bffJson({ revoked: true, scope: result.scope }, 200, headers);
  } catch (error) {
    if (logoutAttempted) clearSessionCookie(headers);
    if (error instanceof BffError && error.code !== "AUTH_REQUIRED") {
      if (error.status >= 500) return failure(502, "LOGOUT_UNCONFIRMED", headers);
    }
    return bffFailure(error, headers);
  }
}
