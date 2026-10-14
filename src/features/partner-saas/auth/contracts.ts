import { z } from "zod";

const id = z.uuid();
const sessionHandle = z.string().regex(/^[A-Za-z0-9_-]{32,512}$/);
const csrfToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const partnerContextSchema = z.object({
  organizationId: id,
  organizationName: z.string().min(1).max(120),
  productId: id,
  productName: z.string().min(1).max(120),
  domainId: id,
  hostname: z.string().min(1).max(253),
}).strict();
export type PartnerContext = z.infer<typeof partnerContextSchema>;

export const partnerSessionSchema = z.object({
  authenticated: z.literal(true),
  expiresAt: z.iso.datetime(),
  context: partnerContextSchema.nullable(),
  operationalAccess: z.literal(false),
}).strict();
export type PartnerSession = z.infer<typeof partnerSessionSchema>;

export const partnerContextOptionsSchema = z.object({
  items: z.array(z.object({
    organizationId: id,
    label: z.string().min(1).max(120),
    productId: id,
    productName: z.string().min(1).max(120),
    domainId: id,
    hostname: z.string().min(1).max(253),
  }).strict()),
}).strict();
export type PartnerContextOptions = z.infer<typeof partnerContextOptionsSchema>;

export const partnerEntitlementsSchema = z.object({
  productId: id,
  organizationId: id,
  modules: z.array(z.string().min(1).max(100)),
  ready: z.boolean(),
  operationalAccess: z.literal(false),
}).strict();
export type PartnerEntitlements = z.infer<typeof partnerEntitlementsSchema>;

export const contextSelectionSchema = z.object({
  sessionHandle,
  expiresAt: z.iso.datetime(),
  context: partnerContextSchema,
  entitlements: partnerEntitlementsSchema,
}).strict();

export const oauthTransactionSchema = z.object({
  authorizationUrl: z.url(),
  expiresAt: z.iso.datetime(),
}).strict();

export const oauthExchangeSchema = z.object({
  sessionHandle,
  expiresAt: z.iso.datetime(),
}).strict();

export const logoutResultSchema = z.object({
  revoked: z.literal(true),
  scope: z.enum(["domain", "all"]),
}).strict();

export const authBootstrapSchema = z.object({
  session: partnerSessionSchema,
  contextOptions: partnerContextOptionsSchema,
  entitlements: partnerEntitlementsSchema.nullable(),
  csrfToken,
}).strict();
export type AuthBootstrap = z.infer<typeof authBootstrapSchema>;

export const contextChangeBrowserSchema = z.object({
  context: partnerContextSchema,
  entitlements: partnerEntitlementsSchema,
  operationalAccess: z.literal(false),
}).strict();

export function bffEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data,
  }).strict();
}
