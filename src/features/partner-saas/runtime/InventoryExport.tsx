"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import type { InventoryItem } from "@/features/inventory/types/inventory.types";
import { useProductRuntime } from "./client";
import { useRuntimePermissions } from "./permissions";

export const exportStatusSchema = z.object({
  id: z.uuid(), status: z.enum(["PENDING", "COMPLETED", "DENIED", "FAILED"]),
  expiresAt: z.iso.datetime({ offset: true }), errorCode: z.string().nullable(),
}).strict();
const inventoryExportRowSchema = z.object({
  id: z.uuid(), itemCode: z.string(), name: z.string(),
  category: z.string().nullable().optional(),
  itemType: z.enum(["RAW_MATERIAL", "FINISHED_GOOD", "PACKAGING", "CONSUMABLE", "SEMI_FINISHED", "OTHER"]),
  unit: z.string(), currentStock: z.number(), minimumStock: z.number(), inventoryValue: z.number(),
  purchasePrice: z.number().nullable().optional(), sellingPrice: z.number().nullable().optional(),
  hsnCode: z.string().nullable().optional(), gstRate: z.number().nullable().optional(),
  supplierId: z.uuid().nullable().optional(), supplierName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(), status: z.enum(["ACTIVE", "INACTIVE"]),
  lowStock: z.boolean(), outOfStock: z.boolean(),
}) satisfies z.ZodType<InventoryItem>;
export const inventoryExportDownloadSchema = z.object({
  id: z.uuid(), rows: z.array(inventoryExportRowSchema).max(1000), truncated: z.literal(false),
}).strict();

export function InventoryExport() {
  const { request } = useProductRuntime();
  const { can } = useRuntimePermissions();
  const [job, setJob] = useState<z.infer<typeof exportStatusSchema> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!job) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, Date.parse(job.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [job]);
  function updateJob(value: z.infer<typeof exportStatusSchema>) {
    setJob(value);
    setExpired(Date.parse(value.expiresAt) <= Date.now());
  }
  async function run(action: "create" | "status" | "download") {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      if (action === "create") {
        updateJob(await request("POST", "/exports/inventory", exportStatusSchema, {}));
      } else if (job && action === "status") {
        const status = await request("GET", `/exports/inventory/${job.id}`, exportStatusSchema);
        if (status.id !== job.id) throw new Error("The export response did not match this job.");
        updateJob(status);
      } else if (job && action === "download") {
        if (job.status !== "COMPLETED" || Date.parse(job.expiresAt) <= Date.now()) {
          throw new Error("Only a completed, unexpired export can be downloaded.");
        }
        const result = await request("GET", `/exports/inventory/${job.id}/download`, inventoryExportDownloadSchema);
        if (result.id !== job.id) throw new Error("The export response did not match this job.");
        const url = URL.createObjectURL(new Blob([JSON.stringify(result.rows, null, 2)], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url; link.download = `inventory-${job.id}.json`;
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The export could not be completed.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <section aria-label="Contextual inventory export" className="space-y-3 rounded border p-4">
    <h2 className="font-semibold">Authorized inventory export</h2>
    <p className="text-sm">The server rechecks this factory, product, user and context generation at execution and download. Jobs expire after 15 minutes; exports over 1000 rows fail instead of truncating. No public file link is issued.</p>
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || !can("POST", "/exports/inventory")} onClick={() => void run("create")}>Request inventory export</Button>
      {job ? <>
        <Button variant="outline" disabled={busy || !can("GET", `/exports/inventory/${job.id}`)} onClick={() => void run("status")}>Check export status</Button>
        <Button disabled={busy || job.status !== "COMPLETED" || expired ||
          !can("GET", `/exports/inventory/${job.id}/download`)} onClick={() => void run("download")}>Download inventory JSON</Button>
      </> : null}
    </div>
    {job ? <p role="status">Export {job.status}; expires {job.expiresAt}{job.errorCode ? `; ${job.errorCode}` : ""}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
