# Partner SaaS frontend foundation

This is a rollout-disabled Partner SaaS frontend layer, not a working
white-label SaaS release. It adds isolated control-plane shells, session cache
boundaries, scoped SaaS product/domain administration, public host readiness,
and a central sign-in/context-selection BFF. **All rollout flags default off;
operational factory routes, onboarding and financial flows remain unavailable.**
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
  Backend authorization remains authoritative on every request.
- Platform partner discovery reuses existing platform-only white-label partners.
  Product/domain APIs use the frozen platform or scoped partner prefixes, typed
  envelopes, pagination and reviewed `expectedVersion` commands.
- There are no partner tenant projections, subscription/grant controls or
  operational factory data in these screens. Product packages do not activate
  subscriptions or grant user access.
- Operational data will remain factory-owned/shared across products. The BFF
  picker accepts only backend-authorized factory options; the backend must require
  explicit per-user product grants in addition to factory membership and active
  subscription. This frontend tranche displays effective entitlements only and
  deliberately does not mount operational routes.

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
short-lived host-only HttpOnly cookie. It never collects passwords, creates
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
Operational access remains a literal false in every public contract for this
layer. A selected context or displayed module list is not authorization to mount
operational routes.

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
upstream errors; canonical host, schema, assets and all-false runtime capabilities
must validate. Server failures log only generic status/error names, not trust
tokens. Public responses and callback-free foundation pages are no-store/noindex
as applicable; analytics is not mounted on new product-host readiness pages.

Assets must be approved absolute HTTPS URLs on exact allowed hosts, without
userinfo, query, fragment or nonstandard port. There is no upload, remote-file
proxy, arbitrary HTML/CSS or image sanitization service in this tranche. Use only
operator-trusted public assets; do not expose private tenant file URLs. Theme
colors decorate the readiness page while text/focus contrast remains fixed.

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
