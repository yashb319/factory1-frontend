import { proxyStorefront } from "@/features/partner-saas/storefrontProxy";

export async function GET(request: Request) {
  return proxyStorefront(request.headers.get("host"), {
    enabled: process.env.PARTNER_SAAS_STOREFRONT_ENABLED === "true",
    backendOrigin: process.env.PARTNER_SAAS_BACKEND_ORIGIN,
    edgeToken: process.env.PARTNER_SAAS_EDGE_TOKEN,
    assetHosts: process.env.PARTNER_SAAS_ASSET_HOSTS,
  });
}
