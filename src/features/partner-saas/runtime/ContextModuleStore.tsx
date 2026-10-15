"use client";

import { configureStore } from "@reduxjs/toolkit";
import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { z } from "zod";
import type { FetchArgs } from "@reduxjs/toolkit/query";
import type { AuthState } from "@/features/auth/authSlice";
import { baseApi } from "@/services/baseApi";
import type { ContextTransport } from "@/services/contextTransport";
import { useProductRuntime } from "./client";
import { RuntimePermissionsContext } from "./permissions";

export function ContextModuleStore({ children }: { children: ReactNode }) {
  const { data, request } = useProductRuntime();
  const [store] = useState(() => {
    const auth: AuthState = { token: null, user: data.session.principal, generation: 0 };
    const transport: ContextTransport = {
      async productRuntime(args, api) {
        const input: FetchArgs = typeof args === "string" ? { url: args } : args;
        if (input.headers || input.credentials || input.responseHandler ||
            input.url.includes("#") || !input.url.startsWith("/api/")) {
          return { error: { status: 403, data: { code: "RUNTIME_ROUTE_DENIED" } } };
        }
        const url = new URL(input.url, "https://runtime.invalid");
        for (const [key, value] of Object.entries(input.params ?? {})) {
          if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
        }
        try {
          const result = await request(input.method ?? "GET", `${url.pathname}${url.search}`, z.unknown(), input.body);
          if (api.signal.aborted) return { error: { status: "CUSTOM_ERROR", error: "The context request was cancelled." } };
          return { data: result };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: error instanceof Error ? error.message : "The contextual operation failed." } };
        }
      },
    };
    return configureStore({
      reducer: { auth: () => auth, [baseApi.reducerPath]: baseApi.reducer },
      middleware: (defaults) => defaults({ thunk: { extraArgument: transport } }).concat(baseApi.middleware),
    });
  });
  useEffect(() => () => { store.dispatch(baseApi.util.resetApiState()); }, [store]);
  return <RuntimePermissionsContext.Provider value={data}>
    <Provider store={store}>{children}</Provider>
  </RuntimePermissionsContext.Provider>;
}
