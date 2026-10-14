import { headers } from "next/headers";
import { envelopeSchema, storefrontSchema } from "./contracts";
import { usesLegacyHost } from "./host";
import { proxyStorefront } from "./storefrontProxy";
import { FoundationStorefront } from "./components/FoundationStorefront";
import { isPartnerAuthRuntimeReady, partnerAuthRuntimeConfig } from "./auth/runtime";

export async function legacyRequest() {
  // Always request-scoped: never prerender direct-site HTML for a later product host.
  const authority = (await headers()).get("host");
  const boundaryEnabled = process.env.PARTNER_SAAS_HOST_BOUNDARY_ENABLED === "true";
  const storefrontEnabled = process.env.PARTNER_SAAS_STOREFRONT_ENABLED === "true";
  if (!boundaryEnabled && !storefrontEnabled) return true;
  return usesLegacyHost(authority, {
    boundaryEnabled: true,
    directHosts: process.env.PARTNER_SAAS_DIRECT_HOSTS ?? "",
    legacyHosts: process.env.PARTNER_SAAS_LEGACY_HOSTS ?? "",
  });
}

export async function StorefrontBoundary({ children }: { children: React.ReactNode }) {
  if (await legacyRequest()) return children;
  const response = await proxyStorefront((await headers()).get("host"), {
    enabled: process.env.PARTNER_SAAS_STOREFRONT_ENABLED === "true",
    backendOrigin: process.env.PARTNER_SAAS_BACKEND_ORIGIN,
    edgeToken: process.env.PARTNER_SAAS_EDGE_TOKEN,
    assetHosts: process.env.PARTNER_SAAS_ASSET_HOSTS,
  });
  if (!response.ok) return <FoundationStorefront state={response.status === 503 ? "disabled" : "unavailable"} />;
  const parsed = envelopeSchema(storefrontSchema).safeParse(await response.json());
  if (!parsed.success) return <FoundationStorefront />;
  const authRuntime = partnerAuthRuntimeConfig();
  return <FoundationStorefront
    storefront={parsed.data.data}
    signInEnabled={parsed.data.data.capabilities.sso && isPartnerAuthRuntimeReady(authRuntime)}
  />;
}
