import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "@/services/baseApi";
import { ContextModuleStore } from "../runtime/ContextModuleStore";
import { ProductRuntimeProvider } from "../runtime/client";
import { runtimeBootstrap } from "./runtimeFixtures";

const api = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    contextualTransportProbe: builder.query<{ name: string }, void>({
      query: () => "/api/inventory/items",
    }),
    contextualMutationProbe: builder.mutation<{ name: string }, void>({
      query: () => ({ url: "/api/inventory/items", method: "POST", body: { name: "Steel" } }),
      transformResponse: (response: { success: boolean; data: { name: string } }) => response.data,
    }),
    contextualDeniedProbe: builder.query<unknown, void>({
      query: () => "/api/ai/chat",
    }),
  }),
});

function Probe({ denied = false }: { denied?: boolean }) {
  const query = api.useContextualTransportProbeQuery(undefined, { skip: denied });
  const blocked = api.useContextualDeniedProbeQuery(undefined, { skip: !denied });
  const [save, mutation] = api.useContextualMutationProbeMutation();
  return <div>
    <p>{query.data?.name}</p>
    <p>{mutation.data?.name}</p>
    {blocked.isError ? <p>Denied without fallback</p> : null}
    <button onClick={() => void save()}>Save probe</button>
  </div>;
}

function Workspace({ data = runtimeBootstrap(), denied = false }) {
  return <ProductRuntimeProvider key={data.session.contextGeneration} data={data}>
    <ContextModuleStore><Probe denied={denied} /></ContextModuleStore>
  </ProductRuntimeProvider>;
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("isolated existing-module transport", () => {
  it("preserves legacy mutation envelopes and never reads bearer storage or calls the direct origin", async () => {
    localStorage.setItem("token", "legacy-bearer-must-stay-direct");
    const storage = vi.spyOn(Storage.prototype, "getItem");
    const network = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => new Response(JSON.stringify({
      success: true, message: "OK", data: init.method === "POST"
        ? { success: true, message: "Saved", data: { name: "Created through legacy transform" } }
        : { name: "Read through confidential transport" },
    })));
    vi.stubGlobal("fetch", network);
    render(<Workspace />);
    expect(await screen.findByText("Read through confidential transport")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Save probe"));
    expect(await screen.findByText("Created through legacy transform")).toBeInTheDocument();
    expect(storage).not.toHaveBeenCalled();
    expect(network).toHaveBeenCalledTimes(2);
    for (const [url, init] of network.mock.calls) {
      expect(url).toBe("/api/product-runtime/api/inventory/items");
      expect(init).toMatchObject({ credentials: "same-origin", cache: "no-store", redirect: "error" });
      expect(new Headers(init.headers).get("authorization")).toBeNull();
    }
    expect(new Headers(network.mock.calls[1][1].headers).get("X-CSRF-Token")).toBe(runtimeBootstrap().csrfToken);
  });

  it("does not fetch unreviewed endpoints and does not fall back to the direct bearer transport", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    render(<Workspace denied />);
    expect(await screen.findByText("Denied without fallback")).toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
  });

  it("refetches identical query arguments in a new context store instead of reusing the old cache", async () => {
    const network = vi.fn()
      .mockImplementationOnce(async () => new Response(JSON.stringify({ success: true, message: "OK", data: { name: "Factory A" } })))
      .mockImplementationOnce(async () => new Response(JSON.stringify({ success: true, message: "OK", data: { name: "Factory B" } })));
    vi.stubGlobal("fetch", network);
    const first = runtimeBootstrap();
    const view = render(<Workspace data={first} />);
    expect(await screen.findByText("Factory A")).toBeInTheDocument();
    const second = runtimeBootstrap();
    const otherFactory = "66666666-6666-4666-8666-666666666666";
    second.session.context!.organizationId = otherFactory;
    second.session.context!.organizationName = "Factory Two";
    second.session.principal!.organizationId = otherFactory;
    second.entitlements!.organizationId = otherFactory;
    second.contextOptions.items[0].organizationId = otherFactory;
    second.contextOptions.items[0].label = "Factory Two";
    second.session.contextGeneration = "fresh-generation";
    second.entitlements!.contextGeneration = "fresh-generation";
    view.rerender(<Workspace data={second} />);
    expect(screen.queryByText("Factory A")).not.toBeInTheDocument();
    expect(await screen.findByText("Factory B")).toBeInTheDocument();
    await waitFor(() => expect(network).toHaveBeenCalledTimes(2));
    expect(new Headers(network.mock.calls[1][1].headers).get("X-Factory1-Context-Generation")).toBe("fresh-generation");
  });
});
