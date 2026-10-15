import { describe, expect, it } from "vitest";
import { envelopeSchema, storefrontSchema } from "../contracts";

function fixture(partnerId: string, productId: string) {
  return {
    success: true,
    data: {
      schemaVersion: 2,
      storefront: {
        partnerId, productId, canonicalOrigin: "https://product-a.example.com",
        displayName: "Product A", logoUrl: null, faviconUrl: null,
        primaryColorHex: null, accentColorHex: null,
      },
      capabilities: { operationalAccess: false, sso: true, checkout: false },
    },
  };
}

describe("hosted backend fixture UUID contract", () => {
  it("rejects version-zero/variant-zero fixture IDs with only UUID issue paths", () => {
    const result = envelopeSchema(storefrontSchema).safeParse(fixture(
      "70000000-0000-0000-0000-000000000013",
      "70000000-0000-0000-0000-000000000020",
    ));
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Invalid fixture UUIDs were accepted");
    const issues = result.error.issues.map(({ path, code }) => ({ path: path.join("."), code }));
    console.log("Hosted fixture schema issues:", JSON.stringify(issues));
    expect(issues).toEqual([
      { path: "data.storefront.partnerId", code: "invalid_format" },
      { path: "data.storefront.productId", code: "invalid_format" },
    ]);
  });

  it("accepts the same public fixture shape with RFC-valid v4 IDs", () => {
    expect(envelopeSchema(storefrontSchema).safeParse(fixture(
      "70000000-0000-4000-8000-000000000013",
      "70000000-0000-4000-8000-000000000020",
    )).success).toBe(true);
  });
});
