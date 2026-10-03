"use client";

import { useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/apiError";
import { useAppSelector } from "@/lib/hook";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { areaLabels, HEALTH_CHECK_STEPS, priorityLabels } from "../config";
import { buildHealthCheckLeadFilters } from "../adminFilters";
import { SavingsProjectionView } from "./SavingsProjectionView";
import {
  useGetHealthCheckLeadQuery,
  useGetHealthCheckLeadsQuery,
  useUpdateHealthCheckLeadMutation,
} from "../api/healthCheckApi";
import type {
  HealthCheckArea,
  HealthCheckLeadStatus,
  HealthCheckPriority,
  UpdateHealthCheckLead,
} from "../types";

const statuses: HealthCheckLeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "NOT_INTERESTED", "CONVERTED"];
const priorities: HealthCheckPriority[] = ["HIGH_OPPORTUNITY", "MEDIUM_OPPORTUNITY", "EARLY_STAGE", "NO_FOLLOW_UP"];
const areas: HealthCheckArea[] = ["EMPLOYEE", "PRODUCTION", "INVENTORY", "FINANCE", "REPORTING", "FULL_FACTORY"];
const questionLabels = new Map(HEALTH_CHECK_STEPS.flatMap((step) => step.questions.map((question) => [question.id, question.label])));

