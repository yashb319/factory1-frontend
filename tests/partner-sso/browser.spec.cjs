const { test, expect } = require("@playwright/test");

const A = "https://product-a.test";
const B = "https://product-b.test";
const CENTRAL = "https://central.test";
const SESSION = "__Host-factory1_session";
const STATE = "__Host-factory1_oauth_state";
const HOME = "70000000-0000-0000-0000-000000000010";
const SECOND = "70000000-0000-0000-0000-000000000011";
const PRODUCT_A = "70000000-0000-0000-0000-000000000020";
const PRODUCT_B = "70000000-0000-0000-0000-000000000021";

function mask(value) {
  if (process.env.GITHUB_ACTIONS === "true" && value) console.log(`::add-mask::${value}`);
}

async function cookie(context, origin, name = SESSION) {
  const cookies = (await context.cookies(origin)).filter((item) => item.name === name);
  expect(cookies.length).toBe(1);
  const item = cookies[0];
  mask(item.value);
  expect(item.domain).toBe(new URL(origin).hostname);
  expect(item.path).toBe("/");
  expect(item.secure).toBe(true);
  expect(item.httpOnly).toBe(true);
  expect(item.sameSite).toBe("Lax");
  expect(item.expires).toBeGreaterThan(Date.now() / 1000);
  return item;
}

async function bootstrap(page, productId) {
  const result = await page.evaluate(async () => {
    const response = await fetch("/auth/session", { cache: "no-store" });
    return { status: response.status, cache: response.headers.get("cache-control"), body: await response.json() };
  });
  expect(result.status).toBe(200);
  expect(result.cache).toContain("no-store");
  expect(Object.keys(result.body).sort()).toEqual(["data", "message", "success"]);
  const data = result.body.data;
  mask(data.csrfToken);
  expect(Object.keys(data).sort()).toEqual(["contextOptions", "csrfToken", "entitlements", "session"]);
  expect(Object.keys(data.session).sort()).toEqual(["authenticated", "context", "expiresAt", "operationalAccess"]);
  expect(data.session.authenticated).toBe(true);
  expect(data.session.operationalAccess).toBe(false);
  expect(data.contextOptions.items.length).toBe(2);
  for (const item of data.contextOptions.items) {
    expect(item.productId).toBe(productId);
    expect(item.hostname).toBe(new URL(page.url()).hostname);
  }
  if (data.entitlements) expect(data.entitlements.operationalAccess).toBe(false);
  expect(await page.evaluate(() => document.cookie.includes("__Host-factory1_"))).toBe(false);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  return data;
}

async function mutation(page, path, body, csrf) {
  return page.evaluate(async ({ path, body, csrf }) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(csrf ? { "X-CSRF-Token": csrf } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }, { path, body, csrf });
}

async function replayStatus(browser, savedCookie, origin) {
  const isolated = await browser.newContext();
  try {
    await isolated.addCookies([savedCookie]);
    const page = await isolated.newPage();
    const response = await page.goto(`${origin}/auth/session`);
    return response.status();
  } finally {
    await isolated.close();
  }
}

