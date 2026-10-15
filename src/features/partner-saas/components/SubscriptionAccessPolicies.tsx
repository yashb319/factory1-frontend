"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  useGetSubscriptionEntitlementsQuery, useUpdateSubscriptionEntitlementsMutation,
  useGetGrantPermissionsQuery, useUpdateGrantPermissionsMutation,
} from "../api";
import { subscriptionEntitlementsSchema, grantPermissionsSchema } from "../onboarding/contracts";
import { z } from "zod";
import { FoundationError } from "./FoundationFeedback";
import { ModuleSelection } from "./ModulePolicies";

export function SubscriptionEntitlementPolicy({ subscriptionId, productFeatures }: { subscriptionId: string; productFeatures: string[] }) {
  const query = useGetSubscriptionEntitlementsQuery({ subscriptionId });
  return <section className="space-y-3 rounded border p-3" aria-label="Factory subscription entitlements">
    <h4 className="font-medium">Factory-specific subscription module limits</h4>
    <p className="text-sm">This factory subscription can only narrow its reusable product bundle. Validity changes do not activate a subscription or represent payment evidence.</p>
    {query.isFetching ? <p role="status">Loading subscription entitlements...</p> : null}
    {query.error ? <FoundationError error={query.error} onRetry={() => { void query.refetch(); }} /> : null}
    {query.currentData && !query.isFetching && !query.isError ? <SubscriptionEditor key={query.currentData.version} policy={query.currentData} productFeatures={productFeatures} /> : null}
  </section>;
}

function SubscriptionEditor({ policy, productFeatures }: {
  policy: z.infer<typeof subscriptionEntitlementsSchema>; productFeatures: string[];
}) {
  const [keys, setKeys] = useState(policy.featureKeys);
  const [save, result] = useUpdateSubscriptionEntitlementsMutation();
  const [error, setError] = useState<unknown>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result.isLoading || keys.some((key) => !productFeatures.includes(key))) return;
    const values = new FormData(event.currentTarget);
    const parsed = subscriptionEntitlementsSchema.safeParse({
      ...policy, featureKeys: keys, validFrom: values.get("validFrom") || null, validUntil: values.get("validUntil") || null,
    });
    if (!parsed.success || (parsed.data.validFrom && parsed.data.validUntil &&
        Date.parse(parsed.data.validUntil) <= Date.parse(parsed.data.validFrom))) {
      setError({ message: "Use valid ISO timestamps with time zones and an end later than the start, or leave validity empty." }); return;
    }
    setError(undefined);
    try {
      await save({ subscriptionId: policy.subscriptionId, body: {
        featureKeys: parsed.data.featureKeys, validFrom: parsed.data.validFrom, validUntil: parsed.data.validUntil, expectedVersion: policy.version,
      } }).unwrap();
    } catch (caught) { setError(caught); }
  }
  return <form onSubmit={submit} className="space-y-3">
    <fieldset disabled={result.isLoading} className="space-y-3">
      <legend className="sr-only">Subscription module policy</legend>
      <ModuleSelection catalog={productFeatures} selected={keys} onChange={setKeys} />
      <label className="block text-sm">Valid from (ISO timestamp, optional)<input name="validFrom" className="mt-1 min-h-11 w-full rounded border p-2" defaultValue={policy.validFrom ?? ""} placeholder="2026-10-15T00:00:00Z" /></label>
      <label className="block text-sm">Valid until (ISO timestamp, optional)<input name="validUntil" className="mt-1 min-h-11 w-full rounded border p-2" defaultValue={policy.validUntil ?? ""} placeholder="2026-11-15T00:00:00Z" /></label>
      <label className="flex items-center gap-2"><input type="checkbox" required />I reviewed the factory subscription module/validity limits. This is not activation or payment.</label>
      <Button type="submit" disabled={result.isLoading || keys.some((key) => !productFeatures.includes(key))}>Save subscription limits</Button>
    </fieldset>
    {error ? <FoundationError error={error} /> : null}
  </form>;
}

export function GrantRolePolicy({ subscriptionId, userId, onClose }: { subscriptionId: string; userId: string; onClose: () => void }) {
  const query = useGetGrantPermissionsQuery({ subscriptionId, userId });
  return <section className="space-y-3 rounded border p-3" aria-label="Product grant role ceiling">
    <h4 className="font-medium">Product grant role ceiling</h4>
    <p className="break-all text-sm">User {userId}. This ceiling only narrows the factory membership role; it never elevates that membership.</p>
    {query.isFetching ? <p role="status">Loading grant permissions...</p> : null}
    {query.error ? <FoundationError error={query.error} onRetry={() => { void query.refetch(); }} /> : null}
    {query.currentData && !query.isFetching && !query.isError ? <GrantRoleEditor key={query.currentData.version} policy={query.currentData} /> : null}
    <Button type="button" variant="outline" onClick={onClose}>Close grant role policy</Button>
  </section>;
}

function GrantRoleEditor({ policy }: { policy: z.infer<typeof grantPermissionsSchema> }) {
  const [save, result] = useUpdateGrantPermissionsMutation();
  const [error, setError] = useState<unknown>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result.isLoading) return;
    const role = grantPermissionsSchema.shape.roleCeiling.safeParse(new FormData(event.currentTarget).get("roleCeiling"));
    if (!role.success) { setError({ message: "Select a valid role ceiling." }); return; }
    setError(undefined);
    try {
      await save({ subscriptionId: policy.subscriptionId, userId: policy.userId, body: { roleCeiling: role.data, expectedVersion: policy.version } }).unwrap();
    } catch (caught) { setError(caught); }
  }
  return <form onSubmit={submit} className="space-y-3">
    <fieldset disabled={result.isLoading} className="flex flex-wrap items-end gap-3">
      <legend className="sr-only">Grant permission limits</legend>
      <label>Maximum contextual role<select name="roleCeiling" className="min-h-11 rounded border bg-white p-2" defaultValue={policy.roleCeiling}>
        {grantPermissionsSchema.shape.roleCeiling.options.map((role) => <option key={role}>{role}</option>)}
      </select></label>
      <label className="flex items-center gap-2"><input type="checkbox" required />I explicitly reviewed this product-only role ceiling.</label>
      <Button type="submit" disabled={result.isLoading}>Save role ceiling</Button>
    </fieldset>
    {error ? <FoundationError error={error} /> : null}
  </form>;
}
