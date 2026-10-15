import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextModuleStore } from "@/features/partner-saas/runtime/ContextModuleStore";
import { ProductRuntimeProvider } from "@/features/partner-saas/runtime/client";
import { runtimeBootstrap, factoryId } from "@/features/partner-saas/__tests__/runtimeFixtures";
import type { ProductionOrder } from "../types/production.types";
import type { RecordPreview } from "../types/productionFlow.types";
import { ContextExecutionBatches } from "../components/ContextExecutionBatches";

const stepId = "66666666-6666-4666-8666-666666666666";
const order: ProductionOrder = {
  id: factoryId, orderNumber: "RUN-001", productId: factoryId, plannedQuantity: 10,
  priority: "NORMAL", workflowVersionId: factoryId, responsibleUserId: factoryId,
  bomId: factoryId, bomVersionNumber: 1, bomBindingStatus: "PINNED",
  completedQuantity: 0, rejectedQuantity: 0, remainingQuantity: 10, workflowVersionNumber: 1,
  currentStepId: stepId, status: "IN_PROGRESS", executionVersion: 2, quantityModel: "FLOW_V1",
  steps: [{ id: stepId, name: "Packing", code: "PACK", sequenceNumber: 1, active: true,
    expectedVersion: 3, remainingQuantity: 10, status: "IN_PROGRESS" }],
  batch: { rootOrderId: factoryId, parentOrderId: null, childSequence: null, batchLabel: "Root",
    nodeType: "LEAF", isExecutable: true, isTerminal: false, closureOutcome: "NONE", familyVersion: 4 },
  quantities: { originalPlannedQuantity: 10, targetBasis: "CREATED", allocatedQuantity: 10,
    finalGoodQuantity: 0, scrapQuantity: 0, cancelledQuantity: 0, pendingQuantity: 10,
    legacyUnclassifiedQuantity: 0, reconciliationComplete: true },
  capabilities: { allowedActions: ["RECORD_GOOD"], blockedActions: [] },
};
const previewResult: RecordPreview = {
  previewToken: "reviewed-token", action: "RECORD_GOOD", sourceOrderId: factoryId, sourceStepId: stepId,
  expectedOrderVersion: 2, expectedStepVersion: 3, expectedFamilyVersion: 4, blockingReasons: [],
  finishedGoodCredit: 2, items: [], stockWarnings: [],
};
const batch = { id: "88888888-8888-4888-8888-888888888888", batchNumber: "LOT-A", productionOrderId: factoryId,
  orderStepSnapshotId: stepId, completedQuantity: 2, rejectedQuantity: 0, occurredAt: "2026-01-01T00:00:00Z" };
