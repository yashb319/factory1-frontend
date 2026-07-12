"use client";

import { useState } from "react";
import { BadgeCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useGetGstIntegrationCredentialsQuery,
  useGetInwardEwayBillsQuery,
  useSaveGstIntegrationCredentialMutation,
  useSyncInwardEwayBillsMutation,
  useTestGstIntegrationCredentialMutation,
} from "../api/gstIntegrationApi";
import type { EwayEnvironment, EwayProvider } from "../types/gstIntegration.types";

const today = new Date().toISOString().slice(0, 10);

export function GstIntegrationPanel({ compact = false }: { compact?: boolean }) {
  const { data: credentials = [] } = useGetGstIntegrationCredentialsQuery();
  const { data: inward = [] } = useGetInwardEwayBillsQuery();
  const [saveCredential, saveState] = useSaveGstIntegrationCredentialMutation();
  const [testCredential, testState] = useTestGstIntegrationCredentialMutation();
  const [syncInward, syncState] = useSyncInwardEwayBillsMutation();
  const [syncDate, setSyncDate] = useState(today);
  const [form, setForm] = useState({
    gstin: "",
    legalName: "",
    provider: "GSP_SANDBOX" as EwayProvider,
    environment: "SANDBOX" as EwayEnvironment,
    apiUsername: "",
    apiPassword: "",
    active: true,
  });

  const active = credentials.find((credential) => credential.active) ?? credentials[0];

  async function handleSave() {
    try {
      await saveCredential({
        ...form,
        gstin: form.gstin.trim().toUpperCase(),
      }).unwrap();
      toast.success("GST integration saved");
      setForm((current) => ({ ...current, apiPassword: "" }));
    } catch {
      toast.error("Could not save GST integration");
    }
  }

  async function handleTest(id: string) {
    try {
      await testCredential(id).unwrap();
      toast.success("Connection marked active");
    } catch {
      toast.error("Could not test connection");
    }
  }

  async function handleSync() {
    try {
      const response = await syncInward({ generationDate: syncDate }).unwrap();
      if (response.success) {
        toast.success("Inward e-way sync completed");
      } else {
        toast.error(response.message || "Inward sync failed");
      }
    } catch {
      toast.error("Could not sync inward e-way bills");
    }
  }

  return (
    <section className="rounded-xl border bg-white">
      <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">GST & E-way Bill Integration</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure the factory GSTIN and GSP credentials used for outward and inward e-way bills.
            </p>
          </div>
        </div>
        {active ? (
          <Badge variant={active.connectionStatus === "ACTIVE" ? "default" : "outline"} className="w-fit rounded-md">
            {active.gstin} · {active.connectionStatus}
          </Badge>
        ) : null}
      </div>

      <div className={`grid gap-5 p-5 ${compact ? "" : "lg:grid-cols-[1fr_1fr]"}`}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="GSTIN" value={form.gstin} onChange={(event) => setForm({ ...form, gstin: event.target.value })} />
            <Input placeholder="Legal / trade name" value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value as EwayProvider })}>
              <option value="GSP_SANDBOX">Sandbox.co.in Sandbox</option>
              <option value="GSP_PRODUCTION">GSP Production</option>
              <option value="NIC_DIRECT">NIC Direct</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value as EwayEnvironment })}>
              <option value="SANDBOX">Sandbox</option>
              <option value="PRODUCTION">Production</option>
            </select>
            <Input placeholder="API username" value={form.apiUsername} onChange={(event) => setForm({ ...form, apiUsername: event.target.value })} />
            <Input type="password" placeholder="API password / token" value={form.apiPassword} onChange={(event) => setForm({ ...form, apiPassword: event.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saveState.isLoading}>
              <BadgeCheck className="mr-2 h-4 w-4" />
              Save GSTIN
            </Button>
            {active ? (
              <Button variant="outline" onClick={() => handleTest(active.id)} disabled={testState.isLoading}>
                Test connection
              </Button>
            ) : null}
          </div>
          {active ? (
            <p className="text-xs text-muted-foreground">
              Active user: {active.maskedApiUsername} · Provider: {active.provider} · Last verified: {active.lastVerifiedAt ?? "Not tested"}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input type="date" value={syncDate} onChange={(event) => setSyncDate(event.target.value)} />
            <Button variant="outline" onClick={handleSync} disabled={syncState.isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync inward
            </Button>
          </div>
          <div className="max-h-64 overflow-auto rounded-md border">
            {inward.length ? inward.slice(0, compact ? 3 : 8).map((bill) => (
              <div key={bill.id} className="border-b p-3 text-sm last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{bill.ewayBillNumber}</span>
                  <Badge variant="outline" className="rounded-md">{bill.acknowledgementStatus ?? bill.status ?? "PENDING"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bill.supplierName ?? "Supplier"} · {bill.documentNumber ?? "Document"} · {formatCurrency(bill.invoiceValue)}
                </p>
              </div>
            )) : (
              <p className="p-4 text-sm text-muted-foreground">No inward e-way bills synced yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
