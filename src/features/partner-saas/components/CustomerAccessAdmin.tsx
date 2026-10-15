"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { accessScope } from "@/features/auth/accessScope";
import { useAppSelector } from "@/lib/hook";
import {
  useGetTenantMembershipsQuery, useCreateTenantMembershipMutation, useUpdateTenantMembershipMutation,
  useGetUserProductGrantsQuery, useCreateUserProductGrantMutation, useRevokeUserProductGrantMutation,
} from "../api";
import { tenantMembershipSchema, type ProductCustomer } from "../onboarding/contracts";
import { FoundationError, PageControls } from "./FoundationFeedback";

const control = "min-h-11 rounded border bg-white px-3 py-2";
type Membership = z.infer<typeof tenantMembershipSchema>;

export function CustomerAccessAdmin({ customer }: { customer: ProductCustomer }) {
  const user = useAppSelector((state) => state.auth.user);
  if (accessScope(user) !== "platform") return null;
  return <section className="space-y-5 border-t pt-4" aria-label="Platform factory access administration">
    <h3 className="font-semibold">Platform-only explicit access administration</h3>
    <p className="text-sm">Factory membership and product grants are independent. Use an explicitly verified user ID; never infer identity from an email or employee record. These changes do not approve a factory, activate a subscription or collect payment.</p>
    <MembershipAdmin organizationId={customer.organizationId} />
    <GrantAdmin subscriptionId={customer.subscriptionId} />
  </section>;
}

function MembershipAdmin({ organizationId }: { organizationId: string }) {
  const [offset, setOffset] = useState(0);
  const query = useGetTenantMembershipsQuery({ organizationId, offset, limit: 20 });
  const [create, creating] = useCreateTenantMembershipMutation();
  const [update, updating] = useUpdateTenantMembershipMutation();
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Membership | null>(null);
  const busy = creating.isLoading || updating.isLoading || query.isFetching;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const userId = z.uuid().safeParse(values.get("userId"));
    const role = tenantMembershipSchema.shape.role.safeParse(values.get("role"));
    const status = tenantMembershipSchema.shape.status.safeParse(values.get("status") ?? "ACTIVE");
    if (!userId.success || !role.success || !status.success) { setError({ message: "Select a valid user ID, factory role and membership status." }); return; }
    setError(undefined); setNotice("");
    try {
      if (selected) await update({ ...selected, role: role.data, status: status.data }).unwrap();
      else await create({ organizationId, userId: userId.data, role: role.data }).unwrap();
      setNotice("Explicit factory membership saved. Product grants and subscription readiness remain separate.");
      setSelected(null); form.reset();
    } catch (caught) { setError(caught); }
  }

  return <section className="space-y-3" aria-label="Factory memberships">
    <h4 className="font-medium">Factory memberships</h4>
    {query.error ? <FoundationError error={query.error} onRetry={() => { setSelected(null); void query.refetch(); }} /> : null}
    {query.isFetching ? <p role="status">Loading factory memberships...</p> : null}
    {query.currentData && !query.isError ? <>
      <ul className="space-y-2">{query.currentData.items.map((membership) => <li key={membership.userId} className="flex flex-wrap items-center gap-3 rounded border p-3">
        <span className="break-all">{membership.userId} · {membership.role} · {membership.status}</span>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(membership)}>Edit membership {membership.userId}</Button>
      </li>)}</ul>
      <PageControls label="memberships" offset={offset} limit={20} total={query.currentData.total} busy={busy} onChange={(next) => { setSelected(null); setOffset(next); }} />
      <form key={selected ? `${selected.userId}:${selected.version}` : "new"} onSubmit={submit} className="space-y-3 rounded border p-3" aria-label={selected ? "Edit explicit factory membership" : "Create explicit factory membership"}>
        <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
          <legend className="font-medium">{selected ? "Edit explicit membership" : "Create explicit membership"}</legend>
          <label>User ID<input name="userId" className={control} required readOnly={Boolean(selected)} defaultValue={selected?.userId ?? ""} /></label>
          <label>Factory role<select name="role" className={control} defaultValue={selected?.role ?? "EMPLOYEE"}>
            {tenantMembershipSchema.shape.role.options.map((role) => <option key={role}>{role}</option>)}
          </select></label>
          {selected ? <label>Membership status<select name="status" className={control} defaultValue={selected.status}>
            {tenantMembershipSchema.shape.status.options.map((status) => <option key={status}>{status}</option>)}
          </select></label> : null}
          <label className="flex items-center gap-2"><input type="checkbox" required />I explicitly authorize this membership change.</label>
          <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save explicit membership"}</Button>
          {selected ? <Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(null)}>Cancel membership edit</Button> : null}
        </fieldset>
      </form>
    </> : null}
    {error ? <FoundationError error={error} /> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </section>;
}

