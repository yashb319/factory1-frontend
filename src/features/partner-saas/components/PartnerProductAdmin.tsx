"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { accessScope } from "@/features/auth/accessScope";
import { useAppSelector } from "@/lib/hook";
import { useGetSaasWhitelabelPartnersQuery } from "@/features/whitelabel/api/whitelabelApi";
import { useGetPartnerMembershipsQuery, useGetSaasProductsQuery, useGetSaasProductFeaturesQuery, type ProductScope } from "../api";
import { PARTNER_SAAS_V2_ENABLED } from "../config";
import type { SaasProduct } from "../contracts";
import { FoundationError, PageControls } from "./FoundationFeedback";
import { ProductEditor } from "./ProductEditor";
import { ProductDomains } from "./ProductDomains";
import { ProductCustomers } from "./ProductCustomers";
import { PartnerModulePolicy } from "./ModulePolicies";

export function PartnerProductAdmin({ platform = false }: { platform?: boolean }) {
  const user = useAppSelector((state) => state.auth.user);
  const permitted = accessScope(user) === (platform ? "platform" : "partner");
  if (!permitted) return <p role="alert">This administration area is not available to your account.</p>;
  if (!PARTNER_SAAS_V2_ENABLED) return <section className="rounded-lg border bg-white p-6">
    <h1 className="text-xl font-semibold">Partner SaaS foundation is disabled</h1>
    <p className="mt-2 text-sm">Legacy White Label remains available. An operator must deploy the matching backend and explicitly enable the v2 administration rollout.</p>
  </section>;
  return <div className="space-y-5">
    <h1 className="text-2xl font-semibold">SaaS products and domains</h1>
    <p className="text-sm text-slate-600">Scoped product, domain and customer onboarding administration. This control plane never mounts factory operations. Subscription activation, checkout and domain provisioning remain separate backend-controlled actions.</p>
    {platform ? <PlatformPartnerPicker /> : <PartnerMembershipPicker />}
  </div>;
}

