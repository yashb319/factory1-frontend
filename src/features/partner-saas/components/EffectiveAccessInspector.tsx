"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { accessScope } from "@/features/auth/accessScope";
import { useAppSelector } from "@/lib/hook";
import { useGetProductDomainsQuery, useLazyInspectProductAccessQuery } from "../api";
import type { ProductCustomer } from "../onboarding/contracts";
import { FoundationError, PageControls } from "./FoundationFeedback";

export function EffectiveAccessInspector({ customer, partnerId }: { customer: ProductCustomer; partnerId: string }) {
  const user = useAppSelector((state) => state.auth.user);
  if (accessScope(user) !== "platform") return null;
  return <InspectionForm customer={customer} partnerId={partnerId} />;
}

function InspectionForm({ customer, partnerId }: { customer: ProductCustomer; partnerId: string }) {
  const [offset, setOffset] = useState(0);
  const [domainId, setDomainId] = useState("");
  const [userId, setUserId] = useState(customer.ownerUserId);
  const [error, setError] = useState("");
  const domains = useGetProductDomainsQuery({ partnerId, productId: customer.productId, platform: true, offset, limit: 20 });
  const [inspect, query] = useLazyInspectProductAccessQuery();
  const candidates = domains.currentData?.domains.items.filter((domain) => domain.status === "ACTIVE" &&
    domain.ownershipStatus === "VERIFIED" && domain.routingStatus === "READY" && domain.tlsStatus === "READY") ?? [];
  const selected = candidates.find((domain) => domain.id === (domainId || candidates[0]?.id));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const id = z.uuid().safeParse(userId);
    if (!id.success || !selected) { setError("Select a verified active product domain and an explicit user UUID."); return; }
    void inspect({ partnerId, productId: customer.productId, organizationId: customer.organizationId, userId: id.data, domainId: selected.id });
  }
  return <section className="space-y-3 border-t pt-4" aria-label="Effective permission inspection">
    <h3 className="font-semibold">Inspect effective product access</h3>
    <p className="text-sm">Backend inspection only. This does not select a factory session or grant any permission. Ineligible memberships, grants or subscriptions return an explicit error.</p>
    {domains.error ? <FoundationError error={domains.error} onRetry={() => { void domains.refetch(); }} /> : null}
    {domains.isFetching ? <p role="status">Loading verified product domains...</p> : null}
    {domains.currentData && !domains.isError ? <>
      <form onSubmit={submit} className="space-y-3">
        <fieldset disabled={domains.isFetching || query.isFetching} className="flex flex-wrap items-end gap-3">
          <legend className="sr-only">Explicit factory, user and domain</legend>
          <label>Product domain<select className="min-h-11 rounded border bg-white p-2" value={selected?.id ?? ""} onChange={(event) => setDomainId(event.target.value)}>
            {!candidates.length ? <option value="">No ready domains on this page</option> : null}
            {candidates.map((domain) => <option key={domain.id} value={domain.id}>{domain.hostname}</option>)}
          </select></label>
          <label>User ID<input className="min-h-11 rounded border p-2" required value={userId} onChange={(event) => setUserId(event.target.value)} /></label>
          <Button type="submit" disabled={!selected || query.isFetching}>Inspect effective access</Button>
        </fieldset>
      </form>
      <PageControls label="inspection domains" offset={offset} limit={20} total={domains.currentData.domains.total} busy={domains.isFetching || query.isFetching}
        onChange={(next) => { setDomainId(""); query.reset(); setOffset(next); }} />
    </> : null}
    {error ? <p role="alert">{error}</p> : null}
    {query.isFetching ? <p role="status">Checking authoritative effective access...</p> : null}
    {query.error ? <FoundationError error={query.error} /> : null}
    {query.currentData && !query.isFetching && !query.isError ? <div className="space-y-2">
      <p className="break-all text-sm">User {query.currentData.userId} · Factory {query.currentData.organizationId} · Domain {query.currentData.domainId} · Role {query.currentData.role}</p>
      <p className="text-sm">Runtime coverage: {query.currentData.runtimeCoverage}. This is not full-module readiness.</p>
      <ul className="space-y-2 text-sm">{query.currentData.moduleDecisions.map((decision) => <li key={decision.key}>
        <strong>{decision.key}</strong>: {decision.enabled ? "Enabled" : "Unavailable"}{decision.reasons.length ? ` - ${decision.reasons.join(", ")}` : ""}
      </li>)}</ul>
    </div> : null}
  </section>;
}
