"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGetProductDomainsQuery, useRequestProductDomainMutation, useVerifyProductDomainMutation,
  useRenewProductDomainChallengeMutation, useUpdateProductDomainMutation, type ProductScope,
} from "../api";
import { canonicalHost } from "../host";
import type { ProductDomain } from "../contracts";
import { FoundationError, PageControls } from "./FoundationFeedback";

export function ProductDomains({ scope, productId, canEdit }: { scope: ProductScope; productId: string; canEdit: boolean }) {
  const [offset, setOffset] = useState(0);
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<{ domain: ProductDomain; action: "renew" | "suspend" | "retire" } | null>(null);
  const args = { ...scope, productId };
  const query = useGetProductDomainsQuery({ ...args, offset, limit: 20 });
  const [request, requestState] = useRequestProductDomainMutation();
  const [verify, verifyState] = useVerifyProductDomainMutation();
  const [renew, renewState] = useRenewProductDomainChallengeMutation();
  const [update, updateState] = useUpdateProductDomainMutation();
  const busy = requestState.isLoading || verifyState.isLoading || renewState.isLoading || updateState.isLoading;
  const data = query.currentData;

  async function reserve(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit || busy) return;
    setError(undefined);
    setMessage("");
    const normalized = canonicalHost(hostname.trim());
    if (!normalized || normalized.includes(":")) {
      setError({ message: "Enter one bare hostname without a scheme, port or path. The server also validates public suffixes and reservations." });
      return;
    }
    try {
      await request({ ...args, hostname: normalized }).unwrap();
      setHostname("");
      setMessage("Domain reserved with a pending ownership challenge. Routing and TLS have not been provisioned.");
    } catch (caught) { setError(caught); }
  }

  async function check(domain: ProductDomain) {
    if (!canEdit || !data?.capabilities.ownershipVerification || busy) return;
    setError(undefined);
    setMessage("");
    try {
      const result = await verify({ ...args, domainId: domain.id }).unwrap();
      setMessage(`Ownership check: ${result.ownershipStatus}. Routing: ${result.routingStatus}. TLS: ${result.tlsStatus}.`);
    } catch (caught) { setError(caught); }
  }

  async function confirm() {
    if (!confirmation || !canEdit || busy) return;
    setError(undefined);
    setMessage("");
    const { domain, action } = confirmation;
    try {
      if (action === "renew") {
        await renew({ ...args, domainId: domain.id, expectedVersion: domain.version }).unwrap();
      } else {
        await update({ ...args, domainId: domain.id, expectedVersion: domain.version, status: action === "retire" ? "RETIRED" : "SUSPENDED" }).unwrap();
      }
      setConfirmation(null);
      setMessage(action === "renew" ? "Challenge renewed. Ownership, routing and TLS must be checked again." : `Domain ${action === "retire" ? "retired" : "suspended"}.`);
    } catch (caught) {
      setConfirmation(null);
      setError(caught);
    }
  }

  return <section className="space-y-4 rounded-lg border bg-white p-4" aria-label="Product domains">
    <h2 className="text-lg font-semibold">Product domains</h2>
    <p className="text-sm text-slate-600">A domain identifies this product, not a factory. TXT ownership, traffic routing and TLS are separate. This foundation cannot activate or provision a domain.</p>
    {error ? <FoundationError error={error} /> : null}
    {message ? <p role="status" className="text-sm">{message}</p> : null}
    {canEdit ? <form onSubmit={reserve} className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm">New domain hostname<Input required maxLength={253} value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="hr.example.com" /></label>
      <Button type="submit" disabled={busy}>Request domain</Button>
    </form> : <p className="text-sm">Read-only membership: domain changes are unavailable.</p>}
    <Button type="button" variant="outline" disabled={query.isFetching || busy} onClick={() => { setError(undefined); void query.refetch(); }}>Refresh domains</Button>
    {query.isFetching ? <p role="status">Loading domains...</p> : null}
    {query.error ? <FoundationError error={query.error} onRetry={() => { void query.refetch(); }} /> : null}
    {data && !query.isError ? <>
      {!data.capabilities.ownershipVerification ? <p className="text-sm">Ownership verification is unavailable until an operator configures the DNS verifier.</p> : null}
      {data.domains.items.length === 0 ? <p>No domains reserved for this product.</p> : null}
      <ul className="space-y-3">
        {data.domains.items.map((domain) => <li key={domain.id} className="space-y-3 rounded-md border p-3">
          <h3 className="break-all font-semibold">{domain.hostname}</h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-600">Domain status</dt><dd>{domain.status}</dd></div>
            <div><dt className="text-slate-600">Ownership</dt><dd>{domain.ownershipStatus}</dd></div>
            <div><dt className="text-slate-600">Routing</dt><dd>{domain.routingStatus}</dd></div>
            <div><dt className="text-slate-600">TLS certificate</dt><dd>{domain.tlsStatus}</dd></div>
          </dl>
          {domain.verification && domain.status !== "RETIRED" ? <div className="space-y-1 break-all rounded bg-slate-50 p-3 text-sm">
            <p>DNS record: {domain.verification.recordType}</p>
            <p>Name: <code>{domain.verification.recordName}</code></p>
            <p>Value: <code>{domain.verification.value}</code></p>
            <p>Expires: <time dateTime={domain.verification.expiresAt}>{domain.verification.expiresAt}</time></p>
          </div> : null}
          {domain.verificationFailure ? <p role="status" className="text-sm">Verification result: {domain.verificationFailure}</p> : null}
          <p className="text-xs text-slate-600">Last checked: {domain.lastCheckedAt ?? "Not checked"}</p>
          {canEdit && domain.status !== "RETIRED" ? <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy || !data.capabilities.ownershipVerification} onClick={() => { void check(domain); }}>Check ownership of {domain.hostname}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmation({ domain, action: "renew" })}>Renew challenge</Button>
            <Button type="button" variant="outline" disabled={busy || domain.status === "SUSPENDED"} onClick={() => setConfirmation({ domain, action: "suspend" })}>Suspend domain</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmation({ domain, action: "retire" })}>Retire domain</Button>
          </div> : null}
        </li>)}
      </ul>
      <PageControls label="domains" offset={offset} limit={20} total={data.domains.total} busy={query.isFetching || busy} onChange={setOffset} />
    </> : null}
    <AlertDialog open={Boolean(confirmation)} onOpenChange={(open) => { if (!open && !busy) setConfirmation(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm domain change</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmation?.domain.hostname}: {confirmation?.action === "renew" ? "renew the proof and reset ownership/routing/TLS readiness" :
              confirmation?.action === "retire" ? "retire permanently; the hostname stays reserved" : "suspend this domain"}.
            This uses the reviewed domain version. A conflict requires a refresh and new review.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void confirm(); }}>{busy ? "Saving..." : "Confirm change"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
