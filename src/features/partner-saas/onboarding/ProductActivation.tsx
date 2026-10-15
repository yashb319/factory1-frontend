"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { passwordSchema, passwordPolicyDescription } from "@/lib/passwordPolicy";
import { authBootstrapSchema, bffEnvelopeSchema } from "../auth/contracts";
import { invitationResultSchema } from "./contracts";

const challengeSchema = bffEnvelopeSchema(z.object({ csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict());
const control = "min-h-11 w-full rounded border bg-white px-3 py-2";
const button = "min-h-11 rounded border px-3 py-2 disabled:opacity-50";

export function ProductActivation() {
  const token = useRef("");
  const [csrf, setCsrf] = useState("");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState<z.infer<typeof invitationResultSchema> | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const values = new URLSearchParams(window.location.search).getAll("token");
    if (values.length === 1 && values[0].length >= 32 && values[0].length <= 4096) token.current = values[0];
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    if (!token.current) setError("This invitation link is missing or invalid. Open the original invitation for this product.");
    return () => { pending.current?.abort(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = fields.get("password");
    if (mode === "new" && (!passwordSchema.safeParse(password).success || password !== fields.get("confirmPassword"))) {
      setError("Passwords must match. " + passwordPolicyDescription); return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError("");
    try {
      let csrfToken = csrf;
      if (mode === "new") {
        const challenge = await fetch("/auth/invitation", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const parsed = challenge.ok ? challengeSchema.safeParse(await challenge.json()) : null;
        if (!parsed?.success) { setError("Invitation verification is unavailable. Try again later."); return; }
        csrfToken = parsed.data.data.csrfToken;
      } else if (!csrfToken) {
        const session = await fetch("/auth/session", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const parsed = session.ok ? bffEnvelopeSchema(authBootstrapSchema).safeParse(await session.json()) : null;
        if (!parsed?.success) { setError("Sign in with the explicitly invited account in the separate tab, then try accepting here again."); return; }
        csrfToken = parsed.data.data.csrfToken;
        setCsrf(csrfToken);
      }
      const response = await fetch(mode === "new" ? "/auth/invitation" : "/auth/invitation/accept", {
        method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal,
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ token: token.current, ...(mode === "new" ? { password } : {}) }),
      });
      if (!response.ok) {
        setCsrf("");
        setError(response.status === 401 ? "Your sign-in expired. Sign in with the invited account and try again." :
          response.status === 400 || response.status === 403 ? "This invitation could not be accepted. It may be expired, revoked, for another product or for a different account." :
          "Invitation acceptance could not be confirmed. Check your factory access before retrying.");
        return;
      }
      const parsed = bffEnvelopeSchema(invitationResultSchema).safeParse(await response.json());
      if (!parsed.success) { setError("The invitation response could not be verified. Check factory access before retrying."); return; }
      token.current = ""; form.reset(); setAccepted(parsed.data.data);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setError("The server could not be reached. Invitation acceptance was not confirmed.");
    } finally {
      if (pending.current === controller) pending.current = null;
      setBusy(false);
    }
  }

  if (accepted) return <section className="space-y-3" aria-label="Invitation accepted">
    <h2 className="text-xl font-semibold">Invitation accepted</h2>
    <p role="status">Factory membership was explicitly accepted. Subscription: {accepted.subscriptionStatus}.</p>
    <p>Approval and subscription activation remain separate. No payment or automatic sign-in was performed.</p>
    <button type="button" onClick={() => window.location.assign("/")} className="underline">Check factory access</button>
  </section>;
  return <form onSubmit={submit} className="space-y-4" aria-label="Accept factory owner invitation" aria-busy={busy}>
    <h2 className="text-xl font-semibold">Accept your factory invitation</h2>
    <p>Accept only if you recognize the factory invitation from this product. A matching email address never grants membership automatically.</p>
    {error ? <p role="alert">{error}</p> : null}
    <fieldset disabled={busy} className="space-y-3">
      <legend className="sr-only">Invited identity</legend>
      <label>Account type<select className={control} value={mode} onChange={(event) => { setMode(event.target.value === "existing" ? "existing" : "new"); setCsrf(""); }}>
        <option value="new">I was invited to create a new identity</option><option value="existing">I already have the explicitly invited account</option>
      </select></label>
      {mode === "new" ? <>
        <p className="text-sm">{passwordPolicyDescription}</p>
        <label>New password<input className={control} name="password" type="password" autoComplete="new-password" required maxLength={512} /></label>
        <label>Confirm new password<input className={control} name="confirmPassword" type="password" autoComplete="new-password" required maxLength={512} /></label>
      </> : <>
        <p>Sign in with the explicitly invited account in a separate tab, then return here to accept. This invitation is kept only in this page&apos;s memory.</p>
        <a href="/auth/start" target="_blank" rel="noopener noreferrer" className="underline">Sign in in a separate tab</a>
      </>}
      <label className="flex items-center gap-2"><input type="checkbox" required />I explicitly accept the invited factory membership.</label>
      <button className={button} disabled={busy}>{busy ? "Verifying invitation..." : "Accept factory invitation"}</button>
    </fieldset>
  </form>;
}
