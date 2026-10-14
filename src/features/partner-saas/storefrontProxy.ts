import { canonicalHost } from "./host";
import { allowedAssetUrl, envelopeSchema, storefrontSchema } from "./contracts";

export type StorefrontProxyConfig = {
  enabled: boolean;
  backendOrigin: string | undefined;
  edgeToken: string | undefined;
  assetHosts?: string;
};

function failure(status: number, code: string) {
  return Response.json({ success: false, code, message: "Storefront is unavailable", data: null }, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function proxyStorefront(
  authority: string | null,
  config: StorefrontProxyConfig,
): Promise<Response> {
  if (!config.enabled) return failure(503, "STOREFRONT_ROLLOUT_DISABLED");
  const host = canonicalHost(authority);
  if (!host) return failure(421, "UNTRUSTED_STOREFRONT_HOST");
  if (!config.backendOrigin || !config.edgeToken) return failure(503, "STOREFRONT_PROXY_NOT_CONFIGURED");
  let origin: URL;
  try {
    origin = new URL(config.backendOrigin);
  } catch {
    console.error("Storefront proxy backend origin is invalid");
    return failure(503, "STOREFRONT_PROXY_NOT_CONFIGURED");
  }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    console.error("Storefront proxy requires a credential-free HTTPS backend origin");
    return failure(503, "STOREFRONT_PROXY_NOT_CONFIGURED");
  }
  try {
    const upstream = await fetch(new URL("/api/public/v2/storefront", origin), {
      headers: {
        "X-Factory1-Storefront-Host": host,
        "X-Factory1-Edge-Token": config.edgeToken,
        Accept: "application/json",
      },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (![200, 404, 421, 503].includes(upstream.status)) {
      console.error("Storefront bootstrap returned unexpected status", upstream.status);
      return failure(502, "STOREFRONT_UPSTREAM_ERROR");
    }
    if (upstream.status !== 200) {
      const code = upstream.status === 421 ? "UNTRUSTED_STOREFRONT_HOST" :
        upstream.status === 503 ? "STOREFRONT_ROLLOUT_DISABLED" : "STOREFRONT_UNAVAILABLE";
      return failure(upstream.status, code);
    }
    const parsed = envelopeSchema(storefrontSchema).safeParse(await upstream.json());
    if (!parsed.success) return failure(502, "STOREFRONT_INVALID_RESPONSE");
    const data = parsed.data.data;
    const publicOrigin = new URL(data.storefront.canonicalOrigin);
    if (publicOrigin.protocol !== "https:" || publicOrigin.host !== host ||
        publicOrigin.username || publicOrigin.password || publicOrigin.pathname !== "/" || publicOrigin.search || publicOrigin.hash ||
        !allowedAssetUrl(data.storefront.logoUrl, config.assetHosts ?? "") ||
        !allowedAssetUrl(data.storefront.faviconUrl, config.assetHosts ?? "")) {
      return failure(502, "STOREFRONT_INVALID_RESPONSE");
    }
    return Response.json({ success: true, data }, {
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    console.error("Storefront bootstrap request failed", error instanceof Error ? error.name : "UnknownError");
    return failure(502, "STOREFRONT_UPSTREAM_ERROR");
  }
}
