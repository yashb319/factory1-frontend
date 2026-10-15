"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { employeeFormSchema } from "@/features/employees/schemas/employee.schema";
import { buildEmployeeUpdateRequest } from "@/features/employees/utils/employeeFormPayload";
import { envelopeSchema } from "../contracts";
import { useProductRuntime } from "./client";
import { runtimeRouteAllowed } from "./policy";
import { employeeRecordSchema, inventoryRecordSchema, recordsPageSchema, recordInputSchema,
  type EmployeeRecord, type InventoryRecord } from "./records";

const control = "min-h-11 w-full rounded border bg-white px-3 py-2";
const button = "min-h-11 rounded border px-3 py-2 disabled:opacity-50";
type RecordItem = EmployeeRecord | InventoryRecord;
type RecordsPage = z.infer<ReturnType<typeof recordsPageSchema<typeof inventoryRecordSchema>>> | z.infer<ReturnType<typeof recordsPageSchema<typeof employeeRecordSchema>>>;

function message(error: unknown) {
  return error instanceof Error ? error.message : "This operation could not be completed.";
}

export function RuntimeRecords({ kind }: { kind: "inventory" | "employees" }) {
  const { data, request } = useProductRuntime();
  const inventory = kind === "inventory";
  const path = inventory ? "/api/inventory/items" : "/api/employees";
  const title = inventory ? "Inventory" : "Employees";
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loaded, setLoaded] = useState<{ key: string; result: RecordsPage | null; error: string } | null>(null);
  const [editor, setEditor] = useState<RecordItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<RecordItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const requestKey = JSON.stringify([kind, keyword, page, revision]);
  const result = loaded?.key === requestKey ? loaded.result : null;
  const loadError = loaded?.key === requestKey ? loaded.error : "";
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const allowed = (method: string, target = path) => runtimeRouteAllowed(
    data.entitlements?.runtimeRoutes ?? [], data.entitlements?.role, method, target, data.entitlements?.modules ?? []);

  useEffect(() => {
    let current = true;
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (keyword) params.set(inventory ? "search" : "keyword", keyword);
    const target = `${path}?${params}`;
    const query = inventory
      ? request("GET", target, recordsPageSchema(inventoryRecordSchema))
      : request("GET", target, recordsPageSchema(employeeRecordSchema));
    void query.then((response) => { if (current) setLoaded({ key: requestKey, result: response, error: "" }); })
      .catch((caught: unknown) => { if (current) setLoaded({ key: requestKey, result: null, error: message(caught) }); });
    return () => { current = false; };
  }, [inventory, keyword, page, path, request, requestKey]);

  async function edit(item: RecordItem) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const detail = inventory
        ? await request("GET", `${path}/${item.id}`, inventoryRecordSchema)
        : await request("GET", `${path}/${item.id}`, envelopeSchema(employeeRecordSchema));
      if (mounted.current) setEditor("data" in detail ? detail.data : detail);
    } catch (caught) { if (mounted.current) setError(message(caught)); }
    finally { if (mounted.current) setBusy(false); }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await request("DELETE", `${path}/${deleting.id}`, z.unknown());
      if (mounted.current) {
        setDeleting(null); setNotice("Record deleted.");
        setPage(0); setRevision((value) => value + 1);
      }
    } catch (caught) { if (mounted.current) setError(message(caught)); }
    finally { if (mounted.current) setBusy(false); }
  }

  return <section className="space-y-4" aria-label={`${title} workspace`} aria-busy={busy}>
    <h2 className="text-xl font-semibold">{title}</h2>
    <p className="text-sm">Records belong to the selected factory. Product access does not create a user account or invitation.</p>
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setKeyword(search.trim()); setPage(0); setEditor(null); setDeleting(null); }}>
      <label className="grow">Search {title.toLowerCase()}<input className={control} maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <button className={button} disabled={busy}>Search</button>
    </form>
    <div className="flex gap-2">
      {allowed("POST") ? <button type="button" className={button} disabled={busy} onClick={() => { setEditor("new"); setDeleting(null); setError(""); setNotice(""); }}>New {inventory ? "inventory item" : "employee"}</button> : null}
      <button type="button" className={button} disabled={busy} onClick={() => { setEditor(null); setDeleting(null); setRevision((value) => value + 1); }}>Refresh records</button>
    </div>
    {error || loadError ? <p role="alert">{error || loadError}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {!result && !loadError ? <p role="status">Loading {title.toLowerCase()}...</p> : null}
    {result ? <>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">{title} for the selected factory</caption>
        <thead><tr><th scope="col">Code</th><th scope="col">Name</th><th scope="col">{inventory ? "Stock" : "Department"}</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
        <tbody>{result.content.map((item) => <tr key={item.id} className="border-t">
          <td className="py-3">{String("itemCode" in item ? item.itemCode : item.employeeCode)}</td><td>{item.name}</td>
          <td>{String("currentStock" in item ? `${item.currentStock} ${item.unit}` : item.department ?? "-")}</td><td>{item.status}</td>
          <td className="space-x-2">
            {allowed("GET", `${path}/${item.id}`) ? <button type="button" className={button} disabled={busy} onClick={() => void edit(item)}>View {item.name}</button> : null}
            {allowed("DELETE", `${path}/${item.id}`) ? <button type="button" className={button} disabled={busy} onClick={() => { setDeleting(item); setEditor(null); }}>Delete {item.name}</button> : null}
          </td>
        </tr>)}</tbody>
      </table></div>
      {!result.content.length ? <p>No records found.</p> : null}
      <nav aria-label={`${title} pagination`} className="flex items-center gap-3">
        <button type="button" className={button} disabled={busy || page === 0} onClick={() => { setPage(page - 1); setEditor(null); }}>Previous</button>
        <span>{result.totalElements} records · Page {page + 1}</span>
        <button type="button" className={button} disabled={busy || page + 1 >= result.totalPages} onClick={() => { setPage(page + 1); setEditor(null); }}>Next</button>
      </nav>
    </> : null}
    {deleting ? <div role="alertdialog" aria-label="Confirm record deletion" className="space-y-3 rounded border p-4">
      <p>Delete {deleting.name} from {data.session.context?.organizationName}? This affects the shared factory record, not only this product.</p>
      <button type="button" className={button} disabled={busy} onClick={() => void remove()}>Confirm delete</button>{" "}
      <button type="button" className={button} disabled={busy} onClick={() => setDeleting(null)}>Cancel deletion</button>
    </div> : null}
    {editor ? <RuntimeRecordEditor key={editor === "new" ? "new" : editor.id} kind={kind} item={editor === "new" ? undefined : editor}
      canSave={editor === "new" ? allowed("POST") : allowed("PUT", `${path}/${editor.id}`)}
      onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setNotice("Record saved."); setRevision((value) => value + 1); }} /> : null}
  </section>;
}