function bootstrap() {
  const data = runtimeBootstrap();
  data.entitlements!.modules = ["production_tracking", "inventory"];
  data.entitlements!.runtimeRoutes = [
    { method: "GET", path: "/api/production/orders" },
    { method: "GET", path: "/api/production/orders/{orderId}/execution-batches" },
    { method: "POST", path: "/api/production/orders/{orderId}/execution-batches" },
    { method: "POST", path: "/api/production/orders/{orderId}/steps/{stepId}/record-preview" },
  ];
  return data;
}
function workspace({ data = bootstrap(), value = order, onRefresh = vi.fn() } = {}) {
  return <ProductRuntimeProvider data={data}><ContextModuleStore>
    <ContextExecutionBatches order={value} refreshing={false} failed={false} onRefresh={onRefresh} />
  </ContextModuleStore></ProductRuntimeProvider>;
}
function mount(options: Parameters<typeof workspace>[0] = {}) {
  return render(workspace(options));
}
function network({ result = previewResult, conflict, previewConflict, uncertain = false, history }: {
  result?: unknown; conflict?: string; previewConflict?: string; uncertain?: boolean; history?: unknown;
} = {}) {
  let saved = false;
  const fetcher = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
    let data: unknown;
    if (url.endsWith("/execution-batches") && init.method === "GET") data = history ?? (saved ? [batch] : []);
    else if (url.endsWith("/record-preview") && init.method === "POST") {
      if (previewConflict) return new Response(JSON.stringify({ success: false, code: previewConflict }), { status: 409 });
      data = { success: true, message: "OK", data: result };
    } else if (url.endsWith("/execution-batches") && init.method === "POST") {
      if (conflict) return new Response(JSON.stringify({ success: false, code: conflict }), { status: 409 });
      if (uncertain) throw new TypeError("Connection closed");
      saved = true;
      data = { success: true, message: "OK", data: batch };
    } else throw new Error(`Unsupported call ${init.method} ${url}`);
    return new Response(JSON.stringify({ success: true, message: "OK", data }));
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
async function review() {
  await screen.findByText("No execution batches recorded yet.");
  fireEvent.change(screen.getByLabelText("Batch number"), { target: { value: "LOT-A" } });
  fireEvent.change(screen.getByLabelText("New good quantity"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Batch notes"), { target: { value: "Reviewed pack" } });
  fireEvent.click(screen.getByText("Review execution batch"));
  return screen.findByRole("button", { name: "Confirm reviewed action" });
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("contextual execution batch reuse", () => {
  it("reuses legacy transforms and sends string batch numbers, immutable versions, token, CSRF and no bearer", async () => {
    const fetcher = network();
    mount();
    const confirm = await review();
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(await screen.findByText("Output record LOT-A")).toBeInTheDocument();
    const writes = fetcher.mock.calls.filter(([url, init]) => url.endsWith("/execution-batches") && init.method === "POST");
    expect(writes).toHaveLength(1);
    const previewCall = fetcher.mock.calls.find(([url]) => url.endsWith("/record-preview"));
    expect(JSON.parse(String(previewCall?.[1].body))).toEqual({
      completedQuantity: 2, rejectedQuantity: 0, materialCoverage: [], expectedOrderVersion: 2,
      expectedStepVersion: 3, expectedFamilyVersion: 4, source: { type: "EXECUTION_BATCH", batchNumber: "LOT-A" },
      action: "RECORD_GOOD", notes: "Reviewed pack",
    });
    expect(JSON.parse(String(writes[0][1].body))).toEqual({
      orderStepSnapshotId: stepId, batchNumber: "LOT-A", completedQuantity: 2, rejectedQuantity: 0,
      notes: "Reviewed pack", expectedVersion: 2, expectedStepVersion: 3, expectedFamilyVersion: 4,
      requestId: expect.any(String), previewToken: "reviewed-token", materialCoverage: [],
    });
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toMatch(/^\/api\/product-runtime\/api\/production\/orders\//);
      expect(url).not.toMatch(/material-availability|material-consumptions|users|products|assignments/);
      expect(new Headers(init.headers).get("authorization")).toBeNull();
      if (init.method === "POST") expect(new Headers(init.headers).get("X-CSRF-Token")).toBe(bootstrap().csrfToken);
    }
  });

  it.each(["missing preview", "missing create", "missing history", "missing inventory", "denied module", "employee", "missing factory role"])(
    "never mounts mutation controls for %s", async (reason) => {
      const fetcher = network();
      const data = bootstrap();
      if (reason === "missing preview") data.entitlements!.runtimeRoutes = data.entitlements!.runtimeRoutes.filter((route) => !route.path.endsWith("record-preview"));
      if (reason === "missing create") data.entitlements!.runtimeRoutes = data.entitlements!.runtimeRoutes.filter((route) => route.method !== "POST" || !route.path.endsWith("execution-batches"));
      if (reason === "missing history") data.entitlements!.runtimeRoutes = data.entitlements!.runtimeRoutes.filter((route) => route.method !== "GET" || !route.path.endsWith("execution-batches"));
      if (reason === "missing inventory") data.entitlements!.modules = ["production_tracking"];
      if (reason === "denied module") data.entitlements!.moduleDecisions = [{ key: "inventory", enabled: false, reasons: ["PRODUCT_DISABLED"] }];
      if (reason === "employee") data.entitlements!.role = "EMPLOYEE";
      if (reason === "missing factory role") data.entitlements!.role = null;
      mount({ data });
      await waitFor(() => expect(screen.queryByText("Review execution batch")).not.toBeInTheDocument());
      expect(fetcher.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
    },
  );

  it.each(["stock warning", "blocker", "credit mismatch"])("blocks confirmation for %s", async (reason) => {
    network({ result: { ...previewResult,
      stockWarnings: reason === "stock warning" ? ["Not enough steel"] : [],
      blockingReasons: reason === "blocker" ? [{ code: "MANUAL_REQUIRED", message: "Manual coverage required", remediation: null }] : [],
      finishedGoodCredit: reason === "credit mismatch" ? 1 : 2,
    } });
    mount();
    expect(await review()).toBeDisabled();
  });

  it.each(["legacy", "inactive", "missing capability"])("keeps %s recording unavailable", async (reason) => {
    const fetcher = network();
    const value = structuredClone(order);
    if (reason === "legacy") value.quantityModel = "LEGACY";
    if (reason === "inactive") value.steps[0].active = false;
    if (reason === "missing capability") value.capabilities = undefined;
    mount({ value });
    await screen.findByText("No execution batches recorded yet.");
    const action = screen.queryByRole("button", { name: "Review execution batch" });
    if (action) expect(action).toBeDisabled();
    expect(fetcher.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
  });

  it("records an eligible intermediate step with zero finished-good credit and no material effects", async () => {
    const fetcher = network({ result: { ...previewResult, finishedGoodCredit: 0 } });
    const value = structuredClone(order);
    value.steps.push({ ...value.steps[0], id: factoryId, sequenceNumber: 2 });
    mount({ value });
    fireEvent.click(await review());
    expect(await screen.findByText("Output record LOT-A")).toBeInTheDocument();
    const writes = fetcher.mock.calls.filter(([url, init]) => url.endsWith("/execution-batches") && init.method === "POST");
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0][1].body))).toMatchObject({ completedQuantity: 2, materialCoverage: [] });
    expect(fetcher.mock.calls.some(([url]) => url.endsWith("/complete"))).toBe(false);
  });

  it("blocks an intermediate preview that unexpectedly credits finished goods", async () => {
    network();
    const value = structuredClone(order);
    value.steps.push({ ...value.steps[0], id: factoryId, sequenceNumber: 2 });
    mount({ value });
    expect(await review()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Inventory effects do not match");
  });

  it("blocks malformed previews without opening a confirmation", async () => {
    const fetcher = network({ result: { ...previewResult, stockWarnings: null } });
    mount();
    await screen.findByText("No execution batches recorded yet.");
    fireEvent.change(screen.getByLabelText("Batch number"), { target: { value: "LOT-A" } });
    fireEvent.change(screen.getByLabelText("New good quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("Review execution batch"));
    expect(await screen.findByRole("alert")).toHaveTextContent("material preview could not be verified");
    expect(screen.queryByRole("button", { name: "Confirm reviewed action" })).not.toBeInTheDocument();
    expect(fetcher.mock.calls).toHaveLength(2);
  });

  it("does not display or mutate a history row for a different order", async () => {
    const fetcher = network({ history: [{ ...batch, productionOrderId: stepId }] });
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be verified");
    expect(screen.queryByText("Output record LOT-A")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review execution batch" })).toBeDisabled();
    expect(fetcher.mock.calls).toHaveLength(1);
  });

  it("clears known conflicts without offering an uncertain retry", async () => {
    const fetcher = network({ conflict: "STALE_CONFIRMATION" });
    mount();
    fireEvent.click(await review());
    expect(await screen.findByRole("alert")).toHaveTextContent("versions are stale");
    expect(screen.queryByText("Retry identical confirmed request")).not.toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([url, init]) => url.endsWith("/execution-batches") && init.method === "POST")).toHaveLength(1);
  });

  it("blocks manual-allocation cases without fetching out-of-scope material APIs", async () => {
    const fetcher = network({ previewConflict: "MATERIAL_ALLOCATION_REQUIRED" });
    mount();
    await screen.findByText("No execution batches recorded yet.");
    fireEvent.change(screen.getByLabelText("Batch number"), { target: { value: "LOT-A" } });
    fireEvent.change(screen.getByLabelText("New good quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("Review execution batch"));
    expect(await screen.findByRole("alert")).toHaveTextContent("manual material issues require allocation");
    expect(screen.queryByRole("button", { name: "Confirm reviewed action" })).not.toBeInTheDocument();
    expect(fetcher.mock.calls).toHaveLength(2);
  });

  it.each(["draft", "order", "step", "family"])("invalidates confirmation when the %s changes", async (change) => {
    network();
    const data = bootstrap();
    const view = mount({ data });
    const confirm = await review();
    if (change === "draft") fireEvent.change(screen.getByLabelText("New good quantity"), { target: { value: "3" } });
    else {
      const value = structuredClone(order);
      if (change === "order") value.executionVersion = 5;
      if (change === "step") value.steps[0].expectedVersion = 5;
      if (change === "family") value.batch!.familyVersion = 5;
      view.rerender(workspace({ data, value }));
    }
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("changed after review");
  });

  it("retains an unknown outcome for explicit identical idempotent retry only", async () => {
    const fetcher = network({ uncertain: true });
    mount();
    fireEvent.click(await review());
    const retry = await screen.findByRole("button", { name: "Retry identical confirmed request" });
    expect(fetcher.mock.calls.filter(([url, init]) => url.endsWith("/execution-batches") && init.method === "POST")).toHaveLength(1);
    fireEvent.click(retry);
    await waitFor(() => expect(fetcher.mock.calls.filter(([url, init]) =>
      url.endsWith("/execution-batches") && init.method === "POST")).toHaveLength(2));
    const writes = fetcher.mock.calls.filter(([url, init]) => url.endsWith("/execution-batches") && init.method === "POST");
    expect(writes[0][1].body).toBe(writes[1][1].body);
  });
});
