This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Production workflows and BOMs

Production edits create a new draft version; publishing is a separate action. Archiving removes a workflow or BOM from new selections while preserving order history. New production orders require an explicit active, published BOM for their product. Eligible legacy orders may receive a one-time, explicitly confirmed BOM selection with a required reason, for future output only: earlier output remains BOM-unknown and historical material estimates remain incomplete. Completed, partially completed, or cancelled legacy orders are terminal and cannot be rebound, and actual consumption history is unchanged. Analytics warns when material-estimate completeness is missing or incomplete and reports the count of legacy orders with positive completed output excluded from estimates when available. The legacy `/products` flow is untouched.

Run focused production lifecycle checks with `node --experimental-strip-types scripts/check-production-lifecycle.ts`.

## Production order QR labels

Open an order in Production and use its QR label control to preview and print a single label (or save it as PDF) on normal paper. The same order always encodes the same canonical URL on that deployment: `/production?orderId=<order UUID>`. The code is generated locally and contains no credentials, quantities, or customer data. The printed order number, ID, and readable link provide a human fallback. Reprint labels if the deployment origin changes; print from the stable deployed HTTPS site, not localhost or a temporary preview URL.

Scan with a phone camera, or select **Scan order QR** in Production to use the rear camera, paste a same-origin order link, or submit an order UUID from a hardware scanner. Camera use requires HTTPS (localhost is permitted for development), browser support, and permission; manual entry remains available when camera access is unavailable. Camera resources stop on closing the scanner or opening an order. Foreign-host links and malformed payloads are rejected.

Scanning and opening a link never writes production data. Sign-in preserves the validated order destination; owners, admins, and management retain existing organization-scoped access. Other roles, including employees, cannot use the operations order endpoint and receive an access-denied message. QR labels do not grant public/customer access.

For LEGACY orders, **Record production** accepts completed/rejected quantities with a separate confirmation; it does not advance the workflow. FLOW orders record good only, with a material preview for final-good output and reasoned short closure for losses (see below). **Move to next step** (or **Complete order** for the last step) requires all current-step quantities to be recorded and its own confirmation, and sends zero additional quantities. Both actions capture order/step IDs and concurrency versions at review time; changed or conflicting state requires refresh and a new review. Legacy unresolved BOMs must be explicitly bound by an authorized operator before recording output.

Deploy with backend support for `ProductionOrder.executionVersion` and `OrderStep.expectedVersion` before enabling this UI; actions are blocked when either version is missing. There is no offline synchronization, bulk printing, automatic station advancement, or public editing flow. Focused checks: `node --experimental-strip-types scripts/check-production-qr.ts` and `node --experimental-strip-types scripts/check-production-actions.ts`.

## Linked production batches and reasoned short closure

With the coordinated quantity-flow backend enabled, the orders list shows original requests and the Kanban shows executable leaf batches. Open an original request for its paginated family overview and authoritative whole-family totals. A split parent retains history but cannot execute; child batches use the same order details, independent stages, root/parent navigation, and stable UUID QR links. Printed labels distinguish children from family overviews; an old child label still opens its overview after another split.

For 6 good pieces recorded at the current step and 4 pending out of 10, **Split ready pieces and advance** previews both allocations, inherited definitions/quality evidence, and assignment effects. One explicit confirmation atomically creates the children and advances the ready portion; waiting work stays at its current step. No new output, stock receipt or material charge is inferred. Repeated binary splits are supported. Current-step assignments pass only to the waiting child; the ready child's next-step assignment is explicit.

The original target is never reduced by scrap or cancellation. **Close step short** classifies permanent shortfalls and advances only already-recorded surviving good; **Complete batch short** resolves the last step. Neither implies the original request is closed while other descendants remain active. Reconciliation distinguishes final good, scrap pieces, never-produced cancellation, pending/WIP and unclassified historical quantities. Proven upstream work cannot be cancelled as never produced. Existing rejection classification references its original record instead of counting the loss again.

Scrap requires actual wasted-material declarations, independent of piece counts: **Deduct new stock** specifies material, lot, unit and quantity; **Already consumed** references an eligible family manual issue and allocates it without another stock deduction. No full-BOM scrap charge is inferred. An empty waste declaration needs a reason. Cancellation has no waste lines and never automatically returns issued material. Final-good recording has its own server preview for prior manual-issue coverage, uncovered pinned-BOM deductions and finished-good credit. Automatic consumption already attributed to good cannot cover scrap or another child.

Material evidence loads every page against one captured family version; incomplete pages, version drift and repeated rows block stock review rather than silently truncating available issues. A blocked preview may omit projections: its reasons are shown, and confirmation stays disabled.

FLOW records good only; ordinary recording does not advance, and ordinary advancement adds zero output. All new previews bind source identities, entered details, order/step/family versions and an opaque token. Confirmations include a stable request ID. Changed state requires fresh review; there is no automatic retry or substitution of newer versions. An uncertain new-action response permits an explicit retry of the identical confirmed request. Assignment, individual quality checks, manual consumption and BOM binding also capture required order/family versions; FLOW quality checks are confirmed separately rather than silently replaying a whole template.

Children retain exact pinned BOM/workflow versions, including archived definitions. Coherent legacy orders can explicitly adopt quantity flow; their target is labeled as captured at adoption. Ambiguous history stays visible with remediation, not invented balanced quantities or retrospective BOM attribution. Rollout and permitted actions come from backend capabilities. Employee My Orders remains read-only for FLOW batches requiring a production lead; no family/material-preview, split, closure, public or customer permissions are added. The separate legacy `/products` production flow is unchanged.

The backend rollout switch `factory1.production.quantity-flow.enabled` defaults to false and controls new FLOW roots and explicit legacy adoption. Disabling it later does not remove guards from persisted FLOW orders.

Additional bounded checks:

```sh
node --experimental-strip-types scripts/check-production-quantities.ts
node --experimental-strip-types scripts/check-production-flow.ts
node --experimental-strip-types scripts/check-production-board.ts
node --experimental-strip-types scripts/check-production-materials.ts
node --experimental-strip-types scripts/check-production-material-pages.ts
node --experimental-strip-types scripts/check-production-reviews.ts
```

Helper assertions, lint/type checks and builds do **not** prove live backend integration, browser print/PDF behavior, camera access or physical label readability. Exercise root/child navigation, preview/confirmation, stale state, permission denial and QR opening in a browser with the matching backend. Separately verify deployed-HTTPS camera scanning and actual printed labels on the intended devices; no physical test is implied by the automated checks.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
