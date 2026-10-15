# Partner SaaS frontend foundation and partial runtime

This is an opt-in Partner SaaS frontend layer, **not a complete white-label
SaaS release**. It adds isolated control-plane shells, session cache
boundaries, scoped SaaS product/domain administration, public host readiness,
and a central sign-in/context-selection BFF. **All rollout flags default off.**
The runtime/onboarding tranche adds backend-enforced inventory/employee CRUD,
explicit owner invitations and authorized customer/access administration.
Other existing business modules and commercial flows are not implemented by
this tranche; they must not be represented as release-complete.
No DNS/SSL/email/payment provisioning is performed by the frontend.

The matching backend contract is
[`yashb319/factory1-backend#120`](https://github.com/yashb319/factory1-backend/pull/120),
`docs/partner-saas-foundation-v2.md`. These endpoints require that backend to be
deployed; a frontend flag does not create them.

## Scope and permissions

- Platform and partner pages use administrative chrome without factory dashboard,
  feature, sandbox, AI or walkthrough hooks. Role route decisions block children
  before they mount. Factory navigation and existing feature gates remain separate.
- Credential changes and logout abort running queries/mutations, reset RTK Query,
  reject old-generation responses and remount session-owned UI. Cross-tab identity
  changes invalidate the local session. This cache boundary remains separate from
  the Partner BFF session and context below.
- Existing direct Factory1 and organization-bound white-label screens remain.
  New routes are `/partner/products` and `/saas-admin/partner-products`.
- Partner scopes come only from `GET /api/partner/v2/memberships`, including the
  backend's authorized legacy administrator fallback. Explicit revoked membership
  wins over that fallback. ADMIN/CATALOG may edit; VIEWER/ONBOARDING are read-only.
  ADMIN/ONBOARDING may request customer onboarding when the backend policy
  permits it. Backend authorization remains authoritative on every request.
- Platform partner discovery reuses existing platform-only white-label partners.
  Product/domain APIs use the frozen platform or scoped partner prefixes, typed
  envelopes, pagination and reviewed `expectedVersion` commands.
- Partner customer views expose authorized onboarding metadata only, not factory
  data or customer user/email enumeration. Membership and explicit product grant
  administration is platform-only. Product packages do not activate
  subscriptions or grant user access.
- Operational data will remain factory-owned/shared across products. The BFF
  picker accepts only backend-authorized factory options; the backend must require
  explicit per-user product grants in addition to factory membership and active
  subscription. Only the backend-reviewed executable routes described below
  can mount operational UI.

Product `ACTIVE` means catalog metadata only, not runtime readiness. Product
retirement is terminal. Domain ownership, routing and TLS are displayed separately.
Ownership verification buttons require the backend's explicit verifier capability.
No button sets a domain ACTIVE, routing READY, TLS READY or `verified=true`.
Renewing proof resets readiness; retirement keeps the hostname reserved. Conflicts
and verification failures require visible review, never automatic mutation retries.

## Rollout and host boundary

All flags default off. `.env.example` documents the settings.

| Setting | Purpose |
| --- | --- |
| `NEXT_PUBLIC_PARTNER_SAAS_V2_ENABLED` | Build-time administration/nav opt-in. Does not enable storefront operations. |
| `NEXT_PUBLIC_PARTNER_SAAS_ASSET_HOSTS` | Build-time exact allowed HTTPS asset hosts for editor validation. Match backend policy. |
| `PARTNER_SAAS_HOST_BOUNDARY_ENABLED` | Server opt-in to host classification. Enable and configure allowlists before attaching any new product hosts. |
| `PARTNER_SAAS_DIRECT_HOSTS` | Exact incoming authorities for the unchanged direct Factory1 experience; no suffix or wildcard matching. Include required production/preview/local authorities explicitly. |
| `PARTNER_SAAS_LEGACY_HOSTS` | Explicit existing organization-brand domains retaining legacy behavior during migration. Never use a wildcard to admit new product hosts. |
| `PARTNER_SAAS_STOREFRONT_ENABLED` | Public bootstrap opt-in, independent of host classification. Defaults false. Backend readiness must also be enabled/fulfilled. |
| `PARTNER_SAAS_BACKEND_ORIGIN` | Fixed, credential-free HTTPS backend origin, server-only. Never browser-selected or `NEXT_PUBLIC_*`. |
| `PARTNER_SAAS_EDGE_TOKEN` | Operator-provisioned backend trust token, at least 32 characters, server-only. Never committed, logged or returned to the browser. |
| `PARTNER_SAAS_ASSET_HOSTS` | Server exact HTTPS asset-host allowlist for sanitized public bootstrap responses; match backend policy. |
| `PARTNER_SAAS_OAUTH_CLIENT_ID` | Server-only confidential OAuth client identifier for the BFF. |
| `PARTNER_SAAS_OAUTH_CLIENT_SECRET` | Server-only confidential OAuth client secret; never prefix with `NEXT_PUBLIC_`. |
| `PARTNER_SAAS_CSRF_SECRET` | Independent 32-byte base64url key for same-origin, session-bound CSRF tokens. |

With both the host boundary and storefront rollout off, existing deployments
retain legacy routing/branding; **do not attach new product domains in that
mode**. When storefront rollout is enabled, only explicit direct/legacy
allowlists mount the old application, even if the separate boundary flag was
left off. With the boundary on, the same allowlists apply. All other hosts
receive neutral loading and fail-closed storefront readiness UI, even when
bootstrap rollout is disabled. Unknown/unready/disabled/trust/network/malformed-
response cases never fall back to Factory1 login, signup, pricing or an
operational shell. A valid foundation response renders product identity and an
explicit sign-in-unavailable message, not a simulated login. Central sign-in appears only
when both the verified storefront capability and complete server-only BFF
configuration are ready. The feature stays disabled until the verified issuer,
registered client/callback, backend BFF routes and runtime configuration are
deployed together.

The central issuer owns credential and OTP collection. The storefront BFF uses
the backend's authorization-code/PKCE transaction and exchange endpoints; it
validates the issuer URL and exact callback, and binds the one-time state to a
short-lived host-only HttpOnly cookie. Sign-in never collects passwords or creates
browser access/refresh tokens, or stores bearer credentials in browser storage.
The only browser session value is the backend-issued opaque handle in a
`Secure; HttpOnly; Path=/; SameSite=Lax` `__Host-` cookie with no `Domain`.
Session, context, entitlement, and logout backchannel calls use the fixed HTTPS
backend, confidential client authentication, no forwarded browser cookies or
host/origin headers, and `no-store`.

Context changes require same-origin `Origin`, same-origin fetch metadata when
present, and a session-bound CSRF header. The browser submits only a factory
identifier; backend membership, subscription, and explicit product grants
determine the result. The BFF rechecks storefront identity and context against
the verified product host, and rotates the opaque handle on successful switches.
Domain-local and family logout call backend revocation; if revocation cannot be
confirmed, the local cookie is still cleared and the UI reports that distinction.
Operational access requires the backend storefront capability, session and
entitlements to agree, with active authoritative principal, matching factory,
product, role and context generation, ready entitlements and reviewed routes.
A selected context, frontend flag or displayed module list alone is not
authorization to mount operational routes.

The root host/metadata check is request-scoped even with rollout off, so a
build-time direct-site prerender cannot be reused after runtime host-boundary
configuration changes. This intentionally opts pages out of static prerendering;
it does not add a backend request on allowlisted direct/legacy hosts.

The server-rendered boundary and `GET /api/public/v2/storefront` use the same
proxy helper. They forward only normalized incoming `Host` as
`X-Factory1-Storefront-Host` and the server's `X-Factory1-Edge-Token`. Browser
Authorization, cookies, query `domain`, Forwarded and spoofed trust headers are
not forwarded. Backend ingress must strip untrusted headers and enforce its
verified domain registry, edge secret and optional trusted-proxy addresses.
Hosting must route the genuine incoming Host unchanged; verify this in staging.

Requests use a fixed HTTPS backend, bounded timeout, no credentials, no-store
and no followed redirects. Responses strip cookies, debug/extra fields and raw
upstream errors; canonical host, schema, assets and backend-owned runtime capabilities
must validate. Server failures log only generic status/error names, not trust
tokens. Public responses and callback-free foundation pages are no-store/noindex
as applicable; analytics is not mounted on new product-host readiness pages.

Assets must be approved absolute HTTPS URLs on exact allowed hosts, without
userinfo, query, fragment or nonstandard port. There is no upload, remote-file
proxy, arbitrary HTML/CSS or image sanitization service in this tranche. Use only
operator-trusted public assets; do not expose private tenant file URLs. Theme
colors decorate the readiness page while text/focus contrast remains fixed.

## Runtime/onboarding tranche: architecture and limits

Direct Factory1 customers, including explicitly configured legacy custom
domains, retain the existing application, tenant feature queries, subscriptions
and role gates. Product hosts never mount that application's providers or its
dashboard, legacy bearer storage, AI, walkthrough or cross-module query hooks.
They render a shared context-driven product workspace, not an application
hardcoded per domain. One domain can serve many authorized factories; one
factory can have separate subscriptions to multiple products.

Backend authorization must compute current tenant flags, independently approved
partner resell ceiling, product bundle, optional narrower domain configuration,
factory subscription and explicit user grant/role intersection on every call.
Frontend schemas do not calculate or manufacture these authorities. A module
purchased through a second product is never unioned into the current product.

Session responses add `principal` and `contextGeneration`; entitlements add
`role`, `contextGeneration` and `runtimeRoutes`. Old non-operational responses
remain readable with null principal/generation and empty routes. An operational
response without the enforcement fields fails closed. Inventory requires the
`inventory` effective module; employee CRUD requires `payroll` as a dependency,
**not as evidence that the complete payroll module works**.

`/api/product-runtime/...` is a confidential BFF adapter with an explicit
method/path/role/dependency allowlist matching the backend's frozen runtime
extension contract at `6522bfce0e8b52b932718b0371456105a9dbbf49`
(`docs/partner-runtime-and-onboarding.md` in factory1-backend). UUID identifiers
and attendance dates are typed, not arbitrary path suffixes. The backend's
filtered `runtimeRoutes` must authorize each exact method/template as well.
An explicit disabled `moduleDecisions` entry also denies the frontend surface.

Sidebar and dashboard cards are built from those reviewed route grants, never
from purchased module names alone. Existing module APIs and components run in
an isolated, memory-only RTK Query store per authoritative bootstrap/generation.
Its transport always uses the same-origin BFF; legacy authentication redirects,
bearer preparation and localStorage persistence are never used. Responses
preserve the entire unchanged legacy payload, including inner envelopes, so
existing endpoint transforms remain authoritative. A context/policy/principal
change destroys the old cache and UI, instead of relabeling cached tenant data.

The reused Inventory, Employees, Attendance, Payroll, Suppliers and Customers
pages expose reviewed operations with contextual action guards. Leave reuses
reviewer/type/calendar components without email-derived self-service or balances.
Production reuses order-list, quantity, timeline, audit and BOM-binding components
and reads workflow versions; unreviewed catalog/user lookup/preview dependencies
keep creation, quantity-flow execution, authoring, assignments, workstations and
QR controls unavailable. Billing reuses voucher actions for confirmed post,
cancel and payment operations; voucher creation remains unavailable until its
catalog/settings dependencies are reviewed. Accounting reuses report components
for ledger summaries, trial balance, profit/loss, balance sheet, aging and ledger
drilldown, not accounting authoring/settings. These are bounded module surfaces,
**not full existing-module parity**.

Inventory exports alone use the three exact `/exports/inventory` job routes.
The UI displays PENDING/COMPLETED/DENIED/FAILED, expiry and failure codes, and
downloads only reauthorized, schema-checked JSON (at most 1000 rows, never
truncated) without a persisted local file, bearer or public URL. Status checks
are explicit; mutations are never retried automatically. The backend binds
execution/status/download to the issuing session, tenant, product, domain,
user and context generation. `ACCESS_CHANGED` tears down the workspace;
`EXPORT_NOT_READY`, 410 expiry and 429 limits remain explicit errors.

Mixed dashboards, Tally, AI, public links, bulk import, legacy export/job/file
paths, payslip sharing and e-way remain blocked. The compatibility coverage
marker remains `PARTIAL_TENANT_CRUD`; it does not advertise module completeness.

Every operational request carries the opaque HttpOnly host session and server
credentials only on the server backchannel, plus verified edge host and context
generation. The browser sends only same-origin cookie credentials, the expected
generation and a session-bound CSRF header for every mutation. Missing/stale
generations fail before execution. The adapter disallows arbitrary origins,
paths, tenant-authority query fields, multipart bodies, redirects and browser
bearer headers. JSON mutations are bounded to 64 KiB. UI state is memory-only;
switch/sign-out unmounts and aborts pending requests. Revocation/context mismatch
responses remove the entire operational view. Focus and 30-second revalidation
remove stale UI; the backend checks access on every request.

Onboarding is backend policy-driven and idempotent. Uncertain retries retain the
same payload/key; existing identities require an explicit user ID and subsequent
authenticated acceptance. An email match never creates membership silently.
Factories/subscriptions remain pending platform evidence. Invitations are
delivered only by the backend's configured durable outbox, never by frontend
simulation. New identities activate through product-bound, same-origin BFF
password/CSRF validation; existing identities must sign in as the exact invited
user and explicitly accept. Activation never returns a browser bearer or
automatically signs in. Invitation tokens stay in page memory, are removed from
the address bar, and are not stored or logged. Product pages use no-referrer
metadata and verified canonical branding/assets.

Only the platform may create/update explicit factory memberships or create/revoke
subscription product grants. Expected membership versions prevent blind
overwrites. Partner onboarding/customer pages never mount those hooks or any
factory operational APIs.

### Verification and rollout

The hosted `Partner foundation` workflow runs regression tests, typecheck,
changed-file lint, production build, server-secret browser-bundle scanning and
direct/unknown-host isolation checks. The existing integration session owns the
real browser suite; this tranche does not start a second browser runner.

Before deployment, apply the counterpart backend's additive migrations and
configure the verified domains, confidential client/edge trust, partner approval
and module policies. Never attach existing direct custom domains to the product
registry implicitly. Keep backend runtime disabled until all relevant
authorization and real-browser checks pass. Reverting this frontend tranche
returns product hosts to the prior SSO/readiness UI; it must not remove existing
factory data or undo unrelated authentication/subscription changes.

Full release still requires reviewed authorization adapters and corresponding
existing frontend surfaces for **all** business modules and the full 15-case
acceptance matrix in the authoritative spec.
Commercial checkout, invoices, commission and wholesale remain separate
follow-on scope and must never be simulated as payment success.

### Independent policy administration

Platform-only partner approval/resale ceilings use versioned
`/api/saas-admin/v2/partners/{partnerId}/entitlements`; this is independent of a
reusable product bundle and does not alter direct tenant flags. Domain module
policies use the versioned product/domain `/modules` endpoint: `null` inherits
the product, while `[]` explicitly denies all modules. A domain may only narrow.

Factory subscription entitlement/validity editing and per-user grant role
ceilings use the backend's separate versioned subscription `/entitlements`
and `/grants/{userId}/permissions` APIs. These never activate a subscription,
fabricate payment evidence or elevate a factory membership. Platform customer
detail also provides explicit factory/user/verified-domain effective-access
inspection. Ineligible contexts return visible errors, not invented empty
permissions. Product session inspection displays the backend's
`runtimeCoverage` and all `moduleDecisions` with denial reasons.

The frontend introduces no database migration. The matching backend owns
additive policy/domain/invitation/session migrations, constraints and audit
records; deploy those before enabling matching controls. Existing direct
tenant flags, custom domain allowlists and legacy subscriptions are not
rewritten or backfilled from partner policy.

## Validation and deployment

The `Partner foundation` GitHub Actions workflow runs focused unit/component/API
regressions, TypeScript, changed-file ESLint and a production build on a hosted
runner without external provisioning secrets. A synthetic edge-token marker
checks that trust material is absent from browser static bundles. Local validation
may require restoring dependencies when disk capacity permits.

Before enabling administration, deploy the matching backend and confirm
membership discovery, read-only roles, cross-partner denial, version conflicts,
pagination and separate domain statuses with real authenticated accounts.
Before attaching product hosts, enable/test the host boundary with explicit
direct/legacy allowlists; check direct-site login/register/settings/feature gates,
actual forwarded authority, HTTPS/asset origins and disabled/unknown hosts.
The foundation backend cannot publish ACTIVE/READY domains; do not update
database readiness manually just to demonstrate a storefront.

Full release still needs deployed and verified central issuer/client/edge/runtime
configuration, backend enforcement on every operational route, and product
onboarding, pricing/agreements, both collection models and authoritative
invoices/commission/wholesale ledgers with operator-controlled settlement.
Automated collection/payouts and external provisioning remain later capabilities.
Unit tests and a green build do not prove these unimplemented dependencies.
