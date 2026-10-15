"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  authBootstrapSchema,
  bffEnvelopeSchema,
  contextChangeBrowserSchema,
  logoutResultSchema,
  type AuthBootstrap,
} from "../auth/contracts";
import { hasOperationalAccess } from "../runtime/access";
import { ProductWorkspace } from "../runtime/ProductWorkspace";

type ViewState =
  | { phase: "loading" }
  | { phase: "signed-out"; message: string }
  | { phase: "error"; message: string }
  | { phase: "ready"; data: AuthBootstrap };

function errorMessage(code: unknown) {
  switch (code) {
    case "INVALID_CONTEXT":
      return "This factory is no longer available for this product. Refresh to see current access.";
    case "ENTITLEMENTS_NOT_READY":
      return "Your sign-in is valid, but factory workspace authorization is not ready.";
    case "CSRF_INVALID":
      return "This request could not be verified. Refresh and try again.";
    case "LOGOUT_UNCONFIRMED":
      return "You are signed out on this browser, but server revocation could not be confirmed.";
    case "SSO_DISABLED":
      return "Central sign-in is not enabled for this product address.";
    case "AUTH_UNAVAILABLE":
    case "STOREFRONT_UNAVAILABLE":
      return "Partner sign-in is temporarily unavailable. Try again later.";
    default:
      return "The request could not be completed. Refresh and try again.";
  }
}

async function responseCode(response: Response) {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object" && "code" in value ? value.code : undefined;
  } catch {
    return undefined;
  }
}

