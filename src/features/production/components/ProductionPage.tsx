"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Factory, Plus, RefreshCw, Play, Pause, Check, Ban, History } from "lucide-react";
import { useAppSelector } from "@/lib/hook";
import { useGetProductsQuery } from "@/features/products/api/productsApi";
import { useGetActiveCustomersQuery } from "@/features/customers/api/customerApi";
import { useGetInventoryItemsQuery } from "@/features/inventory/api/inventoryApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  useCancelOrderMutation, useCreateBomMutation, useCreateOrderMutation,
  useCreateWorkflowDraftMutation, useCreateWorkflowMutation, useGetBomsQuery,
  useGetOrderQuery, useGetOrdersQuery, useGetTimelineQuery, useGetWorkflowVersionsQuery,
  useGetWorkflowsQuery, usePublishBomMutation, usePublishWorkflowMutation,
  useStepActionMutation,
} from "../api/productionApi";
import type {
  BomItemRequest, OrderPriority, ProductionOrder, ProductionOrderRequest,
  StepActionRequest, WorkflowRequest, WorkflowStepRequest,
} from "../types/production.types";

type Tab = "orders" | "workflows" | "boms";
const opsRoles = ["OWNER", "ADMIN", "MANAGEMENT"];
const statusTone = (status: string) => {
  if (["COMPLETED", "PUBLISHED"].includes(status)) return "success" as const;
  if (["CANCELLED", "ON_HOLD"].includes(status)) return "error" as const;
  if (["DRAFT", "PLANNED"].includes(status)) return "draft" as const;
  return "pending" as const;
};

const emptyStep = (): WorkflowStepRequest => ({ name: "", code: "", sequenceNumber: 1, active: true });
const emptyOrder = (workflowVersionId = ""): ProductionOrderRequest => ({
  orderNumber: "", productId: "", plannedQuantity: 1, priority: "NORMAL", workflowVersionId,
});

export function ProductionPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [tab, setTab] = useState<Tab>("orders");
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  if (!user || !opsRoles.includes(user.role)) {
    return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Production administration is available to owners, admins, and management only.</CardContent></Card>;
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Production tracking" description="Configure versioned workflows and BOMs, then execute production orders without hardcoded garment steps." icon={Factory} module="production" />
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(["orders", "workflows", "boms"] as Tab[]).map((item) => (
          <Button key={item} variant={tab === item ? "default" : "ghost"} onClick={() => setTab(item)}>
            {item === "orders" ? "Production orders" : item === "workflows" ? "Workflow templates" : "BOM definitions"}
          </Button>
        ))}
      </div>
      {tab === "orders" ? <Orders selectedOrderId={selectedOrderId} onSelect={setSelectedOrderId} /> : null}
      {tab === "workflows" ? <Workflows /> : null}
      {tab === "boms" ? <Boms /> : null}
    </div>
  );
}

