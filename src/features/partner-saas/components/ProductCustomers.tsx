"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FoundationError, PageControls } from "./FoundationFeedback";
import {
  useGetProductOnboardingPolicyQuery, useGetProductCustomersQuery, useGetProductCustomerQuery,
  useOnboardProductCustomerMutation, type ProductScope,
} from "../api";
import { onboardingInputSchema, type OnboardingInput, type ProductCustomer } from "../onboarding/contracts";
import { CustomerAccessAdmin } from "./CustomerAccessAdmin";

export function ProductCustomers({ scope, productId, canOnboard }: {
  scope: ProductScope; productId: string; canOnboard: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState("");
  const policy = useGetProductOnboardingPolicyQuery({ ...scope, productId });
  const customers = useGetProductCustomersQuery({ ...scope, productId, offset, limit: 20 });
  return <section className="space-y-4 rounded border bg-white p-4" aria-label="Product customers and onboarding">
    <h2 className="text-lg font-semibold">Customers and factory onboarding</h2>
    <p className="text-sm">Only authorized onboarding metadata is shown here. Partner administrators cannot read factory operations, grant themselves membership, activate paid subscriptions or infer access from an email address.</p>
    {policy.isFetching ? <p role="status">Checking onboarding policy...</p> : null}
    {policy.error ? <FoundationError error={policy.error} onRetry={() => { void policy.refetch(); }} /> : null}
    {policy.currentData && !policy.isError ? <>
      <p role="status">{policy.currentData.enabled ? "Onboarding is enabled." : "Onboarding is disabled by the backend."} Subscription activation requires platform evidence; checkout is unavailable.</p>
      {!policy.currentData.invitationDelivery ? <p role="status">Invitation delivery is not enabled. Requests may be recorded, but no email delivery is promised.</p> : null}
      {canOnboard && policy.currentData.enabled ? <CustomerOnboardingForm scope={scope} productId={productId} onCreated={(customer) => { setOffset(0); setSelected(customer.id); }} /> :
        !canOnboard ? <p>Your membership permits viewing customer metadata only.</p> : null}
    </> : null}
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={customers.isFetching} onClick={() => { setSelected(""); void customers.refetch(); }}>Refresh customers</Button></div>
    {customers.isFetching ? <p role="status">Loading customers...</p> : null}
    {customers.error ? <FoundationError error={customers.error} onRetry={() => { void customers.refetch(); }} /> : null}
    {customers.currentData && !customers.isError ? <>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Authorized product customer metadata</caption>
        <thead><tr><th scope="col">Factory</th><th scope="col">Approval</th><th scope="col">Subscription</th><th scope="col">Invitation</th><th scope="col">Details</th></tr></thead>
        <tbody>{customers.currentData.items.map((customer) => <tr key={customer.id} className="border-t">
          <td className="py-2">{customer.factoryName}</td><td>{customer.organizationStatus}</td><td>{customer.subscriptionStatus}</td><td>{customer.invitation.status}</td>
          <td><Button type="button" variant="outline" onClick={() => setSelected(customer.id)}>View {customer.factoryName}</Button></td>
        </tr>)}</tbody>
      </table></div>
      {!customers.currentData.items.length ? <p>No customers are available for this product.</p> : null}
      <PageControls label="customers" offset={offset} limit={20} total={customers.currentData.total} busy={customers.isFetching} onChange={(next) => { setSelected(""); setOffset(next); }} />
    </> : null}
    {selected ? <CustomerDetail key={selected} scope={scope} productId={productId} customerId={selected} onClose={() => setSelected("")} /> : null}
  </section>;
}

function CustomerOnboardingForm({ scope, productId, onCreated }: {
  scope: ProductScope; productId: string; onCreated: (customer: ProductCustomer) => void;
}) {
  const [onboard, result] = useOnboardProductCustomerMutation();
  const [pending, setPending] = useState<OnboardingInput | null>(null);
  const [error, setError] = useState<unknown>();
  const [created, setCreated] = useState<ProductCustomer | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result.isLoading || created) return;
    const values = new FormData(event.currentTarget);
    const parsed = onboardingInputSchema.safeParse(pending ?? {
      idempotencyKey: crypto.randomUUID(), factoryName: values.get("factoryName"), ownerName: values.get("ownerName"),
      ownerEmail: String(values.get("ownerEmail") ?? "").trim(),
      ...(values.get("existingOwnerUserId") ? { existingOwnerUserId: values.get("existingOwnerUserId") } : {}),
    });
    if (!parsed.success) { setError({ message: "Enter valid factory/owner names, an email address and, if explicitly selected, an existing owner UUID." }); return; }
    setPending(parsed.data); setError(undefined);
    try {
      const customer = await onboard({ ...scope, productId, body: parsed.data }).unwrap();
      setCreated(customer); onCreated(customer);
    } catch (caught) {
      setError(caught);
      if (caught && typeof caught === "object" && "data" in caught &&
          caught.data && typeof caught.data === "object" && "code" in caught.data &&
          caught.data.code === "OWNER_IDENTITY_EXISTS") {
        setPending(null);
      }
    }
  }
  if (created) return <div role="status" className="space-y-2 rounded border p-4">
    <p>{created.factoryName} was recorded. Approval: {created.organizationStatus}; subscription: {created.subscriptionStatus}; invitation: {created.invitation.status}.</p>
    <p>Invitation acceptance does not confirm payment or activate a subscription.</p>
    <Button type="button" variant="outline" onClick={() => { setCreated(null); setPending(null); result.reset(); }}>Start another onboarding request</Button>
  </div>;
  return <form onSubmit={submit} className="space-y-3 rounded border p-4" aria-label="Onboard factory">
    <h3 className="font-semibold">Invite a factory owner</h3>
    <fieldset disabled={result.isLoading || Boolean(pending)} className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Factory and invited owner</legend>
      <label>Factory name<input name="factoryName" required minLength={2} maxLength={255} className="mt-1 w-full rounded border p-2" /></label>
      <label>Owner name<input name="ownerName" required minLength={2} maxLength={255} className="mt-1 w-full rounded border p-2" /></label>
      <label>Owner email<input name="ownerEmail" required type="email" maxLength={255} autoComplete="email" className="mt-1 w-full rounded border p-2" /></label>
      <label>Existing owner user ID (explicit invitation only)<input name="existingOwnerUserId" className="mt-1 w-full rounded border p-2" /></label>
      <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" required />I am authorized to request this factory and explicitly invite this owner. A matching email never grants membership automatically.</label>
    </fieldset>
    {error ? <FoundationError error={error} /> : null}
    {pending ? <p className="text-sm">This request keeps the same idempotency key and details when retried. Check the customer list before starting another request after an uncertain response.</p> : null}
    <Button type="submit" disabled={result.isLoading}>{result.isLoading ? "Recording request..." : pending ? "Retry same onboarding request" : "Record factory and owner invitation"}</Button>
  </form>;
}

