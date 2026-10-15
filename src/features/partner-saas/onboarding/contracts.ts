import { z } from "zod";

export const onboardingPolicySchema = z.object({
  enabled: z.boolean(), activationMode: z.literal("PLATFORM_EVIDENCE_REQUIRED"),
  checkout: z.literal(false), existingIdentityAcceptance: z.literal("AUTHENTICATED_EXPLICIT"),
  invitationDelivery: z.boolean(),
});

export const customerSchema = z.object({
  id: z.uuid(), organizationId: z.uuid(), factoryName: z.string(), productId: z.uuid(),
  subscriptionId: z.uuid(), subscriptionStatus: z.string(), organizationStatus: z.string(),
  ownerUserId: z.uuid(),
  invitation: z.object({
    id: z.uuid(), status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]), expiresAt: z.iso.datetime(),
  }),
  createdAt: z.iso.datetime(),
});
export type ProductCustomer = z.infer<typeof customerSchema>;

export const onboardingInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(80),
  factoryName: z.string().trim().min(2).max(255),
  ownerName: z.string().trim().min(2).max(255),
  ownerEmail: z.email().max(255),
  existingOwnerUserId: z.uuid().optional(),
}).strict();
export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

export const invitationResultSchema = z.object({
  accepted: z.literal(true), organizationId: z.uuid(), subscriptionStatus: z.string(),
}).strict();

export const tenantMembershipSchema = z.object({
  userId: z.uuid(), organizationId: z.uuid(),
  role: z.enum(["OWNER", "ADMIN", "MANAGEMENT", "FINANCE", "EMPLOYEE"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]), source: z.string(), version: z.number().int().nonnegative(),
});
export const userProductGrantSchema = z.object({ subscriptionId: z.uuid(), userId: z.uuid() });
