import type { Middleware, ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { logout, setCredentials } from "@/features/auth/authSlice";
import { baseApi } from "@/services/baseApi";

type CacheState = { baseApi: ReturnType<typeof baseApi.reducer> };

export const authCacheMiddleware: Middleware<
  Record<never, never>, CacheState, ThunkDispatch<CacheState, unknown, UnknownAction>
> = (api) => (next) => (action) => {
  if (logout.match(action) || setCredentials.match(action)) {
    // Stop old requests before any new identity/context can reuse void-argument caches.
    const queries = api.dispatch(baseApi.util.getRunningQueriesThunk());
    const mutations = api.dispatch(baseApi.util.getRunningMutationsThunk());
    for (const request of [...queries, ...mutations]) request.abort();
    api.dispatch(baseApi.util.resetApiState());
  }
  return next(action);
};
