import type { BaseQueryApi, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

export type ContextTransport = {
  productRuntime: (
    args: string | FetchArgs,
    api: BaseQueryApi,
  ) => Promise<{ data: unknown } | { error: FetchBaseQueryError }>;
};

export function isContextTransport(extra: unknown): extra is ContextTransport {
  return typeof extra === "object" && extra !== null &&
    "productRuntime" in extra && typeof extra.productRuntime === "function";
}