function PlatformPartnerPicker() {
  const query = useGetSaasWhitelabelPartnersQuery();
  const [selected, setSelected] = useState("");
  const partners = query.currentData?.data ?? [];
  const partner = partners.find((item) => item.id === (selected || partners[0]?.id));
  if (query.isLoading) return <p role="status">Loading partner accounts...</p>;
  if (query.error) return <FoundationError error={query.error} onRetry={() => { void query.refetch(); }} />;
  return <div className="space-y-4">
    <label className="block text-sm">Partner account
      <select className="mt-1 block w-full rounded-md border bg-white p-2" value={partner?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>
        {!partners.length ? <option value="">No partner accounts</option> : null}
        {partners.map((item) => <option key={item.id} value={item.id}>{item.name}{item.active ? "" : " (inactive)"}</option>)}
      </select>
    </label>
    {partner ? <div key={partner.id} className="space-y-4"><PartnerModulePolicy partnerId={partner.id} /><ProductWorkspace scope={{ partnerId: partner.id, platform: true }} canEdit canOnboard /></div> :
      <p>Create a partner in the existing White Label administration area first.</p>}
  </div>;
}

function PartnerMembershipPicker() {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState("");
  const query = useGetPartnerMembershipsQuery({ offset, limit: 20 });
  const memberships = query.currentData?.items.filter((membership) => membership.active) ?? [];
  const membership = memberships.find((item) => item.partnerId === (selected || memberships[0]?.partnerId));
  if (query.isFetching) return <p role="status">Loading authorized partner workspaces...</p>;
  if (query.error) return <FoundationError error={query.error} onRetry={() => { void query.refetch(); }} />;
  return <div className="space-y-4">
    <label className="block text-sm">Authorized partner workspace
      <select className="mt-1 block w-full rounded-md border bg-white p-2" value={membership?.partnerId ?? ""} onChange={(e) => setSelected(e.target.value)}>
        {!memberships.length ? <option value="">No active memberships</option> : null}
        {memberships.map((item) => <option key={item.partnerId} value={item.partnerId}>{item.partnerId} - {item.role}</option>)}
      </select>
    </label>
    <PageControls label="workspaces" offset={offset} limit={20} total={query.currentData?.total ?? 0} busy={query.isFetching} onChange={(next) => { setSelected(""); setOffset(next); }} />
    {membership ? <ProductWorkspace key={`${membership.partnerId}:${membership.role}:${membership.version}`} scope={{ partnerId: membership.partnerId, platform: false }} canEdit={membership.role === "ADMIN" || membership.role === "CATALOG"} canOnboard={membership.role === "ADMIN" || membership.role === "ONBOARDING"} /> :
      <p>No authorized partner workspace is available. Contact a platform administrator.</p>}
  </div>;
}

function ProductWorkspace({ scope, canEdit, canOnboard }: { scope: ProductScope; canEdit: boolean; canOnboard: boolean }) {
  const [offset, setOffset] = useState(0);
  const [editor, setEditor] = useState<SaasProduct | "new" | null>(null);
  const [message, setMessage] = useState("");
  const products = useGetSaasProductsQuery({ ...scope, offset, limit: 20 });
  const features = useGetSaasProductFeaturesQuery(scope);
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {canEdit ? <Button type="button" disabled={products.isFetching || features.isFetching || features.isError} onClick={() => { setMessage(""); setEditor("new"); }}>New SaaS product</Button> : null}
      <Button type="button" variant="outline" disabled={products.isFetching || features.isFetching} onClick={() => { setEditor(null); void products.refetch(); void features.refetch(); }}>Refresh products</Button>
    </div>
    {message ? <p role="status">{message}</p> : null}
    {!canEdit ? <p role="status" className="text-sm">Your partner membership permits read-only catalog access.</p> : null}
    {products.isFetching || features.isFetching ? <p role="status">Loading product catalog...</p> : null}
    {products.error ? <FoundationError error={products.error} onRetry={() => { void products.refetch(); }} /> : null}
    {features.error ? <FoundationError error={features.error} onRetry={() => { void features.refetch(); }} /> : null}
    {products.currentData && !products.isError ? <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">SaaS product catalog for the selected partner</caption>
          <thead><tr><th className="p-2" scope="col">Product</th><th scope="col">Code</th><th scope="col">Catalog status</th><th scope="col">Actions</th></tr></thead>
          <tbody>{products.currentData.items.map((product) => <tr key={product.id} className="border-t">
            <td className="p-2">{product.displayName}</td><td>{product.code}</td><td>{product.status}</td>
            <td><Button type="button" variant="outline" onClick={() => { setMessage(""); setEditor(product); }}>Manage {product.displayName}</Button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!products.currentData.items.length ? <p>No SaaS products in this partner workspace.</p> : null}
      <PageControls label="products" offset={offset} limit={20} total={products.currentData.total} busy={products.isFetching} onChange={(next) => { setEditor(null); setOffset(next); }} />
    </> : null}
    {editor && features.currentData && !features.isError && !products.isError ? <>
      <ProductEditor key={editor === "new" ? "new" : `${editor.id}:${editor.version}`} scope={scope}
        product={editor === "new" ? undefined : editor} features={features.currentData} canEdit={canEdit}
        onClose={() => setEditor(null)} onSaved={(saved) => { setEditor((current) => current === editor ? saved : current); setMessage("Product saved. No operational access or provisioning was activated."); }} />
      {editor !== "new" ? <ProductDomains key={editor.id} scope={scope} productId={editor.id} productFeatures={editor.featureKeys} canEdit={canEdit && editor.status !== "RETIRED"} /> : null}
      {editor !== "new" ? <ProductCustomers key={`customers:${editor.id}`} scope={scope} productId={editor.id} canOnboard={canOnboard && editor.status === "ACTIVE"} /> : null}
    </> : null}
  </div>;
}
