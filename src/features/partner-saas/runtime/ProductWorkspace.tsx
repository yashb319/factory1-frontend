"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { lazy, Suspense } from "react";
import type { AuthBootstrap } from "../auth/contracts";
import { ProductRuntimeProvider } from "./client";
import { runtimeScreens } from "./policy";
import { ContextModuleStore } from "./ContextModuleStore";
import { Toaster } from "@/components/ui/sonner";

const surfaces = {
  "/inventory": lazy(() => import("@/features/inventory/components/InventoryPage").then((module) => ({ default: module.InventoryPage }))),
  "/employees": lazy(() => import("@/features/employees/components/EmployeesPage").then((module) => ({ default: module.EmployeesPage }))),
  "/attendance": lazy(() => import("@/features/attendance/components/AttendancePage").then((module) => ({ default: module.AttendancePage }))),
  "/leave": lazy(() => import("@/features/leave/components/LeavePage").then((module) => ({ default: module.LeavePage }))),
  "/payroll": lazy(() => import("@/features/payroll/components/PayrollPage").then((module) => ({ default: module.PayrollPage }))),
  "/production": lazy(() => import("@/features/production/components/ProductionPage").then((module) => ({ default: module.ProductionPage }))),
  "/suppliers": lazy(() => import("@/features/suppliers/components/SupplierPage").then((module) => ({ default: module.SupplierPage }))),
  "/customers": lazy(() => import("@/features/customers/components/CustomerPage").then((module) => ({ default: module.CustomerPage }))),
  "/billing": lazy(() => import("@/features/billing/components/BillingPage").then((module) => ({ default: module.BillingPage }))),
  "/accounting": lazy(() => import("@/features/accounting/components/AccountingPage").then((module) => ({ default: module.AccountingPage }))),
};

export function ProductWorkspace({ data }: { data: AuthBootstrap }) {
  const pathname = usePathname();
  const screens = runtimeScreens(data.entitlements?.runtimeRoutes ?? [], data.entitlements?.role,
    data.entitlements?.modules ?? [], data.entitlements?.moduleDecisions ?? []);
  const active = screens.find((screen) => screen.href === pathname);
  const Surface = active && active.href in surfaces ? surfaces[active.href as keyof typeof surfaces] : null;
  const home = ["/", "/dashboard", "/login"].includes(pathname);
  const workspaceKey = JSON.stringify([data.session, data.entitlements, data.csrfToken]);
  return <ProductRuntimeProvider key={workspaceKey} data={data}>
    <ContextModuleStore key={data.session.contextGeneration}>
    <div className="grid gap-5 border-t pt-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label="Product factory workspace" className="flex flex-wrap content-start gap-3 lg:flex-col">
        <Link href="/dashboard" className="underline" aria-current={home ? "page" : undefined}>Workspace</Link>
        {screens.map((screen) => <Link key={screen.href} href={screen.href} className="underline" aria-current={active === screen ? "page" : undefined}>{screen.label}</Link>)}
        <Link href="/help" className="underline" aria-current={pathname === "/help" ? "page" : undefined}>Help</Link>
      </nav>
      <section aria-label="Authorized factory module" className="min-w-0">
      <p className="mb-4 rounded border p-3 text-sm">Partial runtime coverage: only reviewed operations are available. Unsupported controls stay disabled; a module entitlement is not permission for every action.</p>
      {Surface ? <Suspense fallback={<p role="status">Loading authorized module...</p>}>
        <Surface key={`${data.session.contextGeneration}:${active?.href}`} />
      </Suspense> :
        home ? <section aria-label="Authorized module cards" className="space-y-4">
          <h2 className="text-xl font-semibold">{data.session.context?.organizationName} workspace</h2>
          <p>Role: {data.session.principal?.role}. Only operations authorized for this product and factory are available.</p>
          <div className="grid gap-3 sm:grid-cols-2">{screens.map((screen) => <Link key={screen.href} href={screen.href} className="rounded border p-5 underline">Open {screen.label}</Link>)}</div>
          <details><summary>Module availability</summary><ul className="space-y-2">{data.entitlements?.moduleDecisions.map((decision) =>
            <li key={decision.key}>{decision.key}: {decision.enabled ? "Reviewed operations enabled" : `Unavailable - ${decision.reasons.join(", ")}`}</li>)}</ul></details>
          <p className="text-sm">This dashboard shows only authorized modules, not mixed-module totals. Tally, AI, bulk import, public links and legacy exports are unavailable. Inventory exports use a separately authorized contextual job. Purchasing another product does not widen this workspace.</p>
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
      </section>
    </div>
    <Toaster />
    </ContextModuleStore>
  </ProductRuntimeProvider>;
}
