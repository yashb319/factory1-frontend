import { describe, expect, it } from "vitest";
import { canonicalHost, directHost } from "../host";

describe("trusted host authority parsing", () => {
  it("normalizes case without accepting a URL or broad suffix", () => {
    expect(canonicalHost("Product.Example.COM")).toBe("product.example.com");
    expect(canonicalHost("localhost:3000")).toBe("localhost:3000");
    expect(directHost("factory1.in", "factory1.in,www.factory1.in")).toBe(true);
    expect(directHost("attackerfactory1.in", "factory1.in")).toBe(false);
    expect(directHost("factory1.in.evil.test", "factory1.in")).toBe(false);
    expect(directHost("factory1.in:8080", "factory1.in")).toBe(false);
  });
  it.each([null, "", "example.com,evil.test", "https://example.com", "example.com/path", "a..com",
    "a.com\r\nx-host: evil", "a.com.", "-bad.com", "bad-.com", "a.com:0", "a.com:65536",
    "user@a.com", "*.a.com", "a%2ecom", "a\\com", "a.com?tenant=b"])("rejects ambiguous authority %s", (host) => {
    expect(canonicalHost(host)).toBeNull();
  });
  it("requires an exact explicit direct-host allowlist", () => {
    expect(directHost("unknown.test", "")).toBe(false);
    expect(directHost("preview.vercel.app", "factory1.in")).toBe(false);
    expect(directHost(null, "factory1.in")).toBe(false);
  });
});
