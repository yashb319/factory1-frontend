"use client";

import { useMemo, useState } from "react";
import { BellRing, Clock3, Gauge, Save, TimerReset, TriangleAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetActiveCustomersQuery } from "@/features/customers/api/customerApi";
import { useGetProductsQuery } from "@/features/products/api/productsApi";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  useGetAnalyticsQuery, useGetNotificationPreferencesQuery, useGetOrderProgressQuery,
  useUpdateNotificationPreferencesMutation,
} from "../api/productionApi";
import type { ProductionAnalytics as ProductionAnalyticsData, ProductionAnalyticsFilters, ProductionNotificationEvent } from "../types/production.types";

const notificationEvents: { event: ProductionNotificationEvent; label: string }[] = [
  { event: "ORDER_CREATED", label: "Order created" },
  { event: "STEP_STARTED", label: "Step started" },
  { event: "STEP_PAUSED", label: "Step paused" },
  { event: "STEP_COMPLETED", label: "Step completed" },
  { event: "QUALITY_FAILED", label: "Quality failed" },
  { event: "MATERIAL_SHORTAGE", label: "Material shortage" },
  { event: "MATERIAL_CONSUMPTION_FAILED", label: "Material consumption failed" },
  { event: "ORDER_DELAYED", label: "Order delayed" },
  { event: "ORDER_COMPLETED", label: "Order completed" },
  { event: "ASSIGNMENT_CHANGED", label: "Assignment changed" },
];

const number = (value?: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value ?? 0);
const percent = (value?: number) => `${number(value)}%`;
const statusTone = (status: string) => status === "COMPLETED" ? "success" as const : status === "CANCELLED" ? "error" as const : "pending" as const;

export function ProductionAnalytics() {
  const [filters, setFilters] = useState<ProductionAnalyticsFilters>({});
  const [draft, setDraft] = useState<ProductionAnalyticsFilters>({});
  const { data: products } = useGetProductsQuery({ page: 0, size: 300 });
  const analytics = useGetAnalyticsQuery(filters);
  const applyFilters = () => setFilters(draft);
  const clearFilters = () => { setDraft({}); setFilters({}); };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Analytics filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Input aria-label="From date" type="date" value={draft.from ?? ""} onChange={(event) => setDraft({ ...draft, from: event.target.value || undefined })} />
          <Input aria-label="To date" type="date" value={draft.to ?? ""} onChange={(event) => setDraft({ ...draft, to: event.target.value || undefined })} />
          <Input aria-label="Order number" placeholder="Order number" value={draft.orderNumber ?? ""} onChange={(event) => setDraft({ ...draft, orderNumber: event.target.value || undefined })} />
          <select aria-label="Product" className="h-9 rounded-md border bg-background px-3 text-sm" value={draft.productId ?? ""} onChange={(event) => setDraft({ ...draft, productId: event.target.value || undefined })}>
            <option value="">All products</option>
            {products?.content.map((product) => <option key={product.id} value={product.id}>{product.productCode} - {product.name}</option>)}
          </select>
          <div className="flex gap-2"><Button onClick={applyFilters}>Apply filters</Button><Button variant="outline" onClick={clearFilters}><Trash2 className="mr-2 h-4 w-4" />Clear</Button></div>
        </CardContent>
      </Card>
      {analytics.isLoading ? <AnalyticsLoading /> : analytics.isError || !analytics.data ? <AnalyticsError onRetry={() => void analytics.refetch()} /> : <AnalyticsResults analytics={analytics.data} />}
      <OrderProgress filters={filters} />
      <NotificationPreferences />
    </div>
  );
}

function AnalyticsResults({ analytics }: { analytics: ProductionAnalyticsData }) {
  const stepData = useMemo(() => (analytics.stepDurations ?? []).map((step) => ({
    name: step.stepName ?? step.stepId ?? "Unnamed step",
    hours: step.averageDurationHours ?? step.durationHours ?? 0,
  })), [analytics.stepDurations]);
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Average cycle time" value={`${number(analytics.averageCycleHours ?? analytics.cycleHours)} h`} icon={TimerReset} module="production" />
      <StatCard title="Throughput" value={number(analytics.throughput ?? analytics.completedQuantity)} description={`${number(analytics.completedQuantity)} completed`} icon={Gauge} module="production" />
      <StatCard title="Rejection / wastage" value={`${percent(analytics.rejectionRate)} / ${percent(analytics.wastageRate)}`} description={`${number(analytics.rejectedQuantity)} rejected · ${number(analytics.wastageQuantity)} wasted`} icon={TriangleAlert} module="production" />
      <StatCard title="Delayed orders" value={number(analytics.delayedOrderCount)} icon={Clock3} module="production" />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Step duration</CardTitle></CardHeader><CardContent>{stepData.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={stepData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [`${number(Number(value))} h`, "Duration"]} /><Bar dataKey="hours" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty text="No step-duration data for these filters." />}</CardContent></Card>
      <Card><CardHeader><CardTitle>Estimated material consumption</CardTitle></CardHeader><CardContent>{analytics.materialConsumption?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Material</th><th className="p-2 text-right">Estimated quantity</th></tr></thead><tbody>{analytics.materialConsumption.map((material, index) => <tr className="border-b" key={`${material.inventoryItemId ?? material.itemName}-${index}`}><td className="p-2">{material.itemName ?? material.inventoryItemId ?? "-"}</td><td className="p-2 text-right">{number(material.estimatedQuantity ?? material.quantity)} {material.unit ?? ""}</td></tr>)}</tbody></table></div> : <Empty text="No estimated material consumption for these filters." />}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Bottlenecks</CardTitle></CardHeader><CardContent>{analytics.bottlenecks?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Step</th><th className="p-2 text-right">Duration</th><th className="p-2 text-right">Delay</th></tr></thead><tbody>{analytics.bottlenecks.map((bottleneck, index) => <tr className="border-b" key={`${bottleneck.stepId ?? bottleneck.stepName}-${index}`}><td className="p-2">{bottleneck.stepName ?? bottleneck.stepId ?? "-"}</td><td className="p-2 text-right">{number(bottleneck.durationHours)} h</td><td className="p-2 text-right">{number(bottleneck.delayHours)} h</td></tr>)}</tbody></table></div> : <Empty text="No bottlenecks detected for these filters." />}</CardContent></Card>
  </div>;
}

