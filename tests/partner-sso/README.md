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

- Backend **31e618d375b4daccb7e6ee41120e70490f716471**, the reviewed readiness-fix
  merge, not latest main or PR head.
- A reviewed immutable public `yashb319/factory1-frontend` commit containing
  this harness; pin its full SHA in the backend workflow, not arbitrary input.

From the frontend checkout, after `actions/setup-node` and `actions/setup-java`:

```sh
npm ci --ignore-scripts --no-audit --no-fund
sudo apt-get update -qq
sudo apt-get install -y -qq libnss3-tools
export BROWSER_TOOLS="$RUNNER_TEMP/browser-tools"
export PLAYWRIGHT_BROWSERS_PATH="$BROWSER_TOOLS/browsers"
npm install --prefix "$BROWSER_TOOLS" --ignore-scripts --no-audit --no-fund @playwright/test@1.58.2
node "$BROWSER_TOOLS/node_modules/@playwright/test/cli.js" install --with-deps chromium
# Persist both paths across workflow steps before invoking the runner.
echo "BROWSER_TOOLS=$BROWSER_TOOLS" >> "$GITHUB_ENV"
echo "PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH" >> "$GITHUB_ENV"
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
Before any users, firewall rules or services exist, the runner resolves the
seeder's surefire JUnit Platform provider online with the fixture environment
unset (the test is skipped by its environment guard), then repeats it offline so
a missing artifact fails in seconds; the real seeder step stays offline (`-o`).
Playwright output (including `.last-run.json`) lives under a browser-owned
`$WORK/playwright` parent so Playwright can remove and recreate its output
directory. The line reporter writes to stdout; no HTML report is generated.
Writable browser state and `.next` are checked before services start. Failure
logs are sanitized into the private job log before privileged cleanup removes
the temporary tree; browser artifacts are not uploaded.
The fixed fixture password and ten-minute OTP belong only to the disposable test
account `partner-sso-e2e@example.test`. There is no email request or OTP bypass.
Outbound schedulers are disabled, SMTP points to loopback port 9, dedicated backend/frontend browser runtime identities are firewalled against all
non-loopback egress while the Actions runner retains its control connection. Photo storage
and third-party credentials are absent from the backend's clean environment.
The backend's storefront, edge token and trusted proxy settings use exact Spring
command-line property names (`factory1.partner-saas.*`), not inferred environment
bindings. After seeding, an HTTPS preflight requires public storefront HTTP 200
with the ephemeral edge token and HTTP 421 with an invalid token. Only statuses
are logged; request headers and response bodies are never printed.

Restricted checkout/tool/temp ancestors (including `/home/runner`) receive only
temporary `o+x` traversal permission, with their exact original modes restored
on exit before test-user cleanup. Backend HOME and JVM temp storage, and browser
HOME/XDG/npm/temp storage, are explicitly writable test-user-owned directories.
Cross-UID readability/executability checks run before services start. The public
harness-check job also reproduces restricted ancestors and verifies exact mode
restoration with a different UID.

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
runtime logs are uploaded as artifacts. On failure, bounded sanitized backend,
frontend and proxy diagnostics are printed to the private backend job log before
temporary state is removed; credential-bearing lines and opaque values are
redacted. Cleanup preserves the failing exit status. Runtime material is
temporary and process cleanup is trapped. Record the private backend run URL and both exact tested SHAs in the PR;
never label discovery or a skipped/blocked run as integration success.

SMTP remains pointed at an unused loopback port. Its Actuator mail health
indicator is disabled only for this harness so intentional email isolation does
not make the readiness endpoint return 503. On readiness failure the runner
prints the sanitized HTTPS health response and HTTP status, trying the readiness
health group if the response body is empty. Backend diagnostics include up to 40
startup/error/database highlights before the final 80 log lines. Network policy
and application behavior are unchanged.

## Sign-in readiness diagnostics

Before waiting for the Sign in link, the scenario probes the public storefront
bootstrap and anonymous BFF session from the browser and logs only HTTP status,
error code, schema version and boolean capabilities. It fails fast unless the
storefront advertises `sso=true` and `operationalAccess=false`. On failure the
final page origin/path, title and a bounded ARIA snapshot are written under the
browser-owned output directory and printed through the existing sanitizer before
cleanup. No artifacts are uploaded.

The pinned backend advertises SSO only after validating enabled confidential
configuration, a current registered client binding and exact callback, and an
ACTIVE product/partner with a VERIFIED, routing/TLS-READY, unexpired domain.
The frontend hides Sign in and `/auth/start` returns `SSO_DISABLED` when that
gate is not met. This replaces the original `c9bdbda` pin's unconditional
`sso=false` capability; the harness does not bypass readiness. Runtime remains
disabled, and bootstrap operational access and checkout remain false.
