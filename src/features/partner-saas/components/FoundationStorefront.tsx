import type { PublicStorefront } from "../contracts";
import { StorefrontEntry } from "./StorefrontEntry";

export function FoundationStorefront({ storefront, state = "unavailable", signInEnabled = false }: {
  storefront?: PublicStorefront; state?: "loading" | "disabled" | "unavailable"; signInEnabled?: boolean;
}) {
  const brand = storefront?.storefront;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-950">
    <section className={`w-full ${storefront?.capabilities.operationalAccess ? "max-w-6xl" : "max-w-xl"} space-y-4 rounded-lg border bg-white p-6`}
      aria-label="Product storefront" aria-busy={state === "loading" && !brand}>
      {brand?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt={brand.displayName} width={160} height={80} className="max-h-20 object-contain" referrerPolicy="no-referrer" />
      ) : null}
      <h1 className="text-2xl font-semibold" style={brand?.primaryColorHex ? { borderLeft: `4px solid ${brand.primaryColorHex}`, paddingLeft: "12px" } : undefined}>
        {brand?.displayName ?? (state === "loading" ? "Loading storefront" : state === "disabled" ? "Storefront is not enabled" : "Storefront unavailable")}
      </h1>
      <p role="status" className="text-sm text-slate-700">
        {brand ? signInEnabled && storefront.capabilities.sso
          ? storefront.capabilities.operationalAccess
            ? "Sign in to select an authorized factory workspace. Runtime coverage is partial: reviewed inventory and employee operations only."
            : "Product identity resolved. Sign in to select an authorized factory. Operational access remains unavailable until the backend authorization rollout is ready."
          : "Product identity resolved. Sign-in and factory operations are not enabled in this release." :
          state === "loading" ? "Checking this address before displaying product identity or sign-in controls." :
          "This address cannot serve a product storefront yet. Domain ownership, routing, TLS and rollout readiness must be confirmed by the operator."}
      </p>
      {brand && signInEnabled && storefront.capabilities.sso ? (
        <StorefrontEntry operationalEnabled={storefront.capabilities.operationalAccess} />
      ) : null}
      {state !== "loading" ? <a href="" className="inline-block rounded-md border px-3 py-2 text-sm underline focus-visible:outline-2 focus-visible:outline-blue-600">Reload storefront</a> : null}
    </section>
  </main>;
}
