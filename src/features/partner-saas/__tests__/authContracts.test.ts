import { describe, expect, it } from "vitest";
import {
  contextSelectionSchema,
  partnerContextOptionsSchema,
  partnerEntitlementsSchema,
  partnerSessionSchema,
} from "../auth/contracts";

const context = {
  organizationId: "33333333-3333-4333-8333-333333333333",
  organizationName: "Factory One",
  productId: "22222222-2222-4222-8222-222222222222",
  productName: "Acme HR",
  domainId: "44444444-4444-4444-8444-444444444444",
  hostname: "hr.example.test",
};

describe("partner session contracts", () => {
  it("accepts only server-authorized session, context, and entitlement shapes", () => {
    expect(partnerSessionSchema.safeParse({
      authenticated: true,
      expiresAt: "2026-10-14T11:00:00Z",
      context,
      operationalAccess: false,
    }).success).toBe(true);
    expect(partnerContextOptionsSchema.safeParse({
      items: [{
        organizationId: context.organizationId,
        label: context.organizationName,
        productId: context.productId,
        productName: context.productName,
        domainId: context.domainId,
        hostname: context.hostname,
      }],
    }).success).toBe(true);
    expect(partnerEntitlementsSchema.safeParse({
      productId: context.productId,
      organizationId: context.organizationId,
      modules: ["inventory"],
      ready: false,
      operationalAccess: false,
    }).success).toBe(true);
  });

  it("rejects backend attempts to grant operational access in this rollout", () => {
    expect(partnerSessionSchema.safeParse({
      authenticated: true,
      expiresAt: "2026-10-14T11:00:00Z",
      context,
      operationalAccess: true,
    }).success).toBe(false);
    expect(partnerEntitlementsSchema.safeParse({
      productId: context.productId,
      organizationId: context.organizationId,
      modules: ["inventory"],
      ready: true,
      operationalAccess: true,
    }).success).toBe(false);
    const selection = {
      sessionHandle: "a".repeat(43),
      context,
      expiresAt: "2026-10-14T11:00:00Z",
      entitlements: {
        productId: context.productId,
        organizationId: context.organizationId,
        modules: ["inventory"],
        ready: false,
        operationalAccess: false,
      },
    };
    expect(contextSelectionSchema.safeParse(selection).success).toBe(true);
    expect(contextSelectionSchema.safeParse({
      ...selection,
      domainSessionToken: "must-not-leave-backend",
    }).success).toBe(false);
  });
});
