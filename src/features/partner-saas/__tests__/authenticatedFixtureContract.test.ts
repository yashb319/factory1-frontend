import { describe, expect, it } from "vitest";
import {
  bffEnvelopeSchema,
  contextSelectionSchema,
  partnerContextOptionsSchema,
  partnerEntitlementsSchema,
  partnerSessionSchema,
  type PartnerEntitlements,
} from "../auth/contracts";
import contextOptions from "./fixtures/context-options.json";
import contextSelection from "./fixtures/context-selection.json";
import entitlements from "./fixtures/entitlements.json";
import sessionAfter from "./fixtures/session-after-selection.json";
import sessionBefore from "./fixtures/session-before-selection.json";

// Byte-identical copies of factory1-backend src/test/resources/partner-sso at test-only #137
// (641d07f, merged cbda4a9): actual HTTP serialization of application source 760c43a.
type Issues = { path: PropertyKey[]; code: string }[];

function issuePaths(issues: Issues) {
  return issues.map(({ path, code }) => ({ path: path.join("."), code }));
}

function accepted<T>(result: { success: true; data: T } | { success: false; error: { issues: Issues } }, label: string): T {
  if (!result.success) console.log(`Authenticated ${label} schema issues:`, JSON.stringify(issuePaths(result.error.issues)));
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(`Serialized ${label} was rejected`);
  return result.data;
}

function expectNoRuntimeCapability(parsed: PartnerEntitlements) {
  expect(parsed.operationalAccess).toBe(false);
  expect(parsed.ready).toBe(false);
  expect(parsed.runtimeRoutes).toEqual([]);
  expect(parsed.moduleDecisions.every((decision) => !decision.enabled)).toBe(true);
}

describe("actual serialized authenticated BFF DTOs", () => {
  it("contain no credentials, cookies, CSRF tokens or functional session handles", () => {
    for (const body of [sessionBefore, sessionAfter, entitlements, contextSelection, contextOptions]) {
      const text = JSON.stringify(body);
      expect(text).not.toMatch(/csrf|cookie|token|password|secret|otp|"code"|"state"|"nonce"/i);
    }
    expect(contextSelection.data.sessionHandle).toBe("PUBLIC-TEST-PLACEHOLDER-NOT-A-SESSION-HANDLE");
  });

  it("accepts the session before context selection without principal or operational access", () => {
    const session = accepted(bffEnvelopeSchema(partnerSessionSchema).safeParse(sessionBefore), "session-before-selection").data;
    expect(session).toEqual(sessionBefore.data);
    expect(session.operationalAccess).toBe(false);
  });

  it("accepts the session after context selection while keeping operational access false", () => {
    const session = accepted(bffEnvelopeSchema(partnerSessionSchema).safeParse(sessionAfter), "session-after-selection").data;
    expect(session).toEqual(sessionAfter.data);
    expect(session.operationalAccess).toBe(false);
    expect(session.principal?.platformAdmin).toBe(false);
    expect(session.principal?.organizationId).toBe(session.context?.organizationId);
  });

  it("accepts actual entitlements without granting runtime capability", () => {
    const parsed = accepted(bffEnvelopeSchema(partnerEntitlementsSchema).safeParse(entitlements), "entitlements").data;
    expect(parsed).toEqual(entitlements.data);
    expectNoRuntimeCapability(parsed);
  });

  it("accepts actual context selection entitlements without granting runtime capability", () => {
    const parsed = accepted(bffEnvelopeSchema(contextSelectionSchema).safeParse(contextSelection), "context-selection").data;
    expect(parsed.entitlements).toEqual(contextSelection.data.entitlements);
    expectNoRuntimeCapability(parsed.entitlements);
  });

  it("records the actual context-options envelope shape mismatch with only issue paths", () => {
    // Backend returns ApiResponse<List<ContextOption>>; the frontend BFF contract expects { items }.
    // A separately reviewed production fix owns this; the schema is not relaxed here.
    const result = bffEnvelopeSchema(partnerContextOptionsSchema).safeParse(contextOptions);
    const issues = result.success ? [] : issuePaths(result.error.issues);
    console.log("Authenticated context-options schema issues:", JSON.stringify(issues));
    expect(issues).toEqual([{ path: "data", code: "invalid_type" }]);
    expect(Array.isArray(contextOptions.data)).toBe(true);
    expect(partnerContextOptionsSchema.safeParse({ items: contextOptions.data }).success).toBe(true);
  });
});
