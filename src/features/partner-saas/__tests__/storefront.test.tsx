import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FoundationStorefront } from "../components/FoundationStorefront";
import { allowedAssetUrl, storefrontSchema } from "../contracts";
import { usesLegacyHost } from "../host";
import { storefront } from "./fixtures";
import { isPartnerAuthRuntimeReady } from "../auth/runtime";

const request = vi.hoisted(() => ({ host: "unknown.example.test" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: request.host }) }));
import { StorefrontBoundary } from "../StorefrontBoundary";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("storefront identity and readiness", () => {
  it.each(["loading", "disabled", "unavailable"] as const)("keeps %s neutral without login/signup or default branding", (state) => {
    render(<FoundationStorefront state={state} />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /login|sign.?up|start free/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Factory1/)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders product identity but never implies operational access or SSO", () => {
    render(<FoundationStorefront storefront={storefront} />);
    expect(screen.getByRole("heading", { name: "Acme HR" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Sign-in and factory operations are not enabled");
    expect(screen.queryByRole("button", { name: /sign in|checkout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(storefrontSchema.safeParse({ ...storefront, capabilities: { operationalAccess: true, sso: true, checkout: false } }).success).toBe(true);
    expect(storefrontSchema.safeParse({ ...storefront, capabilities: { operationalAccess: false, sso: true, checkout: false } }).success).toBe(true);
  });

  it("shows central sign-in after the BFF confirms there is no active session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false, code: "AUTH_REQUIRED", message: "Sign in", data: null,
    }), { status: 401 })));
    render(<FoundationStorefront
      storefront={{ ...storefront, capabilities: { operationalAccess: false, sso: true, checkout: false } }}
      signInEnabled
    />);
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/start");
    expect(screen.getByRole("status")).toHaveTextContent("Operational access remains unavailable");
  });

  it("fails closed until enabled OAuth server configuration is complete and HTTPS-only", () => {
    const configured = {
      enabled: true,
      backendOrigin: "https://backend.example.test",
      clientId: "partner-bff",
      clientSecret: "server-only-secret",
      csrfSecret: "A".repeat(43),
    };
    expect(isPartnerAuthRuntimeReady({ ...configured, enabled: false })).toBe(false);
    expect(isPartnerAuthRuntimeReady({ ...configured, clientSecret: undefined })).toBe(false);
    expect(isPartnerAuthRuntimeReady({ ...configured, csrfSecret: undefined })).toBe(false);
    expect(isPartnerAuthRuntimeReady({ ...configured, csrfSecret: "short" })).toBe(false);
    expect(isPartnerAuthRuntimeReady({ ...configured, backendOrigin: "http://backend.example.test" })).toBe(false);
    expect(isPartnerAuthRuntimeReady({ ...configured, backendOrigin: "https://backend.example.test/path" })).toBe(false);
    expect(isPartnerAuthRuntimeReady(configured)).toBe(true);
  });

  it("keeps only explicitly allowlisted hosts legacy when the boundary is enabled", () => {
    const config = { boundaryEnabled: true, directHosts: "factory1.in,www.factory1.in", legacyHosts: "legacy.example.test" };
    expect(usesLegacyHost("factory1.in", config)).toBe(true);
    expect(usesLegacyHost("legacy.example.test", config)).toBe(true);
    expect(usesLegacyHost("unknown.example.test", config)).toBe(false);
    expect(usesLegacyHost("factory1.in.attacker.test", config)).toBe(false);
    expect(usesLegacyHost("unknown.example.test", { ...config, boundaryEnabled: false })).toBe(true);
  });

  it("never mounts legacy children on an unknown v2 host even with bootstrap disabled", async () => {
    vi.stubEnv("PARTNER_SAAS_HOST_BOUNDARY_ENABLED", "true");
    vi.stubEnv("PARTNER_SAAS_STOREFRONT_ENABLED", "false");
    vi.stubEnv("PARTNER_SAAS_DIRECT_HOSTS", "factory1.in");
    vi.stubGlobal("fetch", vi.fn());
    request.host = "unknown.example.test";
    render(await StorefrontBoundary({ children: <p>Legacy factory app</p> }));
    expect(screen.queryByText("Legacy factory app")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Storefront is not enabled" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires explicit legacy-host allowlists once storefront rollout is enabled", async () => {
    vi.stubEnv("PARTNER_SAAS_HOST_BOUNDARY_ENABLED", "false");
    vi.stubEnv("PARTNER_SAAS_STOREFRONT_ENABLED", "true");
    vi.stubEnv("PARTNER_SAAS_DIRECT_HOSTS", "factory1.in");
    vi.stubGlobal("fetch", vi.fn());
    request.host = "new-product.example.test";
    render(await StorefrontBoundary({ children: <p>Legacy factory app</p> }));
    expect(screen.queryByText("Legacy factory app")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Storefront is not enabled" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves the direct site without issuing a v2 bootstrap request", async () => {
    vi.stubEnv("PARTNER_SAAS_HOST_BOUNDARY_ENABLED", "true");
    vi.stubEnv("PARTNER_SAAS_DIRECT_HOSTS", "factory1.in");
    vi.stubGlobal("fetch", vi.fn());
    request.host = "factory1.in";
    render(await StorefrontBoundary({ children: <p>Legacy factory app</p> }));
    expect(screen.getByText("Legacy factory app")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not show sign-in when backend SSO capability is disabled", async () => {
    vi.stubEnv("PARTNER_SAAS_HOST_BOUNDARY_ENABLED", "true");
    vi.stubEnv("PARTNER_SAAS_DIRECT_HOSTS", "factory1.in");
    vi.stubEnv("PARTNER_SAAS_STOREFRONT_ENABLED", "true");
    vi.stubEnv("PARTNER_SAAS_BACKEND_ORIGIN", "https://backend.example.test");
    vi.stubEnv("PARTNER_SAAS_EDGE_TOKEN", "test-only-edge-key-not-a-real-secret-123456");
    vi.stubEnv("PARTNER_SAAS_ASSET_HOSTS", "");
    request.host = "hr.example.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: storefront,
    }))));

    render(await StorefrontBoundary({ children: <p>Legacy factory app</p> }));
    expect(screen.getByRole("heading", { name: "Acme HR" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it.each(["http://assets.test/a.png", "https://evil.test/a.png", "https://assets.test.evil/a.png",
    "https://u:p@assets.test/a.png", "https://assets.test:444/a.png", "https://assets.test/a.png?token=x",
    "https://assets.test/a.svg#x", "https://assets.test/a.png?", "https://assets.test/a.png#",
    "https://@assets.test/a.png", "data:image/png;base64,test", "/tenant-private-file"])("rejects unapproved asset %s", (url) => {
    expect(allowedAssetUrl(url, "assets.test")).toBe(false);
  });

  it("accepts only exact configured HTTPS asset hosts and empty branding assets", () => {
    expect(allowedAssetUrl("https://assets.test/public/logo.png", "assets.test")).toBe(true);
    expect(allowedAssetUrl(null, "")).toBe(true);
    expect(allowedAssetUrl("https://assets.test/logo.png", "")).toBe(false);
  });
});