test("real HTTPS OAuth, host cookies, context rotation, CSRF and two-product revocation", async ({ page, context, browser }) => {
  const authorizationRequests = [];
  let callback;
  page.on("request", (request) => {
    const url = new URL(request.url());
    for (const key of ["code", "state", "nonce"]) mask(url.searchParams.get(key));
    if (url.origin === CENTRAL && url.pathname === "/oauth2/authorize") authorizationRequests.push(url);
    if (url.origin === A && url.pathname === "/auth/callback") callback = url;
  });

  await page.goto(A);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to Factory1" })).toBeVisible();
  expect(new URL(page.url()).origin).toBe(CENTRAL);
  expect(authorizationRequests.length).toBeGreaterThan(0);
  const authorization = authorizationRequests[0];
  expect(authorization.searchParams.get("redirect_uri")).toBe(`${A}/auth/callback`);
  expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
  expect(authorization.searchParams.has("code_challenge")).toBe(true);
  expect(authorization.searchParams.has("nonce")).toBe(true);
  const stateCookie = await cookie(context, A, STATE);
  expect(stateCookie.value === authorization.searchParams.get("state")).toBe(true);
  expect((await context.cookies(B)).some((item) => item.name === STATE)).toBe(false);

  await page.getByLabel("Email", { exact: true }).fill("partner-sso-e2e@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Factory1-E2E!Password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Verification code")).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("partner-sso-e2e@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Factory1-E2E!Password-2026");
  await page.getByLabel("Verification code").fill("482619");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${A}/`);
  await expect(page.getByLabel("Choose an authorized factory")).toBeVisible();
  await cookie(context, CENTRAL, "__Host-factory1_central_auth");
  const initial = await cookie(context, A);
  expect((await context.cookies(A)).some((item) => item.name === STATE)).toBe(false);
  expect((await context.cookies(B)).some((item) => item.name === SESSION)).toBe(false);
  let data = await bootstrap(page, PRODUCT_A);
  expect(data.session.context).toBeNull();
  expect(Boolean(callback?.searchParams.get("code"))).toBe(true);

  const other = await context.newPage();
  // A real issued callback cannot be moved to another registered product host.
  await other.goto(`${B}/auth/callback${callback.search}`);
  await expect(other).toHaveURL(`${B}/?authError=invalid`);
  expect((await context.cookies(B)).some((item) => item.name === SESSION)).toBe(false);
  await other.goto(callback.toString());
  await expect(other).toHaveURL(`${A}/?authError=invalid`);
  expect((await cookie(context, A)).value === initial.value).toBe(true);

  const noCsrf = await mutation(page, "/auth/context", { organizationId: HOME });
  expect(noCsrf.status).toBe(403);
  expect(noCsrf.body.code).toBe("CSRF_INVALID");
  const invalidContext = await mutation(page, "/auth/context",
    { organizationId: "70000000-0000-0000-0000-000000000099" }, data.csrfToken);
  expect(invalidContext.status).toBe(403);
  expect(invalidContext.body.code).toBe("INVALID_CONTEXT");
  await page.getByLabel("Choose an authorized factory").selectOption(HOME);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Current factory" })).toBeVisible();
  const selected = await cookie(context, A);
  expect(selected.value === initial.value).toBe(false);
  expect(await replayStatus(browser, initial, A)).toBe(401);
  const previousCsrf = data.csrfToken;
  data = await bootstrap(page, PRODUCT_A);
  expect(data.session.context.organizationId).toBe(HOME);
  expect(data.csrfToken === previousCsrf).toBe(false);
  const staleCsrf = await mutation(page, "/auth/context", { organizationId: SECOND }, previousCsrf);
  expect(staleCsrf.status).toBe(403);
  await page.getByLabel("Switch factory", { exact: true }).selectOption(SECOND);
  await page.getByRole("button", { name: "Switch factory", exact: true }).click();
  await expect(page.locator("section[aria-labelledby='active-context-heading']")).toContainText("Partner SSO E2E Shared Factory");
  const switched = await cookie(context, A);
  expect(switched.value === selected.value).toBe(false);
  expect(await replayStatus(browser, selected, A)).toBe(401);
  data = await bootstrap(page, PRODUCT_A);
  expect(data.session.context.organizationId).toBe(SECOND);
  expect(data.entitlements.ready).toBe(true);

  // Deliberately transplant A's opaque handle: B must not bootstrap A's context.
  await context.addCookies([{ ...switched, domain: "product-b.test" }]);
  const transplanted = await other.goto(`${B}/auth/session`);
  expect(transplanted.status()).toBe(502);
  await context.clearCookies({ domain: "product-b.test" });
  await other.goto(B);
  await other.getByRole("link", { name: "Sign in", exact: true }).click();
  await other.waitForURL(`${B}/`);
  await expect(other.getByLabel("Choose an authorized factory")).toBeVisible();
  const bCookie = await cookie(context, B);
  expect(bCookie.value === switched.value).toBe(false);
  await bootstrap(other, PRODUCT_B);

  // Cross-site form submission uses the browser's actual SameSite/Origin rules.
  const crossSiteResponse = other.waitForResponse((response) => response.url() === `${A}/auth/logout`);
  await other.evaluate((origin) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `${origin}/auth/logout`;
    document.body.append(form);
    form.submit();
  }, A);
  expect([401, 403].includes((await crossSiteResponse).status())).toBe(true);
  await other.waitForURL(`${A}/auth/logout`);
  await bootstrap(page, PRODUCT_A);
  expect((await mutation(page, "/auth/logout", { scope: "all" })).status).toBe(403);
  await page.getByRole("button", { name: "Sign out here", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  expect((await context.cookies(A)).some((item) => item.name === SESSION)).toBe(false);
  expect(await replayStatus(browser, switched, A)).toBe(401);
  await other.goto(B);
  await expect(other.getByLabel("Choose an authorized factory")).toBeVisible();
  await bootstrap(other, PRODUCT_B);

  // Central SSO still works after domain-only logout; global logout revokes both.
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${A}/`);
  await expect(page.getByLabel("Choose an authorized factory")).toBeVisible();
  const reauthenticated = await cookie(context, A);
  await other.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
  await expect(other.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  expect((await context.cookies(B)).some((item) => item.name === SESSION)).toBe(false);
  expect(await replayStatus(browser, bCookie, B)).toBe(401);
  expect(await replayStatus(browser, reauthenticated, A)).toBe(401);
  await page.reload();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to Factory1" })).toBeVisible();
});
