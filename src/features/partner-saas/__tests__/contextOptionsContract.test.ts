import { describe, expect, it } from "vitest";
import {
  bffEnvelopeSchema,
  partnerContextOptionsSchema,
  upstreamContextOptionsSchema,
} from "../auth/contracts";
import contextOptions from "./fixtures/context-options.json";

// Byte-identical copy of factory1-backend src/test/resources/partner-sso/context-options.json at
// test-only merge cbda4a9 (#137): actual HTTP serialization of ApiResponse<List<ContextOption>>.
describe("backend context-options backchannel contract", () => {
  it("accepts the exact serialized backend list and maps it to the unchanged browser shape", () => {
    const upstream = bffEnvelopeSchema(upstreamContextOptionsSchema).safeParse(contextOptions);
    expect(upstream.success).toBe(true);
    if (!upstream.success) throw new Error("Serialized context options were rejected");
    expect(upstream.data.data).toEqual(contextOptions.data);

    const browser = partnerContextOptionsSchema.parse({ items: upstream.data.data });
    expect(browser).toEqual({ items: contextOptions.data });
    expect(JSON.stringify(browser)).not.toMatch(/csrf|cookie|token|password|secret|sessionHandle|operationalAccess/i);
  });

  it("does not accept the browser object shape, unknown option fields or unbounded lists upstream", () => {
    const [first] = contextOptions.data;
    expect(upstreamContextOptionsSchema.safeParse({ items: contextOptions.data }).success).toBe(false);
    expect(upstreamContextOptionsSchema.safeParse([{ ...first, operationalAccess: true }]).success).toBe(false);
    expect(upstreamContextOptionsSchema.safeParse(Array.from({ length: 501 }, () => first)).success).toBe(false);
  });

  it("keeps the browser-facing contract strict and object-shaped", () => {
    expect(partnerContextOptionsSchema.safeParse(contextOptions.data).success).toBe(false);
    expect(partnerContextOptionsSchema.safeParse({ items: contextOptions.data, extra: true }).success).toBe(false);
  });
});
