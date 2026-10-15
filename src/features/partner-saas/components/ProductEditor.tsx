"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allowedAssetUrl, type ProductInput, type SaasProduct } from "../contracts";
import { useCreateSaasProductMutation, useUpdateSaasProductMutation, type ProductScope } from "../api";
import { FoundationError } from "./FoundationFeedback";

const inputClass = "mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm";

export function ProductEditor({ scope, product, features, canEdit, onSaved, onClose }: {
  scope: ProductScope; product?: SaasProduct; features: string[]; canEdit: boolean;
  onSaved: (product: SaasProduct) => void; onClose: () => void;
}) {
  const [code, setCode] = useState(product?.code ?? "");
  const [displayName, setDisplayName] = useState(product?.displayName ?? "");
  const [featureKeys, setFeatureKeys] = useState(product?.featureKeys ?? []);
  const [logoUrl, setLogoUrl] = useState(product?.logoUrl ?? "");
  const [faviconUrl, setFaviconUrl] = useState(product?.faviconUrl ?? "");
  const [primaryColorHex, setPrimary] = useState(product?.primaryColorHex ?? "");
  const [accentColorHex, setAccent] = useState(product?.accentColorHex ?? "");
  const [status, setStatus] = useState<SaasProduct["status"]>(product?.status ?? "DRAFT");
  const [error, setError] = useState<unknown>();
  const [create, creating] = useCreateSaasProductMutation();
  const [update, updating] = useUpdateSaasProductMutation();
  const busy = creating.isLoading || updating.isLoading;
  const readOnly = !canEdit || product?.status === "RETIRED";
  const assetHosts = process.env.NEXT_PUBLIC_PARTNER_SAAS_ASSET_HOSTS ?? "";
  const unknownFeatures = featureKeys.filter((key) => !features.includes(key));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly || busy) return;
    setError(undefined);
    const body: ProductInput = {
      code: code.trim(), displayName: displayName.trim(), featureKeys,
      logoUrl: logoUrl.trim() || null, faviconUrl: faviconUrl.trim() || null,
      primaryColorHex: primaryColorHex.trim() || null, accentColorHex: accentColorHex.trim() || null,
    };
    if (!body.displayName || (!product && !body.code) || unknownFeatures.length ||
        !allowedAssetUrl(body.logoUrl, assetHosts) || !allowedAssetUrl(body.faviconUrl, assetHosts) ||
        [body.primaryColorHex, body.accentColorHex].some((value) => value !== null && !/^#[0-9a-fA-F]{6}$/.test(value))) {
      setError({ message: "Enter a name/code, select only catalog modules, use six-digit hex colors and HTTPS assets on the configured allowed hosts (no query or fragment)." });
      return;
    }
    try {
      const result = product
        ? await update({ ...scope, productId: product.id, body: {
          displayName: body.displayName, featureKeys: body.featureKeys, logoUrl: body.logoUrl, faviconUrl: body.faviconUrl,
          primaryColorHex: body.primaryColorHex, accentColorHex: body.accentColorHex, status, expectedVersion: product.version,
        } }).unwrap()
        : await create({ ...scope, body }).unwrap();
      onSaved(result);
    } catch (caught) {
      setError(caught);
    }
  }

  return <section className="space-y-4 rounded-lg border bg-white p-4" aria-label="Product editor">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{product ? `Product: ${product.displayName}` : "Create SaaS product"}</h2>
      <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Close editor</Button>
    </div>
    <p className="text-sm text-slate-600">Catalog ACTIVE is not operational readiness. Backend authorization, explicit grants and verified domain readiness are required separately. This editor cannot activate payments, routing or TLS.</p>
    {readOnly ? <p role="status" className="text-sm">Read-only: your membership cannot edit this product, or the product is retired.</p> : null}
    {error ? <FoundationError error={error} /> : null}
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={readOnly || busy} className="space-y-4">
        <legend className="sr-only">Product metadata and module package</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Product code<Input className="mt-1" required maxLength={80} value={code} disabled={Boolean(product)} onChange={(e) => setCode(e.target.value)} /></label>
          <label className="text-sm">Display name<Input className="mt-1" required maxLength={120} value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
          <label className="text-sm">Logo URL<Input className="mt-1" type="url" maxLength={1000} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></label>
          <label className="text-sm">Favicon URL<Input className="mt-1" type="url" maxLength={1000} value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} /></label>
          <label className="text-sm">Primary color<Input className="mt-1" placeholder="#123456" value={primaryColorHex} onChange={(e) => setPrimary(e.target.value)} /></label>
          <label className="text-sm">Accent color<Input className="mt-1" placeholder="#123456" value={accentColorHex} onChange={(e) => setAccent(e.target.value)} /></label>
          {product ? <label className="text-sm">Catalog status<select className={inputClass} value={status} onChange={(e) => {
            const next = e.target.value;
            if (next === "DRAFT" || next === "ACTIVE" || next === "SUSPENDED" || next === "RETIRED") setStatus(next);
          }}>
            {["DRAFT", "ACTIVE", "SUSPENDED", "RETIRED"].map((value) => <option key={value}>{value}</option>)}
          </select></label> : null}
        </div>
        <p className="text-xs text-slate-600">Allowed asset hosts: {assetHosts || "none configured; leave asset URLs empty"}. Colors are decorative here; public text retains accessible contrast.</p>
        <fieldset className="rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Product module package</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {features.map((key) => <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featureKeys.includes(key)} onChange={(e) => setFeatureKeys(e.target.checked ? [...featureKeys, key] : featureKeys.filter((value) => value !== key))} />{key}
            </label>)}
          </div>
          {unknownFeatures.length ? <p role="alert">Some saved modules are absent from the current catalog. Refresh before editing: {unknownFeatures.join(", ")}</p> : null}
          <p className="mt-2 text-xs text-slate-600">A package does not grant operational access. Subscription, explicit user product grants and contextual enforcement are separate.</p>
        </fieldset>
        {status === "RETIRED" && product?.status !== "RETIRED" ? <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" required />I understand retirement is permanent and this product cannot be restored after saving.
        </label> : null}
        {!readOnly ? <Button type="submit" disabled={busy || unknownFeatures.length > 0}>{busy ? "Saving..." : product ? "Save product" : "Create product"}</Button> : null}
      </fieldset>
    </form>
  </section>;
}
