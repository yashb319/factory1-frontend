export type PartnerAuthRuntimeConfig = {
  enabled: boolean;
  backendOrigin: string | undefined;
  clientId: string | undefined;
  clientSecret: string | undefined;
  csrfSecret: string | undefined;
};

export function isPartnerAuthRuntimeReady(config: PartnerAuthRuntimeConfig) {
  if (!config.enabled || !config.clientId?.trim() || !config.clientSecret?.trim()) return false;
  if (!config.csrfSecret || !/^[A-Za-z0-9_-]{43}$/.test(config.csrfSecret)) return false;
  if (Buffer.from(config.csrfSecret, "base64url").length !== 32) return false;
  if (!config.backendOrigin) return false;

  try {
    const origin = new URL(config.backendOrigin);
    return origin.protocol === "https:" && !origin.username && !origin.password &&
      origin.pathname === "/" && !origin.search && !origin.hash;
  } catch {
    return false;
  }
}

export function partnerAuthRuntimeConfig(): PartnerAuthRuntimeConfig {
  return {
    enabled: process.env.PARTNER_SAAS_STOREFRONT_ENABLED === "true",
    backendOrigin: process.env.PARTNER_SAAS_BACKEND_ORIGIN,
    clientId: process.env.PARTNER_SAAS_OAUTH_CLIENT_ID,
    clientSecret: process.env.PARTNER_SAAS_OAUTH_CLIENT_SECRET,
    csrfSecret: process.env.PARTNER_SAAS_CSRF_SECRET,
  };
}