function GrantAdmin({ subscriptionId }: { subscriptionId: string }) {
  const [offset, setOffset] = useState(0);
  const query = useGetUserProductGrantsQuery({ subscriptionId, offset, limit: 20 });
  const [create, creating] = useCreateUserProductGrantMutation();
  const [revoke, revoking] = useRevokeUserProductGrantMutation();
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState("");
  const busy = query.isFetching || creating.isLoading || revoking.isLoading;

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const id = z.uuid().safeParse(new FormData(form).get("userId"));
    if (!id.success) { setError({ message: "Enter the explicitly authorized user UUID." }); return; }
    setError(undefined); setNotice("");
    try {
      await create({ subscriptionId, userId: id.data }).unwrap();
      setNotice("Explicit product grant saved. Factory membership and subscription readiness are still required.");
      form.reset();
    } catch (caught) { setError(caught); }
  }

  async function remove(event: FormEvent) {
    event.preventDefault();
    if (busy || !selected) return;
    setError(undefined); setNotice("");
    try {
      await revoke({ subscriptionId, userId: selected }).unwrap();
      setSelected(""); setNotice("Product grant revoked. Factory membership was not changed.");
    } catch (caught) { setError(caught); }
  }

  return <section className="space-y-3" aria-label="Explicit user product grants">
    <h4 className="font-medium">Explicit grants for this product subscription</h4>
    {query.isFetching ? <p role="status">Loading explicit product grants...</p> : null}
    {query.error ? <FoundationError error={query.error} onRetry={() => { setSelected(""); void query.refetch(); }} /> : null}
    {query.currentData && !query.isError ? <>
      <ul className="space-y-2">{query.currentData.items.map((grant) => <li key={grant.userId} className="flex flex-wrap items-center gap-3 rounded border p-3">
        <span className="break-all">{grant.userId}</span><Button type="button" variant="outline" disabled={busy} onClick={() => setSelected(grant.userId)}>Revoke grant {grant.userId}</Button>
      </li>)}</ul>
      <PageControls label="product grants" offset={offset} limit={20} total={query.currentData.total} busy={busy} onChange={(next) => { setSelected(""); setOffset(next); }} />
      <form onSubmit={grant} className="space-y-3 rounded border p-3" aria-label="Create explicit product grant">
        <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
          <legend className="font-medium">Create explicit product grant</legend>
          <label>User ID<input name="userId" className={control} required /></label>
          <label className="flex items-center gap-2"><input type="checkbox" required />I explicitly authorize this user for this product subscription.</label>
          <Button type="submit" disabled={busy}>{creating.isLoading ? "Saving..." : "Save explicit product grant"}</Button>
        </fieldset>
      </form>
      {selected ? <form onSubmit={remove} className="space-y-3 rounded border p-3" aria-label="Confirm grant revocation">
        <p className="break-all">Revoke this product subscription grant for {selected}?</p>
        <label className="flex items-center gap-2"><input type="checkbox" required disabled={busy} />I understand this removes product access but does not remove factory membership.</label>
        <Button type="submit" disabled={busy}>Confirm grant revocation</Button>{" "}
        <Button type="button" variant="outline" disabled={busy} onClick={() => setSelected("")}>Cancel grant revocation</Button>
      </form> : null}
    </> : null}
    {error ? <FoundationError error={error} /> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </section>;
}