export function PartnerSessionGate({ operationalEnabled = false }: { operationalEnabled?: boolean }) {
  const [view, setView] = useState<ViewState>({ phase: "loading" });
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [busy, setBusy] = useState(false);
  const mutation = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(window.location.search);
    const authError = query.get("authError");
    const callbackMessage = authError === "cancelled"
      ? "Sign-in was canceled."
      : authError === "invalid"
        ? "The sign-in response could not be verified. Start again."
        : authError === "unavailable"
          ? "Sign-in is temporarily unavailable. Try again later."
          : "";

    void fetch("/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then(async (response) => {
      if (response.status === 401) {
        setView({ phase: "signed-out", message: callbackMessage });
        return;
      }
      if (!response.ok) {
        setView({ phase: "error", message: errorMessage(await responseCode(response)) });
        return;
      }
      const parsed = bffEnvelopeSchema(authBootstrapSchema).safeParse(await response.json());
      if (!parsed.success) {
        setView({ phase: "error", message: "The sign-in response could not be verified. Refresh and try again." });
        return;
      }
      setSelectedOrganizationId(
        parsed.data.data.session.context?.organizationId ??
          parsed.data.data.contextOptions.items[0]?.organizationId ?? "",
      );
      setView({ phase: "ready", data: parsed.data.data });
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setView({ phase: "error", message: "Partner sign-in is temporarily unavailable. Try again later." });
    });
    return () => {
      controller.abort();
      mutation.current?.abort();
    };
  }, []);

  async function chooseContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.phase !== "ready" || !selectedOrganizationId || busy) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    try {
      const response = await fetch("/auth/context", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": view.data.csrfToken,
        },
        body: JSON.stringify({ organizationId: selectedOrganizationId }),
        signal: controller.signal,
      });
      if (!response.ok) {
        setView({ phase: "error", message: errorMessage(await responseCode(response)) });
        return;
      }
      const parsed = bffEnvelopeSchema(contextChangeBrowserSchema).safeParse(await response.json());
      if (!parsed.success || parsed.data.data.context.organizationId !== selectedOrganizationId) {
        setView({ phase: "error", message: "The factory context could not be verified. Refresh and try again." });
        return;
      }
      controller.abort();
      window.location.assign("/");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setView({ phase: "error", message: "The factory context could not be changed. Refresh and try again." });
      }
    } finally {
      if (mutation.current === controller) mutation.current = null;
      setBusy(false);
    }
  }

  async function signOut(scope: "domain" | "all") {
    if (view.phase !== "ready" || busy) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true);
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": view.data.csrfToken,
        },
        body: JSON.stringify({ scope }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const code = await responseCode(response);
        if (code === "LOGOUT_UNCONFIRMED") {
          setView({ phase: "signed-out", message: errorMessage(code) });
          return;
        }
        setView({ phase: "error", message: errorMessage(code) });
        return;
      }
      const parsed = bffEnvelopeSchema(logoutResultSchema).safeParse(await response.json());
      if (!parsed.success || parsed.data.data.scope !== scope || !parsed.data.data.revoked) {
        setView({ phase: "error", message: "The sign-out response could not be verified. Reload and try again." });
        return;
      }
      setView({
        phase: "signed-out",
        message: scope === "all" ? "You have been signed out everywhere." : "You have been signed out on this product address.",
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setView({ phase: "error", message: "Sign-out could not be confirmed. Try again." });
      }
    } finally {
      if (mutation.current === controller) mutation.current = null;
      setBusy(false);
    }
  }

  if (view.phase === "loading") {
    return <p role="status" aria-live="polite">Checking your sign-in and factory access…</p>;
  }

  if (view.phase === "signed-out") {
    return (
      <div className="space-y-3">
        {view.message ? <p role="status" aria-live="polite">{view.message}</p> : null}
        <a
          href="/auth/start"
          className="inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Sign in
        </a>
      </div>
    );
  }

  if (view.phase === "error") {
    return (
      <div className="space-y-3">
        <p role="alert" aria-live="assertive">{view.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Reload
        </button>
      </div>
    );
  }

  const { session, contextOptions, entitlements } = view.data;
  const selectedContext = session.context;
  const contexts = contextOptions.items;
  const operational = operationalEnabled && hasOperationalAccess(view.data);

  return (
    <div className="w-full space-y-5" aria-busy={busy}>
      <p role="status" aria-live="polite">
        Signed in. Factory selection is checked against your membership, active subscription, and explicit product grant.
      </p>
      {selectedContext ? (
        <section aria-labelledby="active-context-heading" className="space-y-2">
          <h2 id="active-context-heading" className="text-lg font-semibold">Current factory</h2>
          <p>{selectedContext.organizationName} · {selectedContext.productName}</p>
          {entitlements?.modules.length ? (
            <div>
              <h3 className="text-sm font-medium">Effective modules</h3>
              <ul className="mt-1 flex flex-wrap gap-2" aria-label={operational ? "Effective modules" : "Effective modules; workspace unavailable"}>
                {entitlements.modules.map((module) => (
                  <li key={module} className="rounded border px-2 py-1 text-sm">{module}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-sm text-slate-700">
            {operational
              ? "Factory authorization is enforced for the reviewed operational workspace."
              : entitlements?.ready
              ? "Your effective access is verified, but operational workspace routes remain unavailable in this rollout."
              : "Your context is selected, but effective access is not ready. Operational workspace routes remain unavailable."}
          </p>
        </section>
      ) : null}
      {contexts.length > 0 && (!selectedContext || contexts.length > 1) ? (
        <form onSubmit={chooseContext} className="space-y-3">
          <label htmlFor="partner-factory-context" className="block text-sm font-medium">
            {selectedContext ? "Switch factory" : "Choose an authorized factory"}
          </label>
          <select
            id="partner-factory-context"
            value={selectedOrganizationId}
            onChange={(event) => setSelectedOrganizationId(event.target.value)}
            className="min-h-11 w-full rounded-md border bg-white px-3 py-2"
            required
            disabled={busy}
          >
            {contexts.map((context) => (
              <option key={context.organizationId} value={context.organizationId}>
                {context.label} · {context.productName}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy || !selectedOrganizationId ||
              selectedContext?.organizationId === selectedOrganizationId}
            className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {busy ? "Verifying factory…" : selectedContext ? "Switch factory" : "Continue"}
          </button>
        </form>
      ) : null}
      {!selectedContext && !contexts.length ? (
        <p role="status">
          No factory is currently eligible for this product. A factory membership, active subscription, and explicit product grant are all required.
        </p>
      ) : null}
      {operational && !busy ? <ProductWorkspace data={view.data} /> : null}
      <div className="flex flex-wrap gap-3 border-t pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void signOut("domain")}
          className="min-h-11 rounded-md border px-3 py-2 text-sm underline disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Sign out here
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void signOut("all")}
          className="min-h-11 rounded-md border px-3 py-2 text-sm underline disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Sign out everywhere
        </button>
      </div>
    </div>
  );
}
