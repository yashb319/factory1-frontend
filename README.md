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

**Record production** requires entered completed/rejected quantities and a separate confirmation; it does not advance the workflow. **Move to next step** (or **Complete order** for the last step) requires all current-step quantities to be recorded and its own confirmation, and sends zero additional quantities. Both actions capture order/step IDs and concurrency versions at review time; changed or conflicting state requires refresh and a new review. Legacy unresolved BOMs must be explicitly bound by an authorized operator before recording output.

Deploy with backend support for `ProductionOrder.executionVersion` and `OrderStep.expectedVersion` before enabling this UI; actions are blocked when either version is missing. There is no offline synchronization, bulk printing, automatic station advancement, or public editing flow. Focused checks: `node --experimental-strip-types scripts/check-production-qr.ts` and `node --experimental-strip-types scripts/check-production-actions.ts`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
