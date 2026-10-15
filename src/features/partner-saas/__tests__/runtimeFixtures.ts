import { authBootstrapSchema } from "../auth/contracts";

export const factoryId = "55555555-5555-4555-8555-555555555555";
export const productId = "22222222-2222-4222-8222-222222222222";
export const generation = "77777777-7777-4777-8777-777777777777";
export const runtimeBootstrap = () => authBootstrapSchema.parse({
  session: {
    authenticated: true, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    context: {
      organizationId: factoryId, organizationName: "Factory One", productId, productName: "Acme HR",
      domainId: "44444444-4444-4444-8444-444444444444", hostname: "hr.example.test",
    },
    operationalAccess: true, contextGeneration: generation,
    principal: {
      id: "33333333-3333-4333-8333-333333333333", name: "Factory Owner", email: "owner@example.test",
      role: "OWNER", status: "ACTIVE", organizationId: factoryId, organizationStatus: "ACTIVE", platformAdmin: false,
    },
  },
  contextOptions: {
    items: [{
      organizationId: factoryId, label: "Factory One", productId, productName: "Acme HR",
      domainId: "44444444-4444-4444-8444-444444444444", hostname: "hr.example.test",
    }],
  },
  entitlements: {
    organizationId: factoryId, productId, modules: ["inventory"], ready: true, operationalAccess: true,
    role: "OWNER", contextGeneration: generation,
    runtimeRoutes: [
      { method: "GET", path: "/api/inventory/items" }, { method: "POST", path: "/api/inventory/items" },
      { method: "GET", path: "/api/inventory/items/{id}" }, { method: "PUT", path: "/api/inventory/items/{id}" },
      { method: "DELETE", path: "/api/inventory/items/{id}" },
    ],
  },
  csrfToken: "C".repeat(43),
});