function CustomerDetail({ scope, productId, customerId, onClose }: {
  scope: ProductScope; productId: string; customerId: string; onClose: () => void;
}) {
  const query = useGetProductCustomerQuery({ ...scope, productId, customerId });
  return <section aria-label="Customer details" className="space-y-3 rounded border p-4">
    <Button type="button" variant="outline" onClick={onClose}>Close customer details</Button>
    {query.isFetching ? <p role="status">Loading customer details...</p> : null}
    {query.error ? <FoundationError error={query.error} onRetry={() => { void query.refetch(); }} /> : null}
    {query.currentData && !query.isError ? <>
      <CustomerMetadata customer={query.currentData} />
      {scope.platform ? <CustomerAccessAdmin key={`${query.currentData.organizationId}:${query.currentData.subscriptionId}`} customer={query.currentData} /> : null}
    </> : null}
  </section>;
}

function CustomerMetadata({ customer }: { customer: ProductCustomer }) {
  return <div className="space-y-2">
    <h3 className="font-semibold">{customer.factoryName}</h3>
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      {Object.entries({
        "Factory ID": customer.organizationId, "Product ID": customer.productId, "Invited owner ID": customer.ownerUserId,
        "Factory approval": customer.organizationStatus, "Subscription": customer.subscriptionStatus,
        "Invitation": customer.invitation.status, "Invitation expires": customer.invitation.expiresAt,
        "Requested at": customer.createdAt,
      }).map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="break-all">{value}</dd></div>)}
    </dl>
    <p className="text-sm">An accepted invitation is separate from factory approval, subscription activation and explicit product grants. No payment has been collected by this screen.</p>
  </div>;
}