function readable(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function HealthCheckLeadsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [area, setArea] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [consent, setConsent] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const query = useGetHealthCheckLeadsQuery(
    buildHealthCheckLeadFilters({
      page,
      query: debouncedSearch || undefined,
      priority: priority as HealthCheckPriority | "ALL",
      primaryArea: area as HealthCheckArea | "ALL",
      status: status as HealthCheckLeadStatus | "ALL",
      createdFrom: from,
      createdTo: to,
      consent: consent as "ALL" | "YES" | "NO",
    }),
    { skip: !user?.platformAdmin }
  );
  const leads = query.data?.data;

  if (!user?.platformAdmin) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Health Check Leads</h1>
        <p className="mt-2 text-sm text-slate-600">This area is only available to Factory1 platform administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Health Check Leads</h1>
        <p className="mt-1 text-sm text-slate-500">Review submitted assessments and manage consent-aware follow-up.</p>
      </div>

      <section className="rounded-xl border bg-white">
        <div className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
            <Label htmlFor="lead-search" className="sr-only">Search health check leads</Label>
            <Input id="lead-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search name, company, email, phone" className="pl-9" />
          </div>
          <FilterSelect label="Priority" value={priority} onChange={(value) => { setPriority(value); setPage(0); }} options={priorities.map((value) => ({ value, label: priorityLabels[value] }))} />
          <FilterSelect label="Area" value={area} onChange={(value) => { setArea(value); setPage(0); }} options={areas.map((value) => ({ value, label: areaLabels[value] }))} />
          <FilterSelect label="Status" value={status} onChange={(value) => { setStatus(value); setPage(0); }} options={statuses.map((value) => ({ value, label: readable(value) }))} />
          <FilterSelect label="Consent" value={consent} onChange={(value) => { setConsent(value); setPage(0); }} options={[{ value: "YES", label: "Consent given" }, { value: "NO", label: "No consent" }]} />
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="from" className="sr-only">From date</Label><Input id="from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0); }} /></div>
            <div><Label htmlFor="to" className="sr-only">To date</Label><Input id="to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(0); }} /></div>
          </div>
        </div>

        {query.isLoading ? (
          <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="animate-spin text-blue-600" aria-label="Loading health check leads" /></div>
        ) : query.isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-slate-600">Health check leads could not be loaded.</p>
            <Button variant="outline" onClick={() => query.refetch()}>Try again</Button>
          </div>
        ) : leads?.content.length ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Contact</TableHead><TableHead>Factory</TableHead><TableHead>Primary area</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {leads.content.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer" tabIndex={0} onClick={() => setSelectedId(lead.id)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setSelectedId(lead.id)}>
                      <TableCell><div className="font-medium">{lead.name}</div><div className="text-xs text-slate-500">{lead.email}</div></TableCell>
                      <TableCell>{lead.companyName}</TableCell>
                      <TableCell>{areaLabels[lead.primaryArea]}</TableCell>
                      <TableCell>{priorityLabels[lead.priority]}</TableCell>
                      <TableCell><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{readable(lead.status)}</span></TableCell>
                      <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600">
              <span>{leads.totalElements} lead{leads.totalElements === 1 ? "" : "s"}</span>
              <div className="flex items-center gap-2">
                <Button size="icon-sm" variant="outline" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button>
                <span>Page {leads.page + 1} of {Math.max(1, leads.totalPages)}</span>
                <Button size="icon-sm" variant="outline" aria-label="Next page" disabled={leads.page + 1 >= leads.totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-64 items-center justify-center p-6 text-center text-sm text-slate-500">No health check leads match these filters.</div>
        )}
      </section>

      <HealthCheckLeadDetail key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <Label className="sr-only">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All {label.toLowerCase()}s</SelectItem>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function HealthCheckLeadDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detailQuery = useGetHealthCheckLeadQuery(id ?? "", { skip: !id });
  const [updateLead, updateState] = useUpdateHealthCheckLeadMutation();
  const [draft, setDraft] = useState<UpdateHealthCheckLead | null>(null);
  const [error, setError] = useState("");
  const lead = detailQuery.data?.data;

  const workflowDraft = draft ?? {
    status: lead?.status ?? "NEW",
    notes: lead?.notes ?? "",
    assignedTo: lead?.assignedTo ?? "",
    followUpAt: lead?.followUpAt?.slice(0, 16) ?? null,
  };

  async function save() {
    if (!id) return;
    setError("");
    try {
      await updateLead({ id, body: { ...workflowDraft, followUpAt: workflowDraft.followUpAt || null } }).unwrap();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not update this lead. Please try again."));
    }
  }

  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Health check lead</SheetTitle>
          <SheetDescription>Contact, consent, submitted answers, and result snapshot.</SheetDescription>
        </SheetHeader>
        {detailQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center"><LoaderCircle className="animate-spin text-blue-600" aria-label="Loading lead detail" /></div>
        ) : detailQuery.isError || !lead ? (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">This lead could not be loaded.</div>
        ) : (
          <div className="space-y-6 p-4">
            <section>
              <h3 className="font-semibold">{lead.contact.name}</h3>
              <div className="mt-2 grid gap-1 text-sm text-slate-600">
                <span>{lead.contact.companyName}{lead.contact.location ? ` · ${lead.contact.location}` : ""}</span>
                <a className="text-blue-700 underline" href={`mailto:${lead.contact.email}`}>{lead.contact.email}</a>
                <a className="text-blue-700 underline" href={`tel:${lead.contact.phone}`}>{lead.contact.phone}</a>
                <span>Consent: {lead.consentToContact ? `Yes · ${readable(lead.followUpPreference)}` : "No follow-up consent"}</span>
              </div>
            </section>

            <section className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold">Result snapshot</h3>
              <p className="mt-2 text-sm"><strong>{priorityLabels[lead.result.priority]}</strong> · {areaLabels[lead.result.primaryArea]}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{lead.result.explanation}</p>
              <div className="mt-3 flex flex-wrap gap-2">{lead.result.recommendedModules.map((module) => <span className="rounded-full bg-white px-2.5 py-1 text-xs" key={module}>{module}</span>)}</div>
            </section>

            <section>
              <h3 className="mb-3 font-semibold">Submitted savings projection</h3>
              <SavingsProjectionView projection={lead.result.savingsProjection} compact />
            </section>

            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">All submitted answers ({lead.answers.length})</summary>
              <dl className="mt-4 space-y-3">
                {lead.answers.map((answer) => <div key={answer.questionId} className="border-t pt-3 text-sm first:border-0 first:pt-0"><dt className="font-medium">{questionLabels.get(answer.questionId) ?? answer.questionId}</dt><dd className="mt-1 text-slate-600">{answer.value}</dd></div>)}
              </dl>
            </details>

            <section className="space-y-4 border-t pt-5">
              <h3 className="font-semibold">Workflow</h3>
              <div><Label>Status</Label><Select value={workflowDraft.status} onValueChange={(value: HealthCheckLeadStatus) => setDraft({ ...workflowDraft, status: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((value) => <SelectItem key={value} value={value}>{readable(value)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="assigned-to">Assigned to</Label><Input id="assigned-to" className="mt-1" maxLength={160} value={workflowDraft.assignedTo ?? ""} onChange={(event) => setDraft({ ...workflowDraft, assignedTo: event.target.value })} /></div>
              <div><Label htmlFor="follow-up-at">Next follow-up</Label><div className="relative mt-1"><CalendarClock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><Input id="follow-up-at" type="datetime-local" className="pl-9" value={workflowDraft.followUpAt ?? ""} disabled={!lead.consentToContact} onChange={(event) => setDraft({ ...workflowDraft, followUpAt: event.target.value })} /></div></div>
              <div><Label htmlFor="lead-notes">Internal notes</Label><Textarea id="lead-notes" className="mt-1 min-h-28" value={workflowDraft.notes ?? ""} onChange={(event) => setDraft({ ...workflowDraft, notes: event.target.value })} /></div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Button onClick={save} disabled={updateState.isLoading}>{updateState.isLoading ? "Saving…" : "Save lead"}</Button>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