function RuntimeRecordEditor({ kind, item, canSave, onSaved, onClose }: {
  kind: "inventory" | "employees"; item?: RecordItem; canSave: boolean; onSaved: () => void; onClose: () => void;
}) {
  const { request } = useProductRuntime();
  const inventory = kind === "inventory";
  const initial: Record<string, unknown> = item ?? {};
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canSave) return;
    const fields = new FormData(event.currentTarget);
    const input = recordInputSchema.safeParse({
      name: fields.get("name"), code: fields.get("code") ?? "", minimumStock: fields.get("minimumStock") ?? 0,
      openingStock: fields.get("openingStock") ?? 0, unit: fields.get("unit") ?? "pcs", salaryRate: fields.get("salaryRate") ?? 0,
    });
    if (!input.success) { setError(input.error.issues.map((issue) => issue.message).join(". ")); return; }
    let body: unknown;
    if (inventory) {
      const existing = item ? inventoryRecordSchema.parse(item) : null;
      body = {
        name: input.data.name, category: existing?.category ?? undefined,
        itemType: fields.get("itemType"), unit: input.data.unit, minimumStock: input.data.minimumStock,
        purchasePrice: existing?.purchasePrice, sellingPrice: existing?.sellingPrice,
        hsnCode: existing?.hsnCode ?? undefined, gstRate: existing?.gstRate,
        supplierId: existing?.supplierId, supplierName: existing?.supplierName ?? undefined, notes: existing?.notes ?? undefined,
        ...(item ? { status: fields.get("status") } : { code: input.data.code || undefined, openingStock: input.data.openingStock }),
      };
    } else {
      const values = employeeFormSchema.safeParse({
        ...Object.fromEntries(Object.entries(item ?? {}).map(([key, value]) => [key, value === null ? undefined : value])),
        name: input.data.name, code: input.data.code || undefined, salaryRate: input.data.salaryRate,
        salaryType: fields.get("salaryType"), status: fields.get("status"),
        email: fields.get("email") || undefined, department: fields.get("department") || undefined,
        designation: fields.get("designation") || undefined,
      });
      if (!values.success) { setError(values.error.issues.map((issue) => issue.message).join(". ")); return; }
      body = item ? buildEmployeeUpdateRequest(values.data) : values.data;
    }
    setBusy(true); setError("");
    try {
      const path = `${inventory ? "/api/inventory/items" : "/api/employees"}${item ? `/${item.id}` : ""}`;
      await request(item ? "PUT" : "POST", path, z.unknown(), body);
      if (mounted.current) onSaved();
    } catch (caught) { if (mounted.current) setError(message(caught)); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4 rounded border p-4" aria-label={`${item ? "Edit" : "Create"} ${inventory ? "inventory item" : "employee"}`}>
    <h3 className="font-semibold">{item ? item.name : inventory ? "New inventory item" : "New employee"}</h3>
    {error ? <p role="alert">{error}</p> : null}
    <fieldset disabled={busy || !canSave} className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Record details</legend>
      {!item ? <label>Code (optional; generated when empty)<input name="code" className={control} maxLength={50} /></label> : null}
      <label>Name<input name="name" required minLength={2} maxLength={120} defaultValue={item?.name ?? ""} className={control} /></label>
      {inventory ? <>
        <label>Item type<select name="itemType" className={control} defaultValue={String(initial.itemType ?? "RAW_MATERIAL")}>
          {["RAW_MATERIAL", "FINISHED_GOOD", "PACKAGING", "CONSUMABLE", "SEMI_FINISHED", "OTHER"].map((type) => <option key={type}>{type}</option>)}
        </select></label>
        <label>Unit<input name="unit" className={control} required maxLength={30} defaultValue={String(initial.unit ?? "pcs")} /></label>
        <label>Minimum stock<input name="minimumStock" className={control} type="number" min="0" step="any" required defaultValue={Number(initial.minimumStock ?? 0)} /></label>
        {!item ? <label>Opening stock<input name="openingStock" className={control} type="number" min="0" step="any" required defaultValue={0} /></label> : null}
      </> : <>
        <label>Email<input name="email" className={control} type="email" defaultValue={String(initial.email ?? "")} /></label>
        <label>Department<input name="department" className={control} defaultValue={String(initial.department ?? "")} /></label>
        <label>Designation<input name="designation" className={control} defaultValue={String(initial.designation ?? "")} /></label>
        <label>Salary rate<input name="salaryRate" className={control} type="number" min="0" step="any" required defaultValue={Number(initial.salaryRate ?? 0)} /></label>
        <label>Salary type<select name="salaryType" className={control} defaultValue={String(initial.salaryType ?? "MONTHLY")}>
          {["HOURLY", "DAILY", "MONTHLY"].map((type) => <option key={type}>{type}</option>)}
        </select></label>
      </>}
      {item || !inventory ? <label>Status<select name="status" className={control} defaultValue={item?.status ?? "ACTIVE"}><option>ACTIVE</option><option>INACTIVE</option></select></label> : null}
      {canSave ? <button type="submit" className={button} disabled={busy}>{busy ? "Saving..." : "Save record"}</button> : null}
    </fieldset>
    {!inventory ? <p className="text-sm">Saving an employee record does not grant sign-in access. Membership invitations and product grants must be explicitly administered.</p> : null}
    <button type="button" className={button} disabled={busy} onClick={onClose}>Close record</button>
  </form>;
}
