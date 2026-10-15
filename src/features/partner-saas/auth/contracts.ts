import { z } from "zod";

const id = z.uuid();
const sessionHandle = z.string().regex(/^[A-Za-z0-9_-]{32,512}$/);
const csrfToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const factoryRole = z.enum(["OWNER", "ADMIN", "MANAGEMENT", "FINANCE", "EMPLOYEE"]);

export const runtimePrincipalSchema = z.object({
  id, name: z.string().min(1), email: z.email(), role: factoryRole,
  status: z.literal("ACTIVE"), organizationId: id,
  organizationStatus: z.enum(["PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "TERMINATED"]),
  platformAdmin: z.literal(false),
}).strict();

export const runtimeRouteSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  path: z.string().startsWith("/api/").max(200),
}).strict();

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
  operationalAccess: z.boolean(),
  principal: runtimePrincipalSchema.nullable().optional().default(null),
  contextGeneration: z.string().min(1).max(128).nullable().optional().default(null),
}).strict().refine((session) => !session.operationalAccess ||
  Boolean(session.context && session.principal && session.contextGeneration &&
    session.principal.organizationId === session.context.organizationId &&
    session.principal.organizationStatus === "ACTIVE"),
{ message: "Operational sessions require an active authoritative factory principal and generation" });
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
  operationalAccess: z.boolean(),
  role: factoryRole.nullable().optional().default(null),
  contextGeneration: z.string().min(1).max(128).nullable().optional().default(null),
  runtimeRoutes: z.array(runtimeRouteSchema).max(100).optional().default([]),
}).strict().refine((entitlements) => !entitlements.operationalAccess ||
  Boolean(entitlements.ready && entitlements.role && entitlements.contextGeneration && entitlements.runtimeRoutes.length),
{ message: "Operational entitlements require enforced runtime authorization" });
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
  operationalAccess: z.boolean(),
}).strict();

export function bffEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data,
  }).strict();
}
