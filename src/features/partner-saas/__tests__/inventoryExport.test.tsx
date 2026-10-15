import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InventoryExport, inventoryExportDownloadSchema } from "../runtime/InventoryExport";
import { ProductRuntimeProvider } from "../runtime/client";
import { RuntimePermissionsContext } from "../runtime/permissions";
import { factoryId, runtimeBootstrap } from "./runtimeFixtures";

function workspace() {
  const data = runtimeBootstrap();
  data.entitlements!.runtimeRoutes.push(
    { method: "POST", path: "/exports/inventory" },
    { method: "GET", path: "/exports/inventory/{id}" },
    { method: "GET", path: "/exports/inventory/{id}/download" },
  );
  return <ProductRuntimeProvider data={data}>
    <RuntimePermissionsContext.Provider value={data}><InventoryExport /></RuntimePermissionsContext.Provider>
  </ProductRuntimeProvider>;
}
const status = (state = "PENDING", expiresAt = new Date(Date.now() + 900_000).toISOString()) => ({
  id: factoryId, status: state, expiresAt, errorCode: state === "FAILED" ? "EXPORT_TOO_LARGE" : null,
});
const envelope = (data: unknown) => new Response(JSON.stringify({ success: true, message: "OK", data }));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("contextual bounded inventory export", () => {
  it("accepts exactly 1000 complete inventory DTO rows but rejects 1001 rows, truncation and malformed values", () => {
    const row = { id: factoryId, itemCode: "ITEM-1", name: "Steel", itemType: "RAW_MATERIAL",
      unit: "kg", currentStock: 2, minimumStock: 1, inventoryValue: 10, lowStock: false, outOfStock: false, status: "ACTIVE" };
    const payload = { id: factoryId, rows: Array.from({ length: 1000 }, () => row), truncated: false };
    expect(inventoryExportDownloadSchema.safeParse(payload).success).toBe(true);
    expect(inventoryExportDownloadSchema.safeParse({ ...payload, rows: [...payload.rows, row] }).success).toBe(false);
    expect(inventoryExportDownloadSchema.safeParse({ ...payload, truncated: true }).success).toBe(false);
    expect(inventoryExportDownloadSchema.safeParse({ ...payload, rows: [{ ...row, inventoryValue: "10" }] }).success).toBe(false);
  });
  it("requires a completed rechecked job before downloading validated JSON, without local export persistence", async () => {
    const createObjectURL = vi.fn(() => "blob:context-inventory");
    const revokeObjectURL = vi.fn();
    class TestURL extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal("URL", TestURL);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const network = vi.fn()
      .mockImplementationOnce(async () => envelope(status()))
      .mockImplementationOnce(async () => envelope(status("COMPLETED")))
      .mockImplementationOnce(async () => envelope({ id: factoryId, rows: [], truncated: false }));
    vi.stubGlobal("fetch", network);
    render(workspace());
    fireEvent.click(screen.getByText("Request inventory export"));
    expect(await screen.findByRole("status")).toHaveTextContent("PENDING");
    expect(screen.getByText("Download inventory JSON")).toBeDisabled();
    fireEvent.click(screen.getByText("Check export status"));
    await waitFor(() => expect(screen.getByText("Download inventory JSON")).toBeEnabled());
    fireEvent.click(screen.getByText("Download inventory JSON"));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce());
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:context-inventory");
    expect(storage).not.toHaveBeenCalled();
    expect(network.mock.calls.map(([url]) => url)).toEqual([
      "/api/product-runtime/exports/inventory",
      `/api/product-runtime/exports/inventory/${factoryId}`,
      `/api/product-runtime/exports/inventory/${factoryId}/download`,
    ]);
    expect(network.mock.calls[0][1].body).toBe("{}");
  });

  it.each([
    ["FAILED", new Date(Date.now() + 900_000).toISOString(), "EXPORT_TOO_LARGE"],
    ["COMPLETED", "2020-01-01T00:00:00Z", "COMPLETED"],
    ["DENIED", new Date(Date.now() + 900_000).toISOString(), "DENIED"],
  ])("does not download a %s or expired job", async (state, expiry, expected) => {
    const network = vi.fn().mockImplementation(async () => envelope(status(state, expiry)));
    vi.stubGlobal("fetch", network);
    render(workspace());
    fireEvent.click(screen.getByText("Request inventory export"));
    expect(await screen.findByRole("status")).toHaveTextContent(expected);
    expect(screen.getByText("Download inventory JSON")).toBeDisabled();
    expect(network).toHaveBeenCalledOnce();
  });

  it("stops the workspace on ACCESS_CHANGED without automatically retrying the export mutation", async () => {
    const network = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      success: false, code: "ACCESS_CHANGED", message: "Changed",
    }), { status: 409 }));
    vi.stubGlobal("fetch", network);
    render(workspace());
    fireEvent.click(screen.getByText("Request inventory export"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your factory access changed");
    expect(screen.queryByText("Request inventory export")).not.toBeInTheDocument();
    expect(network).toHaveBeenCalledOnce();
  });
});