function OrderProgress({ filters }: { filters: ProductionAnalyticsFilters }) {
  const { data: customers } = useGetActiveCustomersQuery();
  const [customerId, setCustomerId] = useState("");
  const progress = useGetOrderProgressQuery({ orderNumber: filters.orderNumber, productId: filters.productId, customerId: customerId || undefined });
  const rows = progress.data ?? [];
  return <Card><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Customer and order progress</CardTitle><select aria-label="Customer" className="h-9 rounded-md border bg-background px-3 text-sm" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">All customers</option>{customers?.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerCode} - {customer.name}</option>)}</select></CardHeader><CardContent>{progress.isLoading ? <AnalyticsLoading /> : progress.isError ? <AnalyticsError onRetry={() => void progress.refetch()} /> : !rows.length ? <Empty text="No order progress for these filters." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Order</th><th className="p-2">Customer</th><th className="p-2">Progress</th><th className="p-2">Due</th><th className="p-2">Status</th></tr></thead><tbody>{rows.map((order) => <tr className="border-b" key={order.orderId}><td className="p-2 font-medium">{order.orderNumber}</td><td className="p-2">{order.customerName ?? order.customerId ?? "-"}</td><td className="p-2">{number(order.completedQuantity)} / {number(order.plannedQuantity)} <span className="text-muted-foreground">({number(order.remainingQuantity)} remaining)</span></td><td className="p-2">{order.dueDate ?? "-"}</td><td className="p-2"><StatusBadge tone={order.delayed ? "error" : statusTone(order.status)}>{order.delayed ? "DELAYED" : order.status.replaceAll("_", " ")}</StatusBadge></td></tr>)}</tbody></table></div>}</CardContent></Card>;
}

function NotificationPreferences() {
  const { data, isLoading, isError, refetch } = useGetNotificationPreferencesQuery();
  const [update, updateState] = useUpdateNotificationPreferencesMutation();
  const [selected, setSelected] = useState<ProductionNotificationEvent[]>();
  const enabled = selected ?? data?.enabledEventTypes ?? [];
  const toggle = (event: ProductionNotificationEvent) => setSelected(enabled.includes(event) ? enabled.filter((item) => item !== event) : [...enabled, event]);
  const save = async () => { try { await update({ enabledEventTypes: enabled }).unwrap(); setSelected(undefined); toast.success("Production email preferences saved"); } catch { toast.error("Could not save production email preferences"); } };
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" />Production email preferences</CardTitle></CardHeader><CardContent>{isLoading ? <AnalyticsLoading /> : isError ? <AnalyticsError onRetry={() => void refetch()} /> : <div className="space-y-4"><p className="text-sm text-muted-foreground">Choose the production events that should send email. Delivery retries are handled by the email outbox; this does not create in-app notifications.</p><div className="grid gap-3 sm:grid-cols-2">{notificationEvents.map(({ event, label }) => <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm" key={event}><Checkbox checked={enabled.includes(event)} onCheckedChange={() => toggle(event)} /><span>{label}</span></label>)}</div><Button onClick={() => void save()} disabled={updateState.isLoading}><Save className="mr-2 h-4 w-4" />{updateState.isLoading ? "Saving..." : "Save email preferences"}</Button></div>}</CardContent></Card>;
}

function Empty({ text }: { text: string }) { return <p className="p-6 text-center text-sm text-muted-foreground">{text}</p>; }
function AnalyticsLoading() { return <div className="h-24 animate-pulse rounded-md bg-muted/50" />; }
function AnalyticsError({ onRetry }: { onRetry: () => void }) { return <div className="flex flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground"><span>Production analytics could not be loaded.</span><Button size="sm" variant="outline" onClick={onRetry}>Retry</Button></div>; }
