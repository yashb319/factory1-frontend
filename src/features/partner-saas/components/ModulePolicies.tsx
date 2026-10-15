"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { accessScope } from "@/features/auth/accessScope";
import { useAppSelector } from "@/lib/hook";
import {
  useGetPartnerEntitlementPolicyQuery, useUpdatePartnerEntitlementPolicyMutation, useGetSaasProductFeaturesQuery,
  useGetDomainModulePolicyQuery, useUpdateDomainModulePolicyMutation,
} from "../api";
import { FoundationError } from "./FoundationFeedback";

export function PartnerModulePolicy({ partnerId }: { partnerId: string }) {
  const user = useAppSelector((state) => state.auth.user);
  if (accessScope(user) !== "platform") return null;
  return <PartnerPolicyQuery key={partnerId} partnerId={partnerId} />;
}

function PartnerPolicyQuery({ partnerId }: { partnerId: string }) {
  const query = useGetPartnerEntitlementPolicyQuery({ partnerId });
  const catalog = useGetSaasProductFeaturesQuery({ partnerId, platform: true });
  return <section className="space-y-3 rounded border bg-white p-4" aria-label="Partner authorized resale ceiling">
    <h2 className="text-lg font-semibold">Platform-authorized partner resale ceiling</h2>
    <p className="text-sm">This independent approval limits every product and domain. Product packages and factory subscriptions cannot widen it. An unapproved partner has no operational access.</p>
    {query.isFetching || catalog.isFetching ? <p role="status">Loading partner module policy...</p> : null}
    {query.error ? <FoundationError error={query.error} onRetry={() => { void query.refetch(); }} /> : null}
    {catalog.error ? <FoundationError error={catalog.error} onRetry={() => { void catalog.refetch(); }} /> : null}
    {!query.isFetching && !catalog.isFetching && query.currentData && catalog.currentData && !query.isError && !catalog.isError ?
      <PartnerPolicyEditor key={query.currentData.version} partnerId={partnerId} policy={query.currentData} catalog={catalog.currentData} /> : null}
  </section>;
}

function PartnerPolicyEditor({ partnerId, policy, catalog }: {
  partnerId: string; policy: { featureKeys: string[]; approved: boolean; version: number }; catalog: string[];
}) {
  const [keys, setKeys] = useState(policy.featureKeys);
  const [approved, setApproved] = useState(policy.approved);
  const [save, result] = useUpdatePartnerEntitlementPolicyMutation();
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (result.isLoading || keys.some((key) => !catalog.includes(key))) return;
    setError(undefined); setSaved(false);
    try {
      await save({ partnerId, body: { featureKeys: keys, approved, expectedVersion: policy.version } }).unwrap();
      setSaved(true);
    } catch (caught) { setError(caught); }
  }
  return <form onSubmit={submit} className="space-y-3">
    <fieldset disabled={result.isLoading} className="space-y-3">
      <legend className="sr-only">Platform resale approval and modules</legend>
      <label className="flex items-center gap-2"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />Approve this partner to resell only the selected modules</label>
      <ModuleSelection catalog={catalog} selected={keys} onChange={setKeys} />
      <label className="flex items-center gap-2"><input type="checkbox" required />I reviewed this independent ceiling and its effect on all partner customers.</label>
      <Button type="submit" disabled={result.isLoading || keys.some((key) => !catalog.includes(key))}>{result.isLoading ? "Saving..." : "Save partner resale policy"}</Button>
    </fieldset>
    {error ? <FoundationError error={error} /> : null}
    {saved ? <p role="status">Partner policy saved. Backend authorization rechecks it on every runtime request.</p> : null}
  </form>;
}

export function DomainModulePolicy({ partnerId, productId, domainId, productFeatures, readOnly }: {
  partnerId: string; productId: string; domainId: string; productFeatures: string[]; readOnly: boolean;
}) {
  const user = useAppSelector((state) => state.auth.user);
  if (accessScope(user) !== "platform") return null;
  return <DomainPolicyQuery partnerId={partnerId} productId={productId} domainId={domainId} productFeatures={productFeatures} readOnly={readOnly} />;
}

function DomainPolicyQuery(props: {
  partnerId: string; productId: string; domainId: string; productFeatures: string[]; readOnly: boolean;
}) {
  const query = useGetDomainModulePolicyQuery(props);
  return <section className="space-y-3 rounded border p-3" aria-label="Domain module narrowing">
    <h4 className="font-medium">Platform domain module restriction</h4>
    <p className="text-sm">Inherit the product bundle or select a narrower subset. An explicit empty subset denies every module. Neither option overrides the partner ceiling or the factory&apos;s current tenant flags, subscription or role.</p>
    {query.isFetching ? <p role="status">Loading domain module policy...</p> : null}
    {query.error ? <FoundationError error={query.error} onRetry={() => { void query.refetch(); }} /> : null}
    {query.currentData && !query.isFetching && !query.isError ? <DomainPolicyEditor key={`${props.domainId}:${query.currentData.version}`}
      {...props} policy={query.currentData} /> : null}
  </section>;
}

function DomainPolicyEditor({ partnerId, productId, domainId, productFeatures, readOnly, policy }: {
  partnerId: string; productId: string; domainId: string; productFeatures: string[]; readOnly: boolean;
  policy: { featureKeys: string[] | null; version: number };
}) {
  const [inherit, setInherit] = useState(policy.featureKeys === null);
  const [keys, setKeys] = useState(policy.featureKeys ?? []);
  const [save, result] = useUpdateDomainModulePolicyMutation();
  const [error, setError] = useState<unknown>();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (readOnly || result.isLoading || (!inherit && keys.some((key) => !productFeatures.includes(key)))) return;
    setError(undefined);
    try {
      await save({ partnerId, productId, domainId, body: { featureKeys: inherit ? null : keys, expectedVersion: policy.version } }).unwrap();
    } catch (caught) { setError(caught); }
  }
  return <form onSubmit={submit} className="space-y-3">
    <fieldset disabled={readOnly || result.isLoading} className="space-y-3">
      <legend className="sr-only">Domain module policy</legend>
      <label className="flex items-center gap-2"><input type="checkbox" checked={inherit} onChange={(event) => setInherit(event.target.checked)} />Inherit the product module bundle</label>
      {!inherit ? <ModuleSelection catalog={productFeatures} selected={keys} onChange={setKeys} /> : null}
      {!readOnly ? <Button type="submit" disabled={result.isLoading || (!inherit && keys.some((key) => !productFeatures.includes(key)))}>{result.isLoading ? "Saving..." : "Save domain module restriction"}</Button> : null}
    </fieldset>
    {error ? <FoundationError error={error} /> : null}
  </form>;
}

function ModuleSelection({ catalog, selected, onChange }: { catalog: string[]; selected: string[]; onChange: (keys: string[]) => void }) {
  return <div className="grid gap-2 sm:grid-cols-2">
    {[...new Set([...catalog, ...selected])].map((key) => <label key={key} className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={selected.includes(key)} onChange={(event) => onChange(event.target.checked ? [...selected, key] : selected.filter((value) => value !== key))} />
      {key}{!catalog.includes(key) ? " (no longer authorized; remove before saving)" : ""}
    </label>)}
    {!catalog.length && !selected.length ? <p>No modules are available.</p> : null}
  </div>;
}
