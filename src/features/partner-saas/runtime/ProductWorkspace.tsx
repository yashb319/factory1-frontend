"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthBootstrap } from "../auth/contracts";
import { ProductRuntimeProvider } from "./client";
import { runtimeScreens } from "./policy";
import { RuntimeRecords } from "./RuntimeRecords";

export function ProductWorkspace({ data }: { data: AuthBootstrap }) {
  const pathname = usePathname();
  const screens = runtimeScreens(data.entitlements?.runtimeRoutes ?? [], data.entitlements?.role, data.entitlements?.modules ?? []);
  const active = screens.find((screen) => screen.href === pathname);
  const home = ["/", "/dashboard", "/login"].includes(pathname);
  return <ProductRuntimeProvider key={data.session.contextGeneration} data={data}>
    <div className="space-y-5 border-t pt-5">
      <nav aria-label="Product factory workspace" className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="underline" aria-current={home ? "page" : undefined}>Workspace</Link>
        {screens.map((screen) => <Link key={screen.href} href={screen.href} className="underline" aria-current={active === screen ? "page" : undefined}>{screen.label}</Link>)}
        <Link href="/help" className="underline" aria-current={pathname === "/help" ? "page" : undefined}>Help</Link>
      </nav>
      {active ? <RuntimeRecords key={`${data.session.contextGeneration}:${active.href}`} kind={active.href === "/inventory" ? "inventory" : "employees"} /> :
        home ? <section aria-label="Authorized module cards" className="space-y-4">
          <h2 className="text-xl font-semibold">{data.session.context?.organizationName} workspace</h2>
          <p>Role: {data.session.principal?.role}. Only operations authorized for this product and factory are available.</p>
          <div className="grid gap-3 sm:grid-cols-2">{screens.map((screen) => <Link key={screen.href} href={screen.href} className="rounded border p-5 underline">Open {screen.label}</Link>)}</div>
          <p className="text-sm">Mixed-module dashboards, Tally, AI, import/export and public asset links are not available until their contextual backend adapters are reviewed. Purchasing another product does not enable them here.</p>
        </section> : pathname === "/help" ? <section className="space-y-3" aria-label="Product workspace help">
          <h2 className="text-xl font-semibold">Factory access help</h2>
          <p>Choose an authorized factory above. Your active factory membership, product subscription and explicit user product grant are checked on every operation.</p>
          <p>If access expires or is revoked, reload factory access. Contact your product administrator for pending approval, invitation or subscription changes. An employee record or matching email does not grant access.</p>
          <p>Payments and commercial activation are not available in this release.</p>
        </section> : <section role="alert" className="space-y-3">
          <h2 className="text-xl font-semibold">This screen is unavailable for this product</h2>
          <p>The requested route is not covered by your selected product, role and reviewed operational routes.</p>
          <Link href="/dashboard" className="underline">Back to authorized workspace</Link>
        </section>}
    </div>
  </ProductRuntimeProvider>;
}
