import { z } from "zod";

const id = z.uuid();
const version = z.number().int().nonnegative();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable();
const asset = z.string().max(1000).nullable();

export const productSchema = z.object({
  id, partnerId: id, code: z.string().min(1).max(80), displayName: z.string().min(1).max(120),
  status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "RETIRED"]),
  featureKeys: z.array(z.string()).max(100),
  logoUrl: asset, faviconUrl: asset, primaryColorHex: color, accentColorHex: color, version,
});
export type SaasProduct = z.infer<typeof productSchema>;
export type ProductInput = Pick<SaasProduct, "code" | "displayName" | "featureKeys" | "logoUrl" | "faviconUrl" | "primaryColorHex" | "accentColorHex">;
export type ProductUpdate = Omit<ProductInput, "code"> & { status: SaasProduct["status"]; expectedVersion: number };

export const membershipSchema = z.object({
  userId: id, partnerId: id, role: z.enum(["ADMIN", "CATALOG", "ONBOARDING", "VIEWER"]),
  active: z.boolean(), version,
});
export type PartnerMembership = z.infer<typeof membershipSchema>;

export const domainSchema = z.object({
  id, productId: id, hostname: z.string().min(1).max(253),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "RETIRED"]),
  ownershipStatus: z.enum(["PENDING", "VERIFIED", "EXPIRED", "FAILED"]),
  routingStatus: z.enum(["PENDING", "READY", "FAILED"]),
  tlsStatus: z.enum(["PENDING", "READY", "FAILED"]),
  verification: z.object({
    recordType: z.literal("TXT"), recordName: z.string(), value: z.string(), expiresAt: z.iso.datetime(),
  }).nullable(),
  lastCheckedAt: z.iso.datetime().nullable(), verificationFailure: z.string().nullable(), version,
});
export type ProductDomain = z.infer<typeof domainSchema>;

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), offset: z.number().int().nonnegative(), limit: z.number().int().min(1).max(100), total: z.number().int().nonnegative() });
}
export const domainPageSchema = z.object({
  domains: pageSchema(domainSchema),
  capabilities: z.object({
    ownershipVerification: z.boolean(), routingProvisioning: z.literal(false),
    tlsProvisioning: z.literal(false), storefrontRollout: z.boolean(),
  }),
});

export const storefrontSchema = z.object({
  schemaVersion: z.literal(2),
  storefront: z.object({
    partnerId: id, productId: id, canonicalOrigin: z.url(), displayName: z.string().min(1).max(120),
    logoUrl: asset, faviconUrl: asset, primaryColorHex: color, accentColorHex: color,
  }),
  capabilities: z.object({
    operationalAccess: z.boolean(), sso: z.boolean(), checkout: z.literal(false),
  }),
});
export type PublicStorefront = z.infer<typeof storefrontSchema>;

export function envelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({ success: z.literal(true), data });
}

export function allowedAssetUrl(value: string | null, hosts: string) {
  if (value === null) return true;
  if (!/^https:\/\/[^/?#@\s]+(?:\/[^?#\s]*)?$/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash &&
      !url.port && hosts.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean).includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
