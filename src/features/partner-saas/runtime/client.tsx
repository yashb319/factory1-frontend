"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { authBootstrapSchema, bffEnvelopeSchema, type AuthBootstrap } from "../auth/contracts";
import { runtimeRouteAllowed } from "./policy";

type RuntimeClient = {
  data: AuthBootstrap;
  request: <T>(method: string, path: string, schema: z.ZodType<T>, body?: unknown) => Promise<T>;
};
const RuntimeContext = createContext<RuntimeClient | null>(null);

export function useProductRuntime() {
  const context = useContext(RuntimeContext);
  if (!context) throw new Error("Product runtime must be mounted inside an authorized workspace");
  return context;
}

export class RuntimeRequestError extends Error {}

export function ProductRuntimeProvider({ data, children }: { data: AuthBootstrap; children: ReactNode }) {
  const [failure, setFailure] = useState("");
  const controllers = useRef(new Set<AbortController>());

  const stop = useCallback((message: string) => {
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
    setFailure(message);
  }, []);

  useEffect(() => {
    const pending = controllers.current;
    const timeout = window.setTimeout(() => stop("Your session expired. Sign in again."),
      Math.max(0, Math.min(Date.parse(data.session.expiresAt) - Date.now(), 2_147_483_647)));
    async function recheck() {
      const controller = new AbortController();
      pending.add(controller);
      try {
        const response = await fetch("/auth/session", {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const parsed = response.ok
          ? bffEnvelopeSchema(authBootstrapSchema).safeParse(await response.json()) : null;
        if (!parsed?.success ||
            JSON.stringify(parsed.data.data.session) !== JSON.stringify(data.session) ||
            JSON.stringify(parsed.data.data.entitlements) !== JSON.stringify(data.entitlements)) {
          stop("Your factory access changed or expired. Reload to verify current access.");
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          stop("Factory access could not be verified. Reload before continuing.");
        }
      } finally {
        pending.delete(controller);
      }
    }
    function focused() { if (document.visibilityState === "visible") void recheck(); }
    const interval = window.setInterval(() => void recheck(), 30_000);
    window.addEventListener("focus", focused);
    document.addEventListener("visibilitychange", focused);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener("focus", focused);
      document.removeEventListener("visibilitychange", focused);
      for (const controller of pending) controller.abort();
      pending.clear();
    };
  }, [data, stop]);

  const request = useCallback(async <T,>(method: string, path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> => {
    const entitlement = data.entitlements;
    const parsedUrl = new URL(path, "https://runtime.invalid");
    if (failure || parsedUrl.origin !== "https://runtime.invalid" || !entitlement ||
        !runtimeRouteAllowed(entitlement.runtimeRoutes, entitlement.role, method, parsedUrl.pathname, entitlement.modules)) {
      throw new RuntimeRequestError("This operation is not available for your selected product and role.");
    }
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      const response = await fetch(`/api/product-runtime${path}`, {
        method, credentials: "same-origin", cache: "no-store", signal: controller.signal,
        headers: {
          Accept: "application/json",
          "X-Factory1-Context-Generation": data.session.contextGeneration ?? "",
          ...(method === "GET" ? {} : { "X-CSRF-Token": data.csrfToken }),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if ([401, 403, 409].includes(response.status)) {
        stop("Your factory access changed or expired. Reload to verify current access.");
        throw new RuntimeRequestError("Factory context is no longer valid.");
      }
      if (!response.ok) throw new RuntimeRequestError("The server could not complete this operation. Check the details and try again.");
      const parsed = bffEnvelopeSchema(schema).safeParse(await response.json());
      if (!parsed.success) throw new RuntimeRequestError("The server response could not be verified. Reload before continuing.");
      return parsed.data.data;
    } catch (error) {
      if (error instanceof RuntimeRequestError || (error instanceof DOMException && error.name === "AbortError")) throw error;
      throw new RuntimeRequestError("The server could not be reached. Check your connection and retry.");
    } finally {
      controllers.current.delete(controller);
    }
  }, [data, failure, stop]);

  if (failure) return <div role="alert" className="space-y-3 rounded border border-red-300 p-4">
    <p>{failure}</p><a href="/" className="underline">Reload factory access</a>
  </div>;
  return <RuntimeContext.Provider value={{ data, request }}>{children}</RuntimeContext.Provider>;
}
