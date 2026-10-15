const assert = require("node:assert/strict");

// Strict browser-facing /auth/session shape for reviewed main (#117/#118/#119) with runtime disabled.
// Shared by the hosted Playwright scenario and the exact backend-sample Vitest regression.
const keys = (value) => Object.keys(value).sort();
const CONTEXT_KEYS = ["domainId", "hostname", "organizationId", "organizationName", "productId", "productName"];
const OPTION_KEYS = ["domainId", "hostname", "label", "organizationId", "productId", "productName"];
const SESSION_KEYS = ["authenticated", "context", "contextGeneration", "expiresAt", "operationalAccess", "principal"];
const PRINCIPAL_KEYS = ["email", "id", "name", "organizationId", "organizationStatus", "platformAdmin", "role", "status"];
const ENTITLEMENT_KEYS = ["contextGeneration", "moduleDecisions", "modules", "operationalAccess", "organizationId",
  "productId", "ready", "role", "runtimeRoutes"];
const OPTIONAL_ENTITLEMENT_KEYS = ["runtimeCoverage"];
const FORBIDDEN = /sessionHandle|access_token|refresh_token|id_token|domainSessionToken|clientSecret|password|"code"|"state"|"nonce"/i;

function assertBootstrapPayload(body, { productId, hostname, optionCount, forbiddenValues = [] }) {
  assert.deepEqual(keys(body), ["data", "message", "success"]);
  assert.equal(body.success, true);
  const data = body.data;
  assert.deepEqual(keys(data), ["contextOptions", "csrfToken", "entitlements", "session"]);
  assert.ok(typeof data.csrfToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(data.csrfToken), "invalid CSRF token format");

  const { session, contextOptions, entitlements } = data;
  assert.deepEqual(keys(session), SESSION_KEYS);
  assert.equal(session.authenticated, true);
  assert.equal(session.operationalAccess, false);

  assert.deepEqual(keys(contextOptions), ["items"]);
  assert.equal(contextOptions.items.length, optionCount);
  for (const item of contextOptions.items) {
    assert.deepEqual(keys(item), OPTION_KEYS);
    assert.equal(item.productId, productId);
    assert.equal(item.hostname, hostname);
  }

  if (session.context === null) {
    assert.equal(session.principal, null);
    assert.equal(session.contextGeneration, null);
    assert.equal(entitlements, null);
  } else {
    assert.deepEqual(keys(session.context), CONTEXT_KEYS);
    assert.equal(session.context.productId, productId);
    assert.equal(session.context.hostname, hostname);
    assert.deepEqual(keys(session.principal), PRINCIPAL_KEYS);
    assert.equal(session.principal.platformAdmin, false);
    assert.equal(session.principal.status, "ACTIVE");
    assert.equal(session.principal.organizationId, session.context.organizationId);
    assert.equal(typeof session.contextGeneration, "string");

    const entitlementKeys = keys(entitlements);
    for (const key of ENTITLEMENT_KEYS) assert.ok(entitlementKeys.includes(key), `missing entitlements.${key}`);
    for (const key of entitlementKeys) {
      assert.ok(ENTITLEMENT_KEYS.includes(key) || OPTIONAL_ENTITLEMENT_KEYS.includes(key), `unexpected entitlements.${key}`);
    }
    assert.equal(entitlements.productId, productId);
    assert.equal(entitlements.organizationId, session.context.organizationId);
    assert.equal(entitlements.contextGeneration, session.contextGeneration);
    // Pinned backend sets operationalAccess and ready from the same runtime gate, which stays disabled.
    assert.equal(entitlements.operationalAccess, false);
    assert.equal(entitlements.ready, false);
    assert.deepEqual(entitlements.runtimeRoutes, []);
    for (const decision of entitlements.moduleDecisions) {
      assert.deepEqual(keys(decision), ["enabled", "key", "reasons"]);
      assert.equal(decision.enabled, false);
    }
  }

  const { csrfToken: _csrf, ...withoutCsrf } = data;
  const serialized = JSON.stringify(withoutCsrf);
  assert.ok(!FORBIDDEN.test(serialized), "bootstrap exposed a credential-bearing field");
  for (const value of forbiddenValues) {
    if (value) assert.ok(!JSON.stringify(body).includes(value), "bootstrap exposed an opaque session value");
  }
  return data;
}

module.exports = { assertBootstrapPayload };
