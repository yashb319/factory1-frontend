import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "@/services/baseApi";
import { createAppStore } from "@/lib/store";
import { logout, setCredentials } from "../authSlice";
import type { AuthUser } from "../types";

const identity: AuthUser = {
  id: "owner-a", name: "Owner A", email: "a@example.test", role: "OWNER",
  organizationId: "factory-a", organizationStatus: "ACTIVE", status: "ACTIVE",
};
const fixtureApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    scopeFixture: builder.query<{ privateValue: string }, void>({
      query: () => "https://api.example.test/private",
    }),
    scopeMutationFixture: builder.mutation<{ privateValue: string }, void>({
      query: () => ({ url: "https://api.example.test/private", method: "POST" }),
    }),
  }),
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("session cache isolation", () => {
  it.each(["logout", "factory", "role", "token"] as const)("clears cached queries on %s transition", async (change) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ privateValue: "factory-a" }), { headers: { "Content-Type": "application/json" } })));
    const store = createAppStore();
    store.dispatch(setCredentials({ token: "a", user: identity }));
    const request = store.dispatch(fixtureApi.endpoints.scopeFixture.initiate());
    expect(await request.unwrap()).toEqual({ privateValue: "factory-a" });
    expect(fixtureApi.endpoints.scopeFixture.select()(store.getState()).data).toBeDefined();
    store.dispatch(change === "logout" ? logout() : setCredentials({
      token: change === "token" ? "b" : "a",
      user: { ...identity, organizationId: change === "factory" ? "factory-b" : identity.organizationId, role: change === "role" ? "FINANCE" : "OWNER" },
    }));
    expect(fixtureApi.endpoints.scopeFixture.select()(store.getState()).data).toBeUndefined();
    expect(Object.keys(store.getState().baseApi.mutations)).toHaveLength(0);
    request.unsubscribe();
  });

  it("aborts old queries and mutations and discards late responses after a context replacement", async () => {
    const releases: ((response: Response) => void)[] = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { releases.push(resolve); })));
    const store = createAppStore();
    store.dispatch(setCredentials({ token: "a", user: identity }));
    const request = store.dispatch(fixtureApi.endpoints.scopeFixture.initiate());
    const mutation = store.dispatch(fixtureApi.endpoints.scopeMutationFixture.initiate());
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    store.dispatch(setCredentials({ token: "b", user: { ...identity, organizationId: "factory-b" } }));
    for (const release of releases) release(new Response(JSON.stringify({ privateValue: "old" })));
    await Promise.all([request, mutation]);
    expect(fixtureApi.endpoints.scopeFixture.select()(store.getState()).data).toBeUndefined();
    expect(Object.keys(store.getState().baseApi.mutations)).toHaveLength(0);
    request.unsubscribe();
  });
});