function Orders({ selectedOrderId, onSelect }: { selectedOrderId?: string; onSelect: (id?: string) => void }) {
  const { data, isLoading, isError, refetch } = useGetOrdersQuery({ page: 0, size: 50 });
  const orders = data?.content ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Orders</CardTitle><div className="flex gap-2"><Button variant="outline" onClick={() => void refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create order</Button></div></CardHeader>
        <CardContent>
          {isLoading ? <Loading /> : isError ? <ErrorState onRetry={() => void refetch()} /> : !orders.length ? <Empty text="No production orders yet." /> :
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Order</th><th className="p-2">Product</th><th className="p-2">Qty</th><th className="p-2">Due</th><th className="p-2">Status</th></tr></thead><tbody>
              {orders.map((order) => <tr key={order.id} className="cursor-pointer border-b hover:bg-muted/50" onClick={() => onSelect(order.id)}><td className="p-2 font-medium">{order.orderNumber}</td><td className="p-2">{order.productId}</td><td className="p-2">{order.completedQuantity}/{order.plannedQuantity}</td><td className="p-2">{order.dueDate || "-"}</td><td className="p-2"><StatusBadge tone={statusTone(order.status)}>{order.status.replaceAll("_", " ")}</StatusBadge></td></tr>)}
            </tbody></table></div>}
        </CardContent>
      </Card>
      {selectedOrderId ? <OrderDetail orderId={selectedOrderId} onClose={() => onSelect(undefined)} /> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Select an order to inspect steps, controls, and immutable history.</CardContent></Card>}
      {createOpen ? <CreateOrderDialog onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}

function CreateOrderDialog({ onClose }: { onClose: () => void }) {
  const { data: products } = useGetProductsQuery({ page: 0, size: 300 });
  const { data: customers } = useGetActiveCustomersQuery();
  const { data: workflows } = useGetWorkflowsQuery({ page: 0, size: 100 });
  const [workflowId, setWorkflowId] = useState("");
  const { data: versions } = useGetWorkflowVersionsQuery(workflowId, { skip: !workflowId });
  const published = versions?.find((version) => version.status === "PUBLISHED");
  const [form, setForm] = useState<ProductionOrderRequest>(emptyOrder());
  const [create, state] = useCreateOrderMutation();
  const update = (patch: Partial<ProductionOrderRequest>) => setForm((current) => ({ ...current, ...patch }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.orderNumber || !form.productId || form.plannedQuantity <= 0 || !form.workflowVersionId) { toast.error("Order number, product, quantity, and a published workflow are required."); return; }
    try { await create(form).unwrap(); toast.success("Production order created"); onClose(); } catch { toast.error("Could not create production order"); }
  };
  return <Modal title="Create production order" onClose={onClose}><form onSubmit={submit} className="space-y-3">
    <Field label="Order number"><Input value={form.orderNumber} onChange={(e) => update({ orderNumber: e.target.value })} required /></Field>
    <Field label="Product"><select className="h-9 w-full rounded-md border bg-background px-3" value={form.productId} onChange={(e) => update({ productId: e.target.value })} required><option value="">Select product</option>{products?.content.map((p) => <option key={p.id} value={p.id}>{p.productCode} - {p.name}</option>)}</select></Field>
    <Field label="Customer (optional)"><select className="h-9 w-full rounded-md border bg-background px-3" value={form.customerId || ""} onChange={(e) => update({ customerId: e.target.value || undefined })}><option value="">No customer</option>{customers?.map((c) => <option key={c.id} value={c.id}>{c.customerCode} - {c.name}</option>)}</select></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Planned quantity"><Input type="number" min="0.001" step="0.001" value={form.plannedQuantity} onChange={(e) => update({ plannedQuantity: Number(e.target.value) })} /></Field><Field label="Priority"><select className="h-9 w-full rounded-md border bg-background px-3" value={form.priority} onChange={(e) => update({ priority: e.target.value as OrderPriority })}>{["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}</select></Field></div>
    <Field label="Due date (optional)"><Input type="date" value={form.dueDate || ""} onChange={(e) => update({ dueDate: e.target.value || undefined })} /></Field>
    <Field label="Workflow template"><select className="h-9 w-full rounded-md border bg-background px-3" value={workflowId} onChange={(e) => { setWorkflowId(e.target.value); update({ workflowVersionId: "" }); }} required><option value="">Select workflow</option>{workflows?.content.map((w) => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}</select></Field>
    <Field label="Published version"><select className="h-9 w-full rounded-md border bg-background px-3" value={form.workflowVersionId} onChange={(e) => update({ workflowVersionId: e.target.value })} required><option value="">Select version</option>{versions?.filter((v) => v.status === "PUBLISHED").map((v) => <option key={v.id} value={v.id}>v{v.versionNumber}</option>)}</select>{workflowId && !published ? <p className="text-xs text-amber-600">Publish a workflow version before creating an order.</p> : null}</Field>
    <Field label="Notes (optional)"><Textarea value={form.notes || ""} onChange={(e) => update({ notes: e.target.value || undefined })} /></Field>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={state.isLoading}>{state.isLoading ? "Creating..." : "Create order"}</Button></div>
  </form></Modal>;
}

function OrderDetail({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data: order, isLoading, isError, refetch } = useGetOrderQuery(orderId);
  const { data: timeline = [], refetch: refetchTimeline } = useGetTimelineQuery(orderId);
  const [action, actionState] = useStepActionMutation();
  const [cancel, cancelState] = useCancelOrderMutation();
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<{ completedQuantity?: number; rejectedQuantity?: number }>({});
  if (isLoading) return <Card><CardContent className="p-8"><Loading /></CardContent></Card>;
  if (isError || !order) return <Card><CardContent className="p-8"><ErrorState onRetry={() => void refetch()} /></CardContent></Card>;
  const activeStep = order.steps.find((step) => step.id === order.currentStepId) || order.steps[0];
  const run = async (actionName: "start" | "pause" | "complete") => {
    if (!activeStep) return;
    if (actionName === "complete" && !quantities.completedQuantity && !quantities.rejectedQuantity) { toast.error("Enter completed or rejected quantity."); return; }
    try { await action({ orderId, stepId: activeStep.id, action: actionName, body: { ...quantities, notes: notes || undefined } }).unwrap(); toast.success(`Step ${actionName}ed`); setNotes(""); setQuantities({}); void refetch(); void refetchTimeline(); } catch { toast.error(`Could not ${actionName} step`); }
  };
  const cancelOrder = async () => { if (!window.confirm("Cancel this production order? This is a logical cancellation and preserves history.")) return; try { await cancel(orderId).unwrap(); toast.success("Order cancelled"); void refetch(); } catch { toast.error("Could not cancel order"); } };
  return <Card><CardHeader className="flex flex-row items-start justify-between"><div><CardTitle>{order.orderNumber}</CardTitle><p className="text-xs text-muted-foreground">{order.productId} · {order.completedQuantity} complete · {order.rejectedQuantity} rejected</p></div><Button variant="ghost" onClick={onClose}>Close</Button></CardHeader><CardContent className="space-y-5">
    <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={statusTone(order.status)}>{order.status.replaceAll("_", " ")}</StatusBadge><span className="text-xs text-muted-foreground">Remaining {order.remainingQuantity}</span>{order.status !== "CANCELLED" && order.status !== "COMPLETED" ? <Button size="sm" variant="outline" onClick={cancelOrder} disabled={cancelState.isLoading}><Ban className="mr-1 h-3 w-3" />Cancel</Button> : null}</div>
    <div><h3 className="mb-2 text-sm font-semibold">Configured workflow steps</h3><div className="space-y-2">{order.steps.map((step) => <div key={step.id} className={`rounded border p-2 text-sm ${step.id === activeStep?.id ? "border-primary bg-primary/5" : ""}`}><span className="mr-2 text-muted-foreground">{step.sequenceNumber}.</span>{step.name}<span className="ml-2 text-xs text-muted-foreground">{step.code}{step.workstation ? ` · ${step.workstation}` : ""}</span></div>)}</div></div>
    {activeStep && order.status !== "CANCELLED" && order.status !== "COMPLETED" ? <div className="space-y-3 rounded-lg border bg-muted/20 p-3"><p className="text-sm font-semibold">Execute: {activeStep.name}</p><div className="grid grid-cols-2 gap-3"><Field label="Completed quantity"><Input type="number" min="0" step="0.001" value={quantities.completedQuantity ?? ""} onChange={(e) => setQuantities({ ...quantities, completedQuantity: e.target.value ? Number(e.target.value) : undefined })} /></Field><Field label="Rejected quantity"><Input type="number" min="0" step="0.001" value={quantities.rejectedQuantity ?? ""} onChange={(e) => setQuantities({ ...quantities, rejectedQuantity: e.target.value ? Number(e.target.value) : undefined })} /></Field></div><Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional execution note" /></Field><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={actionState.isLoading} onClick={() => void run("start")}><Play className="mr-1 h-3 w-3" />Start</Button><Button size="sm" variant="outline" disabled={actionState.isLoading} onClick={() => void run("pause")}><Pause className="mr-1 h-3 w-3" />Pause</Button><Button size="sm" disabled={actionState.isLoading} onClick={() => void run("complete")}><Check className="mr-1 h-3 w-3" />Complete</Button></div></div> : null}
    <div><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Immutable timeline</h3>{!timeline.length ? <Empty text="No step activity recorded." /> : <div className="space-y-2">{timeline.map((event) => <div key={event.id} className="border-l-2 border-primary/30 pl-3 text-sm"><div className="flex flex-wrap gap-2"><StatusBadge tone={event.action === "COMPLETED" ? "success" : "info"}>{event.action}</StatusBadge><span className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</span></div><p className="text-xs text-muted-foreground">Completed {event.completedQuantity} · Rejected {event.rejectedQuantity}{event.notes ? ` · ${event.notes}` : ""}</p></div>)}</div>}</div>
  </CardContent></Card>;
}

function Workflows() {
  const { data, isLoading, isError, refetch } = useGetWorkflowsQuery({ page: 0, size: 50 });
  const [selected, setSelected] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const selectedTemplate = data?.content.find((workflow) => workflow.id === selected);
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Workflow templates</CardTitle><Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New template</Button></CardHeader><CardContent>{isLoading ? <Loading /> : isError ? <ErrorState onRetry={() => void refetch()} /> : !data?.content.length ? <Empty text="No workflow templates configured." /> : <div className="space-y-2">{data.content.map((w) => <button key={w.id} className={`w-full rounded border p-3 text-left ${selected === w.id ? "border-primary bg-primary/5" : ""}`} onClick={() => setSelected(w.id)}><div className="font-medium">{w.code} · {w.name}</div><p className="text-xs text-muted-foreground">{w.description || "No description"}</p></button>)}</div>}</CardContent></Card>{selectedTemplate ? <WorkflowVersions template={selectedTemplate} /> : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Select a template to manage versions and publish immutable steps.</CardContent></Card>}{createOpen ? <WorkflowDialog onClose={() => setCreateOpen(false)} /> : null}</div>;
}

function WorkflowVersions({ template }: { template: { id: string; code: string; name: string; description?: string } }) {
  const { data: versions = [], refetch } = useGetWorkflowVersionsQuery(template.id);
  const [publish] = usePublishWorkflowMutation();
  const [draft] = useCreateWorkflowDraftMutation();
  const latest = versions[versions.length - 1];
  const publishVersion = async (id: string) => { if (!window.confirm("Publish this version? Published workflow steps cannot be edited.")) return; try { await publish(id).unwrap(); toast.success("Workflow version published"); void refetch(); } catch { toast.error("Could not publish workflow"); } };
  const createDraft = async () => { if (!latest) return; try { await draft({ templateId: template.id, body: { code: template.code, name: template.name, description: template.description, steps: latest.steps.map(({ id: _id, ...step }) => step) } }).unwrap(); toast.success("Draft version created"); void refetch(); } catch { toast.error("Could not create draft version"); } };
  return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Versions</CardTitle><Button variant="outline" onClick={() => void createDraft()} disabled={!latest}>New draft</Button></CardHeader><CardContent className="space-y-3">{!versions.length ? <Empty text="No versions yet." /> : versions.map((v) => <div key={v.id} className="rounded border p-3"><div className="flex items-center justify-between"><span className="font-medium">Version {v.versionNumber}</span><div className="flex items-center gap-2"><StatusBadge tone={statusTone(v.status)}>{v.status}</StatusBadge>{v.status === "DRAFT" ? <Button size="sm" onClick={() => void publishVersion(v.id)}>Publish</Button> : null}</div></div><div className="mt-2 flex flex-wrap gap-1">{v.steps.map((step) => <span key={step.id} className="rounded bg-muted px-2 py-1 text-xs">{step.sequenceNumber}. {step.name}</span>)}</div></div>)}</CardContent></Card>;
}

function WorkflowDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<WorkflowRequest>({ code: "", name: "", steps: [emptyStep()] });
  const [create, state] = useCreateWorkflowMutation();
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!form.code || !form.name || form.steps.some((s) => !s.name || !s.code)) { toast.error("Template code, name, and every step name/code are required."); return; } try { await create(form).unwrap(); toast.success("Workflow draft created"); onClose(); } catch { toast.error("Could not create workflow"); } };
  return <Modal title="New workflow template" onClose={onClose}><form onSubmit={submit} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></Field><Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field></div><Field label="Description"><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value || undefined })} /></Field><div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-medium">Steps</span><Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, steps: [...form.steps, { ...emptyStep(), sequenceNumber: form.steps.length + 1 }] })}>Add step</Button></div>{form.steps.map((step, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input placeholder="Step name" value={step.name} onChange={(e) => setForm({ ...form, steps: form.steps.map((s, i) => i === index ? { ...s, name: e.target.value } : s) })} /><Input placeholder="Code" value={step.code} onChange={(e) => setForm({ ...form, steps: form.steps.map((s, i) => i === index ? { ...s, code: e.target.value } : s) })} /><Button type="button" variant="ghost" disabled={form.steps.length === 1} onClick={() => setForm({ ...form, steps: form.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequenceNumber: i + 1 })) })}>×</Button></div>)}</div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={state.isLoading}>Create draft</Button></div></form></Modal>;
}

