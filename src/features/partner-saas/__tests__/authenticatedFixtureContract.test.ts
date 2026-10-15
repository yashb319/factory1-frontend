import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  bffEnvelopeSchema,
  contextSelectionSchema,
  partnerContextOptionsSchema,
  partnerEntitlementsSchema,
  partnerSessionSchema,
} from "../auth/contracts";
import contextOptions from "./fixtures/context-options.json";
import contextSelection from "./fixtures/context-selection.json";
import entitlements from "./fixtures/entitlements.json";
import sessionAfter from "./fixtures/session-after-selection.json";
import sessionBefore from "./fixtures/session-before-selection.json";

// Byte-identical copies of backend factory1-backend@641d07f src/test/resources/partner-sso (#137),
// exported from actual HTTP serialization of backend application source 760c43a.
function issues(result: z.ZodSafeParseResult<unknown>) {
  return result.success ? [] : result.error.issues.map(({ path, code }) => ({ path: path.join("."), code }));
}

function parse<T extends z.ZodType>(schema: T, body: unknown, label: string) {
  const result = bffEnvelopeSchema(schema).safeParse(body);
  if (!result.success) console.log(`Authenticated ${label} schema issues:`, JSON.stringify(issues(result)));
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(`Serialized ${label} was rejected`);
  return result.data.data;
}

describe("actual serialized authenticated BFF DTOs", () => {
  it("accepts the session before context selection without principal or operational access", () => {
    const session = parse(partnerSessionSchema, sessionBefore, "session-before-selection");
    expect(session).toEqual(sessionBefore.data);
    expect(session.operationalAccess).toBe(false);
  });

  it("accepts the session after context selection while keeping operational access false", () => {
    const session = parse(partnerSessionSchema, sessionAfter, "session-after-selection");
    expect(session).toEqual(sessionAfter.data);
    expect(session.operationalAccess).toBe(false);
    expect(session.principal?.platformAdmin).toBe(false);
    expect(session.principal?.organizationId).toBe(session.context?.organizationId);
  });

  it.each([
    ["entitlements", () => [entitlements.data, parse(partnerEntitlementsSchema, entitlements, "entitlements")] as const],
    ["context-selection", () => [contextSelection.data.entitlements,
      parse(contextSelectionSchema, contextSelection, "context-selection").entitlements] as const],
  ])("accepts %s entitlements without granting runtime capability", (_label, load) => {
    const [raw, parsed] = load();
    expect(parsed).toEqual(raw);
    expect(parsed.operationalAccess).toBe(false);
    expect(parsed.ready).toBe(false);
    expect(parsed.runtimeRoutes).toEqual([]);
    expect(parsed.moduleDecisions.every((decision) => !decision.enabled)).toBe(true);
  });

  it("records the actual context-options envelope shape mismatch with only issue paths", () => {
    // Backend PartnerSsoBffController returns ApiResponse<List<ContextOption>>; the frontend
    // production BFF contract expects { items: [...] }. This is a cross-repo defect that needs a
    // reviewed production fix; the schema is intentionally not relaxed in this test-only change.
    const result = bffEnvelopeSchema(partnerContextOptionsSchema).safeParse(contextOptions);
    console.log("Authenticated context-options schema issues:", JSON.stringify(issues(result)));
    expect(issues(result)).toEqual([{ path: "data", code: "invalid_type" }]);
    expect(Array.isArray(contextOptions.data)).toBe(true);
    expect(partnerContextOptionsSchema.safeParse({ items: contextOptions.data }).success).toBe(true);
  });
});
