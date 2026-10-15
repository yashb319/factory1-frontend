# Hosted Partner SSO browser integration

This is a test-only follow-up to frontend #115. It changes no production gates,
routes or rollout defaults. A green frontend **harness checks** job is only
syntax/discovery/type/regression evidence, not a browser integration pass.
Actual execution belongs in the private backend's manually dispatched workflow:
its `GITHUB_TOKEN` can read its own source and the pinned public frontend without
a personal token, frontend repository secret, or private-source upload.

## Backend-owned workflow invocation contract

Use a disposable GitHub-hosted `ubuntu-24.04` runner, Node 22, Temurin Java 21,
and a fresh `postgres:14.22` service, exposed at `127.0.0.1:5432`, with database
`factory1_e2e`, user `postgres`, password `disposable-e2e-only`.
Use `contents: read`, `persist-credentials: false`, and separately checkout:

- Backend **c9bdbda834fadace0cf94e2a6850edea0bea0d87**, not latest main or PR head.
- A reviewed immutable public `yashb319/factory1-frontend` commit containing
  this harness; pin its full SHA in the backend workflow, not arbitrary input.

From the frontend checkout, after `actions/setup-node` and `actions/setup-java`:

```sh
npm ci --ignore-scripts --no-audit --no-fund
sudo apt-get update -qq
sudo apt-get install -y -qq libnss3-tools
export BROWSER_TOOLS="$RUNNER_TEMP/browser-tools"
npm install --prefix "$BROWSER_TOOLS" --ignore-scripts --no-audit --no-fund @playwright/test@1.58.2
node "$BROWSER_TOOLS/node_modules/@playwright/test/cli.js" install --with-deps chromium
bash tests/partner-sso/run-hosted.sh /absolute/path/to/backend-checkout
```

`run-hosted.sh` verifies the exact backend commit, builds both applications in CI,
creates ephemeral client/encryption/JWT/CSRF/signing material, creates a one-day
test CA and server certificate, and trusts that CA in Linux, Node and Chromium
NSS. HTTPS verification remains enabled; there is no `ignoreHTTPSErrors` or
TLS-verification bypass. Loopback-only TLS port 443 routes `central.test` to
backend HTTP 8080 and `product-a.test` / `product-b.test` to frontend HTTP 3000.
The proxy overwrites forwarding metadata; all authorities have exact hostnames,
no wildcard callback, shared cookie domain, or public DNS dependence.

The backend uses its supported `prod` configuration bindings, Flyway migrations,
then exactly `PartnerSsoE2eFixtureSeederTest` with `PARTNER_SSO_E2E_FIXTURES=true`
and its localhost / database-name-containing-`e2e` guard. No SQL is duplicated.
The fixed fixture password and ten-minute OTP belong only to the disposable test
account `partner-sso-e2e@example.test`. There is no email request or OTP bypass.
Outbound schedulers are disabled, SMTP points to loopback port 9, and a dedicated
backend runtime user is firewalled against all non-loopback egress. Photo storage
and third-party credentials are absent from the backend's clean environment.

## Assertions and limits

One real Chromium scenario follows the central sign-in + password/OTP OAuth
navigation, checks PKCE and callback origin/state, Secure / HttpOnly / host-only /
SameSite cookies and JavaScript inaccessibility, callback relocation/replay
rejection, session bootstrap, factory selection/switch handle and CSRF rotation,
old-handle revocation, unknown-context and missing/stale/cross-site CSRF denial,
second-product isolation (including a deliberately transplanted handle), domain
logout, global revocation, and return to central login. Every selected context
retains `operationalAccess=false`. There are no route mocks, fake backend
responses, cookie injection for successful login, or in-memory database adapters.

The fixture's ACTIVE / VERIFIED / READY-routing / READY-TLS rows are authorized
test preconditions for the local HTTPS proxy, **not production provisioning
proof**. This browser scenario does not prove public DNS ownership challenges,
external certificate issuance/renewal, real email delivery, production rollout,
operational workspace enforcement, or release readiness. Controlled DNS verifier
coverage remains in the pinned backend's `PartnerSsoDnsOwnershipTest`.

No traces, storage state, video, screenshots, raw HTTP dumps, backend source or
runtime logs are uploaded. Runtime material is temporary and process cleanup is
trapped. Record the private backend run URL and both exact tested SHAs in the PR;
never label discovery or a skipped/blocked run as integration success.