function Boms() {
  const { data: products } = useGetProductsQuery({ page: 0, size: 300 });
  const [productId, setProductId] = useState("");
  const { data: boms = [], isLoading, isError, refetch } = useGetBomsQuery(productId, { skip: !productId });
  const { data: inventory } = useGetInventoryItemsQuery({ page: 0, size: 300, itemType: "RAW_MATERIAL" });
  const [create, state] = useCreateBomMutation();
  const [publish] = usePublishBomMutation();
  const [name, setName] = useState("Default BOM");
  const [items, setItems] = useState<BomItemRequest[]>([{ inventoryItemId: "", quantityPerUnit: 1, unit: "", wastePercentage: 0 }]);
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!productId || !name || items.some((i) => !i.inventoryItemId || i.quantityPerUnit <= 0 || !i.unit)) { toast.error("Select a product and provide valid inventory item, quantity, and unit for every BOM row."); return; } try { await create({ productId, name, items }).unwrap(); toast.success("BOM draft created"); void refetch(); } catch { toast.error("Could not save BOM"); } };
  const publishBom = async (id: string) => { if (!window.confirm("Publish this BOM? Published definitions cannot be edited.")) return; try { await publish(id).unwrap(); toast.success("BOM published"); void refetch(); } catch { toast.error("Could not publish BOM"); } };
  return <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]"><Card><CardHeader><CardTitle>Product BOM</CardTitle></CardHeader><CardContent><Field label="Product"><select className="h-9 w-full rounded-md border bg-background px-3" value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Select product</option>{products?.content.map((p) => <option key={p.id} value={p.id}>{p.productCode} - {p.name}</option>)}</select></Field>{productId && <form onSubmit={save} className="mt-4 space-y-3"><Field label="BOM name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>{items.map((item, index) => <div key={index} className="space-y-2 rounded border p-2"><select className="h-9 w-full rounded-md border bg-background px-3" value={item.inventoryItemId} onChange={(e) => setItems(items.map((x, i) => i === index ? { ...x, inventoryItemId: e.target.value, unit: inventory?.content.find((v) => v.id === e.target.value)?.unit || x.unit } : x))}><option value="">Select raw material</option>{inventory?.content.map((v) => <option key={v.id} value={v.id}>{v.itemCode} - {v.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><Input type="number" min="0.001" step="0.001" placeholder="Qty/unit" value={item.quantityPerUnit} onChange={(e) => setItems(items.map((x, i) => i === index ? { ...x, quantityPerUnit: Number(e.target.value) } : x))} /><Input placeholder="Unit" value={item.unit} onChange={(e) => setItems(items.map((x, i) => i === index ? { ...x, unit: e.target.value } : x))} /></div></div>)}<div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setItems([...items, { inventoryItemId: "", quantityPerUnit: 1, unit: "", wastePercentage: 0 }])}>Add item</Button><Button disabled={state.isLoading}>Save draft</Button></div></form>}</CardContent></Card><Card><CardHeader><CardTitle>{productId ? "BOM versions" : "Select a product"}</CardTitle></CardHeader><CardContent>{isLoading ? <Loading /> : isError ? <ErrorState onRetry={() => void refetch()} /> : !productId ? <Empty text="BOMs are scoped to a product." /> : !boms.length ? <Empty text="No BOM versions yet." /> : <div className="space-y-2">{boms.map((bom) => <div key={bom.id} className="rounded border p-3"><div className="flex items-center justify-between"><span className="font-medium">{bom.name} · v{bom.versionNumber}</span><div className="flex items-center gap-2"><StatusBadge tone={statusTone(bom.status)}>{bom.status}</StatusBadge>{bom.status === "DRAFT" ? <Button size="sm" onClick={() => void publishBom(bom.id)}>Publish</Button> : null}</div></div><p className="mt-1 text-xs text-muted-foreground">{bom.items.length} material lines</p></div>)}</div>}</CardContent></Card></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-background p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><Button variant="ghost" onClick={onClose}>×</Button></div>{children}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span>{children}</label>; }
function Loading() { return <p className="text-sm text-muted-foreground">Loading production data...</p>; }
function Empty({ text }: { text: string }) { return <p className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="space-y-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>Production data could not be loaded.</p><Button size="sm" variant="outline" onClick={onRetry}>Try again</Button></div>; }
