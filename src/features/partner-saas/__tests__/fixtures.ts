import type { SaasProduct, ProductDomain, PublicStorefront } from "../contracts";

export const partnerId = "11111111-1111-4111-8111-111111111111";
export const productId = "22222222-2222-4222-8222-222222222222";
export const userId = "33333333-3333-4333-8333-333333333333";
export const product: SaasProduct = {
  id: productId, partnerId, code: "HRMS", displayName: "Acme HR", status: "DRAFT",
  featureKeys: ["payroll"], logoUrl: null, faviconUrl: null, primaryColorHex: "#123456", accentColorHex: null, version: 3,
};
export const domain: ProductDomain = {
  id: "44444444-4444-4444-8444-444444444444", productId, hostname: "hr.example.test",
  status: "PENDING", ownershipStatus: "VERIFIED", routingStatus: "PENDING", tlsStatus: "PENDING",
  verification: { recordType: "TXT", recordName: "_factory1-verification.hr.example.test", value: "test-only-challenge", expiresAt: "2026-11-01T00:00:00Z" },
  lastCheckedAt: "2026-10-14T00:00:00Z", verificationFailure: null, version: 2,
};
export const storefront: PublicStorefront = {
  schemaVersion: 2,
  storefront: { partnerId, productId, canonicalOrigin: "https://hr.example.test", displayName: "Acme HR",
    logoUrl: null, faviconUrl: null, primaryColorHex: "#123456", accentColorHex: null },
  capabilities: { operationalAccess: false, sso: false, checkout: false },
};
