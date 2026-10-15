"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/lib/hook";
import { cn } from "@/lib/utils";
import { humanizeEnum } from "@/lib/format";
import { useRuntimePermissions } from "@/features/partner-saas/runtime/permissions";
import {
  useGetOrganizationSettingsQuery,
  useUpdateOrganizationSettingsMutation,
} from "@/features/organization-settings/api/organizationSettingsApi";
import {
  useApproveLeaveRequestMutation,
  useCancelLeaveRequestMutation,
  useCreateLeaveRequestMutation,
  useCreateLeaveTypeMutation,
  useCreateHolidayMutation,
  useDeleteLeaveTypeMutation,
  useDeleteHolidayMutation,
  useGetLeaveBalancesQuery,
  useGetLeaveRequestQuery,
  useGetLeaveRequestCommentsQuery,
  useRequestLeaveClarificationMutation,
  useGetLeaveRequestsQuery,
  useGetLeaveTypesQuery,
  useGetLeaveCalendarQuery,
  useGetHolidaysQuery,
  useGetPendingLeaveRequestsQuery,
  useRejectLeaveRequestMutation,
  useUpdateLeaveTypeMutation,
} from "../api/leaveApi";
import type {
  HolidayResponse,
  LeaveCalendarEntry,
  LeaveRequestResponse,
  LeaveRequestStatus,
  LeaveTypeRequest,
  LeaveTypeResponse,
} from "../types/leave.types";

const approverRoles = new Set(["OWNER", "ADMIN", "MANAGEMENT"]);
const weekDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const statusVariant: Record<LeaveRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
  NEEDS_CLARIFICATION: "secondary",
};

export function LeavePage() {
  const { contextual } = useRuntimePermissions();
  return contextual ? <ContextLeavePage /> : <LegacyLeavePage />;
}

function ContextLeavePage() {
  const { can } = useRuntimePermissions();
  const [page, setPage] = useState(0);
  const [requestId, setRequestId] = useState("");
  const [editingType, setEditingType] = useState<LeaveTypeResponse | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [decision, setDecision] = useState<{ request: LeaveRequestResponse; action: "approve" | "reject" } | null>(null);
  const pending = useGetPendingLeaveRequestsQuery({ page, size: 10 });
  const types = useGetLeaveTypesQuery({ activeOnly: false }, { skip: !can("GET", "/api/leave/types") });
  const selected = useGetLeaveRequestQuery(requestId, { skip: !requestId });
  const [approve, approving] = useApproveLeaveRequestMutation();
  const [reject, rejecting] = useRejectLeaveRequestMutation();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const range = { from: toIsoDate(new Date(month.getFullYear(), month.getMonth(), 1)),
    to: toIsoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0)) };
  const calendar = useGetLeaveCalendarQuery(range, { skip: !can("GET", "/api/leave/calendar") });
  const holidays = useGetHolidaysQuery(range, { skip: !can("GET", "/api/leave/holidays") });
  return <section className="space-y-4" aria-label="Contextual leave management">
    <h1 className="text-xl font-semibold">Leave management</h1>
    <p>Reviewer access only. Self-service requests, email actions and employee balances are unavailable for this product context.</p>
    {[pending, types, calendar, holidays, selected].some((query) => query.isError) ? <p role="alert">Leave information could not be loaded. Refresh and verify current access.</p> : null}
    <Card><CardHeader><CardTitle>Pending approvals</CardTitle></CardHeader><CardContent>
      <RequestTable requests={pending.data?.content ?? []} loading={pending.isLoading} canDecide onView={setRequestId} onDecide={(request, action) => setDecision({ request, action })} />
      <Pagination page={page} totalPages={pending.data?.totalPages ?? 0} onChange={setPage} />
    </CardContent></Card>
    {can("GET", "/api/leave/types") ? <Card><CardHeader><CardTitle>Leave types</CardTitle>
      <Button disabled={!can("POST", "/api/leave/types")} onClick={() => { setEditingType(null); setTypeOpen(true); }}>New type</Button>
    </CardHeader><CardContent><TypeTable types={types.data ?? []} loading={types.isLoading}
      onEdit={(type) => { setEditingType(type); setTypeOpen(true); }} /></CardContent></Card> : null}
    {can("GET", "/api/leave/calendar") ? <Card><CardHeader><CardTitle>Leave calendar</CardTitle>
      <label>Month<Input type="month" value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
        onChange={(event) => { if (event.target.value) setMonth(new Date(`${event.target.value}-01T12:00:00`)); }} /></label>
    </CardHeader><CardContent><MonthCalendar month={month} entries={calendar.data ?? []} holidays={holidays.data ?? []}
      selectedDate={selectedDate} rangeStart={null} rangeEnd={null} onSelect={setSelectedDate} />
      <DayDetails date={selectedDate} entries={calendar.data ?? []} holidays={holidays.data ?? []}
        onApply={() => toast.error("Self-service leave requests are unavailable in this context.")} /></CardContent></Card> : null}
    {can("GET", "/api/leave/holidays") ? <HolidayManagement from={range.from} to={range.to} /> : null}
    <LeaveTypeDialog key={editingType?.id ?? "new"} open={typeOpen} onOpenChange={setTypeOpen} type={editingType} />
    <RequestDetailDialog request={selected.currentData} loading={selected.isFetching} open={Boolean(requestId) && !selected.isError} onOpenChange={(open) => { if (!open) setRequestId(""); }}
      onCancel={() => toast.error("Self-service cancellation is unavailable in this context.")} />
    <DecisionDialog key={decision ? `${decision.request.id}-${decision.action}` : "closed"} decision={decision}
      loading={approving.isLoading || rejecting.isLoading} onOpenChange={(open) => { if (!open) setDecision(null); }}
      onSubmit={async (comment) => {
        if (!decision) return;
        try {
          const input = { id: decision.request.id, comment };
          if (decision.action === "approve") await approve(input).unwrap();
          else await reject(input).unwrap();
          setDecision(null);
        } catch { toast.error("Unable to record the leave decision."); }
      }} />
  </section>;
}

function LegacyLeavePage() {
  const user = useAppSelector((state) => state.auth.user);
  const isApprover = Boolean(user?.role && approverRoles.has(user.role));
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [requestPage, setRequestPage] = useState(0);
  const [pendingPage, setPendingPage] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeResponse | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ request: LeaveRequestResponse; action: "approve" | "reject" } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(currentYear, new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const { data: balances = [], isLoading: balancesLoading } = useGetLeaveBalancesQuery(year);
  const { data: activeTypes = [], isLoading: typesLoading } = useGetLeaveTypesQuery({ activeOnly: true });
  const { data: allTypes = [] } = useGetLeaveTypesQuery({ activeOnly: false }, { skip: !isApprover });
  const { data: requests, isLoading: requestsLoading } = useGetLeaveRequestsQuery(
    { page: requestPage, size: 10 },
  );
  const { data: pending, isLoading: pendingLoading } = useGetPendingLeaveRequestsQuery(
    { page: pendingPage, size: 10 },
    { skip: !isApprover },
  );
  const yearFrom = `${year}-01-01`;
  const yearTo = `${year}-12-31`;
  const monthFrom = toIsoDate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1));
  const monthTo = toIsoDate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0));
  const { data: calendar = [], isLoading: calendarLoading, isError: calendarError } = useGetLeaveCalendarQuery({ from: monthFrom, to: monthTo });
  const { data: holidays = [] } = useGetHolidaysQuery({ from: yearFrom, to: yearTo });
  const { data: selectedRequest, isFetching: requestLoading } = useGetLeaveRequestQuery(
    selectedRequestId ?? "",
    { skip: !selectedRequestId },
  );
  const [createRequest, { isLoading: submittingRequest }] = useCreateLeaveRequestMutation();
  const [cancelRequest] = useCancelLeaveRequestMutation();
  const [approveRequest, { isLoading: approving }] = useApproveLeaveRequestMutation();
  const [rejectRequest, { isLoading: rejecting }] = useRejectLeaveRequestMutation();

  const orgSettingsQuery = useGetOrganizationSettingsQuery(undefined, { skip: !isApprover });
  const orgSettings = orgSettingsQuery.data?.data;
  const [updateOrgSettings, { isLoading: savingWeekendRules }] = useUpdateOrganizationSettingsMutation();
  const [weekendDaysDraft, setWeekendDaysDraft] = useState<string[]>([]);
  const [weekendPaidDraft, setWeekendPaidDraft] = useState(false);

  useEffect(() => {
    if (!orgSettings) return;
    setWeekendDaysDraft(
      orgSettings.weekendDays
        ? orgSettings.weekendDays.split(",").map((day) => day.trim().toUpperCase()).filter(Boolean)
        : []
    );
    setWeekendPaidDraft(Boolean(orgSettings.weekendPaid));
  }, [orgSettings]);

  function toggleWeekendDay(day: string) {
    setWeekendDaysDraft((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day]
    );
  }

  async function handleSaveWeekendRules() {
    if (!orgSettings) return;
    try {
      await updateOrgSettings({
        ...orgSettings,
        weekendDays: weekendDaysDraft.join(","),
        weekendPaid: weekendPaidDraft,
      }).unwrap();
      toast.success("Weekend rules updated");
    } catch {
      toast.error("Unable to update weekend rules");
    }
  }

  async function handleCancel(request: LeaveRequestResponse) {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      await cancelRequest(request.id).unwrap();
      toast.success("Leave request cancelled");
    } catch {
      toast.error("Unable to cancel leave request");
    }
  }

  async function handleDecision(comment: string) {
    if (!decision) return;
    try {
      if (decision.action === "approve") {
        await approveRequest({ id: decision.request.id, comment }).unwrap();
      } else {
        await rejectRequest({ id: decision.request.id, comment }).unwrap();
      }
      toast.success(`Leave request ${decision.action === "approve" ? "approved" : "rejected"}`);
      setDecision(null);
    } catch {
      toast.error("Unable to update leave request");
    }
  }

  return (
    <div className="space-y-4 text-[12px]">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">People operations</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">Leave</h1>
          <p className="mt-0.5 text-xs text-slate-500">Plan time away, track balances and keep approvals moving.</p>
        </div>
        <Button onClick={() => setApplyOpen(true)}><Plus className="mr-2 h-4 w-4" />Apply for leave</Button>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Your leave balance</h2>
            <p className="text-xs text-slate-500">Available days for the selected balance year.</p>
          </div>
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((value) => (
                <SelectItem key={value} value={String(value)}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {balancesLoading ? <LoadingBlock /> : balances.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {balances.map((balance) => (
              <Card key={balance.leaveTypeId}>
                <CardHeader className="pb-1">
                  <CardTitle>{balance.leaveTypeName}</CardTitle>
                  <CardDescription>{balance.leaveTypeCode} · {balance.balanceYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-slate-950">{formatDays(balance.availableDays)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDays(balance.usedDays)} used · {formatDays(balance.pendingDays)} pending of {formatDays(balance.allocatedDays + balance.carryForwardDays)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <EmptyState icon={CalendarDays} title="No leave balances yet" description="Your organization has not assigned any active leave balances for this year." />}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><CardTitle>Leave calendar</CardTitle><CardDescription>Select a day to inspect leave or start a date range.</CardDescription></div>
              <div className="flex items-center gap-1">
                <Button size="icon-sm" variant="outline" aria-label="Previous month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeft /></Button>
                <Button variant="outline" className="min-w-28" onClick={() => setCalendarMonth(new Date())}>{calendarMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</Button>
                <Button size="icon-sm" variant="outline" aria-label="Next month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRight /></Button>
                <Button size="sm" className="ml-1" onClick={() => setApplyOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" />Apply</Button>
              </div>
            </div>
            <CalendarLegend />
          </CardHeader>
          <CardContent className="p-0">
            {calendarError ? <ErrorBlock message="Unable to load the leave calendar." /> : calendarLoading ? <LoadingBlock /> : (
              <MonthCalendar month={calendarMonth} entries={calendar} holidays={holidays} selectedDate={selectedDate} rangeStart={rangeStart} rangeEnd={rangeEnd} onSelect={(date) => {
                setSelectedDate(date);
                if (!rangeStart || rangeEnd) { setRangeStart(date); setRangeEnd(null); }
                else if (date < rangeStart) { setRangeStart(date); setRangeEnd(rangeStart); }
                else setRangeEnd(date);
              }} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{selectedDate ? formatDate(selectedDate) : "Select a day"}</CardTitle><CardDescription>{selectedDate ? "Leave and holiday details for this date." : "Choose a date on the calendar to see what is scheduled."}</CardDescription></CardHeader>
          <CardContent><DayDetails date={selectedDate} entries={calendar} holidays={holidays} onApply={() => setApplyOpen(true)} /></CardContent>
        </Card>
        <HolidayManagement from={yearFrom} to={yearTo} />
      </section>

      <Card>
        <CardHeader><CardTitle>Weekend rules</CardTitle><CardDescription>Choose which days count as weekends and whether the owner wants them treated as paid time off.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {orgSettingsQuery.isError ? <ErrorBlock message="Unable to load weekend settings." /> : orgSettingsQuery.isLoading ? <LoadingBlock /> : !isApprover ? (
            <p className="text-sm text-slate-600">
              Weekends are currently {weekendPaidDraft ? "treated as paid" : "unpaid"} for {weekendDaysDraft.length ? weekendDaysDraft.map((day) => day.charAt(0) + day.slice(1).toLowerCase()).join(", ") : "no configured days"}. Only owners, admins, and management can change this.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekendDay(day)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      weekendDaysDraft.includes(day)
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {day.charAt(0) + day.slice(1, 3).toLowerCase()}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={weekendPaidDraft} onChange={(event) => setWeekendPaidDraft(event.target.checked)} />
                Treat weekends as paid leave
              </label>
              <p className="text-xs text-slate-500">
                By default weekends are unpaid; enable this only if your organization wants weekend days automatically counted as paid days off in the leave calendar.
              </p>
              <Button size="sm" disabled={savingWeekendRules} onClick={() => void handleSaveWeekendRules()}>{savingWeekendRules ? "Saving..." : "Save weekend rules"}</Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My requests</CardTitle>
          <CardDescription>Review status, decisions and upcoming time away.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <RequestTable
            requests={requests?.content ?? []}
            loading={requestsLoading}
            canDecide={false}
            onView={setSelectedRequestId}
            onCancel={handleCancel}
          />
          <Pagination page={requestPage} totalPages={requests?.totalPages ?? 0} onChange={setRequestPage} />
        </CardContent>
      </Card>

      {isApprover ? (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Leave types</CardTitle><CardDescription>Configure allocations and policies for your organization.</CardDescription></div>
              <Button size="sm" onClick={() => { setEditingType(null); setTypeDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />New type</Button>
            </CardHeader>
            <CardContent className="p-0">
              <TypeTable types={allTypes} loading={typesLoading} onEdit={(type) => { setEditingType(type); setTypeDialogOpen(true); }} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Pending approvals</CardTitle><CardDescription>Review employee requests and record a decision.</CardDescription></CardHeader>
            <CardContent className="p-0">
              <RequestTable requests={pending?.content ?? []} loading={pendingLoading} canDecide onView={setSelectedRequestId} onDecide={(request, action) => setDecision({ request, action })} />
              <Pagination page={pendingPage} totalPages={pending?.totalPages ?? 0} onChange={setPendingPage} />
            </CardContent>
          </Card>
        </>
      ) : null}

      <ApplyLeaveDialog key={`${rangeStart ?? ""}-${rangeEnd ?? ""}-${applyOpen}`} open={applyOpen} onOpenChange={setApplyOpen} types={activeTypes} loading={submittingRequest} initialStartDate={rangeStart ?? selectedDate ?? ""} initialEndDate={rangeEnd ?? rangeStart ?? selectedDate ?? ""} onSubmit={async (body) => {
        try {
          await createRequest(body).unwrap();
          toast.success("Leave request submitted");
          setApplyOpen(false);
        } catch {
          toast.error("Unable to submit leave request");
        }
      }} />
      <LeaveTypeDialog key={editingType?.id ?? "new"} open={typeDialogOpen} onOpenChange={setTypeDialogOpen} type={editingType} />
      <RequestDetailDialog request={selectedRequest} loading={requestLoading} open={Boolean(selectedRequestId)} onOpenChange={(open) => { if (!open) setSelectedRequestId(null); }} onCancel={handleCancel} />
      <DecisionDialog key={decision ? `${decision.request.id}-${decision.action}` : "closed"} decision={decision} loading={approving || rejecting} onOpenChange={(open) => { if (!open) setDecision(null); }} onSubmit={handleDecision} />
    </div>
  );
}

function CalendarLegend() {
  return <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Approved paid</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />Approved unpaid</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Holiday</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-500" />Pending</span></div>;
}

function MonthCalendar({ month, entries, holidays, selectedDate, rangeStart, rangeEnd, onSelect }: { month: Date; entries: LeaveCalendarEntry[]; holidays: HolidayResponse[]; selectedDate: string | null; rangeStart: string | null; rangeEnd: string | null; onSelect: (date: string) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + index));
  const entryByDate = new Map<string, LeaveCalendarEntry[]>();
  entries.forEach((entry) => entryByDate.set(normalizeDate(entry.date), [...(entryByDate.get(normalizeDate(entry.date)) ?? []), entry]));
  const holidayByDate = new Map(holidays.map((holiday) => [normalizeDate(holiday.holidayDate), holiday]));
  return <div className="overflow-x-auto"><div className="min-w-[620px]"><div className="grid grid-cols-7 border-b bg-slate-50">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => {
    const date = toIsoDate(day);
    const dayEntries = entryByDate.get(date) ?? [];
    const holiday = holidayByDate.get(date);
    const inMonth = day.getMonth() === month.getMonth();
    const inRange = Boolean(rangeStart && date >= rangeStart && (!rangeEnd || date <= rangeEnd));
    const hasPending = dayEntries.some((entry) => entry.status === "PENDING");
    return <button type="button" key={date} aria-label={`${formatDate(date)}${holiday ? `, ${holiday.name}` : ""}`} aria-pressed={selectedDate === date} onClick={() => onSelect(date)} className={cn("relative min-h-24 border-b border-r p-2 text-left align-top transition-colors hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--factory1-primary)]", !inMonth && "bg-slate-50/70 text-slate-400", inRange && "bg-blue-50", selectedDate === date && "ring-2 ring-inset ring-[var(--factory1-primary)]")}>
      <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold", date === toIsoDate(new Date()) && "bg-slate-900 text-white")}>{day.getDate()}</span>
      <div className="mt-1 space-y-1">{holiday ? <span className="block truncate rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">{holiday.name}</span> : null}{dayEntries.slice(0, 2).map((entry, index) => <span key={`${entry.kind}-${index}`} className={cn("block truncate rounded px-1.5 py-0.5 text-[10px] font-medium", entry.status === "PENDING" || hasPending ? "bg-sky-50 text-sky-700" : entry.paid ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700")}>{entry.label}</span>)}{dayEntries.length > 2 ? <span className="block text-[10px] text-slate-500">+{dayEntries.length - 2} more</span> : null}</div>
    </button>;
  })}</div></div></div>;
}

function DayDetails({ date, entries, holidays, onApply }: { date: string | null; entries: LeaveCalendarEntry[]; holidays: HolidayResponse[]; onApply: () => void }) {
  const { contextual } = useRuntimePermissions();
  if (!date) return <p className="text-sm text-slate-500">Select a day to see leave status, holiday information, and request options.</p>;
  const dayEntries = entries.filter((entry) => normalizeDate(entry.date) === date);
  const holiday = holidays.find((item) => normalizeDate(item.holidayDate) === date);
  if (!dayEntries.length && !holiday) return <div className="space-y-3">
    <p className="text-sm text-slate-500">{contextual ? "No leave or holiday is scheduled for this day." : "This day is available for a leave request."}</p>
    {!contextual ? <Button size="sm" onClick={onApply}><Plus className="mr-1 h-3.5 w-3.5" />Request this day</Button> : null}
  </div>;
  return <div className="space-y-3">{holiday ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="font-medium text-amber-900">{holiday.name}</p><p className="mt-1 text-xs text-amber-800">{holiday.paid ? "Paid holiday" : "Unpaid holiday"}</p></div> : null}{dayEntries.map((entry, index) => <div key={`${entry.date}-${index}`} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium text-slate-900">{entry.label}</p><Badge variant={entry.status === "PENDING" ? "secondary" : entry.status === "REJECTED" ? "destructive" : "default"}>{humanizeEnum(entry.status ?? "APPROVED")}</Badge></div><p className="mt-1 text-xs text-slate-500">{entry.paid ? "Paid leave" : "Unpaid leave"} · {entry.kind}</p></div>)}</div>;
}

function RequestTable({ requests, loading, canDecide, onView, onCancel, onDecide }: {
  requests: LeaveRequestResponse[];
  loading: boolean;
  canDecide: boolean;
  onView: (id: string) => void;
  onCancel?: (request: LeaveRequestResponse) => void;
  onDecide?: (request: LeaveRequestResponse, action: "approve" | "reject") => void;
}) {
  const { can } = useRuntimePermissions();
  if (loading) return <LoadingBlock />;
  if (!requests.length) return <EmptyState icon={FileText} title={canDecide ? "No pending requests" : "No leave requests"} description={canDecide ? "New employee requests will appear here." : "Your submitted requests will appear here."} />;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Leave</TableHead>{canDecide && <TableHead>Employee</TableHead>}<TableHead>Dates</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell><button disabled={!can("GET", `/api/leave/requests/${request.id}`)} className="text-left font-medium text-blue-700 hover:underline" onClick={() => onView(request.id)}>{request.leaveTypeCode}</button><span className="block text-xs text-slate-500">{request.reason || "No reason provided"}</span></TableCell>
            {canDecide && <TableCell className="text-slate-600">{request.employeeName || "Employee name unavailable"}</TableCell>}
            <TableCell>{formatDate(request.startDate)} - {formatDate(request.endDate)}</TableCell>
            <TableCell>{formatDays(request.days)}</TableCell>
            <TableCell><Badge variant={statusVariant[request.status]}>{humanizeEnum(request.status)}</Badge></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" disabled={!can("GET", `/api/leave/requests/${request.id}`)} onClick={() => onView(request.id)}>View</Button>
                {request.status === "PENDING" && canDecide && onDecide ? <><Button size="sm" disabled={!can("POST", `/api/leave/requests/${request.id}/approve`)} onClick={() => onDecide(request, "approve")}><Check className="h-3.5 w-3.5" /></Button><Button size="sm" variant="destructive" disabled={!can("POST", `/api/leave/requests/${request.id}/reject`)} onClick={() => onDecide(request, "reject")}><X className="h-3.5 w-3.5" /></Button></> : null}
                {request.status === "PENDING" && !canDecide && onCancel ? <Button size="sm" variant="outline" onClick={() => onCancel(request)}>Cancel</Button> : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TypeTable({ types, loading, onEdit }: { types: LeaveTypeResponse[]; loading: boolean; onEdit: (type: LeaveTypeResponse) => void }) {
  const { can } = useRuntimePermissions();
  const [updateType, { isLoading: toggling }] = useUpdateLeaveTypeMutation();
  const [deleteType, { isLoading: deleting }] = useDeleteLeaveTypeMutation();
  const [toggleTarget, setToggleTarget] = useState<LeaveTypeResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveTypeResponse | null>(null);

  async function handleToggleConfirm() {
    if (!toggleTarget) return;
    const nextActive = !toggleTarget.active;
    try {
      await updateType({
        id: toggleTarget.id,
        body: {
          code: toggleTarget.code,
          name: toggleTarget.name,
          allocationPeriod: toggleTarget.allocationPeriod,
          allocationDays: toggleTarget.allocationDays,
          paid: toggleTarget.paid,
          active: nextActive,
          carryForward: toggleTarget.carryForward,
          maxCarryForwardDays: toggleTarget.maxCarryForwardDays,
          expiryMonths: toggleTarget.expiryMonths,
        },
      }).unwrap();
      toast.success(nextActive ? "Leave type reactivated" : "Leave type deactivated");
      setToggleTarget(null);
    } catch {
      toast.error(`Unable to ${nextActive ? "reactivate" : "deactivate"} leave type`);
    }

  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      const result = await deleteType(deleteTarget.id).unwrap();
      toast.success(result.deleted ? "Leave type deleted" : result.message);
      setDeleteTarget(null);
    } catch {
      toast.error("Unable to delete leave type");
    }
  }

  if (loading) return <LoadingBlock />;
  if (!types.length) return <EmptyState icon={Settings2} title="No leave types configured" description="Create the first leave type for your organization." />;
  return (
    <div className="overflow-x-auto">
      <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Allocation</TableHead><TableHead>Carry forward</TableHead><TableHead>Expiry</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
        <TableBody>{types.map((type) => <TableRow key={type.id}>
          <TableCell><span className="font-medium">{type.name}</span><span className="block text-xs text-slate-500">{type.code}</span></TableCell>
          <TableCell>{formatDays(type.allocationDays)} / {type.allocationPeriod.toLowerCase()}</TableCell>
          <TableCell>{type.carryForward ? `Up to ${formatDays(type.maxCarryForwardDays)}` : "No"}</TableCell>
          <TableCell>{type.expiryMonths ? `${type.expiryMonths} months` : "No expiry"}</TableCell>
          <TableCell>{type.paid ? "Yes" : "No"}</TableCell>
          <TableCell><Badge variant={type.active ? "default" : "outline"}>{type.active ? "Active" : "Inactive"}</Badge></TableCell>
          <TableCell className="text-right"><div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" disabled={!can("PUT", `/api/leave/types/${type.id}`)} onClick={() => onEdit(type)}>Edit</Button>
            <Button size="sm" variant={type.active ? "destructive" : "outline"} disabled={!can("PUT", `/api/leave/types/${type.id}`)} onClick={() => setToggleTarget(type)}>{type.active ? "Deactivate" : "Reactivate"}</Button>
            <Button size="sm" variant="destructive" disabled={!can("DELETE", `/api/leave/types/${type.id}`)} onClick={() => setDeleteTarget(type)}>Delete</Button>
          </div></TableCell>
        </TableRow>)}</TableBody></Table>

      <AlertDialog open={toggleTarget !== null} onOpenChange={(open) => { if (!open && !toggling) setToggleTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleTarget?.active ? "Deactivate" : "Reactivate"} {toggleTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.active
                ? "This leave type will be hidden from new leave requests, but existing history and balances are kept."
                : "This leave type will become available again for new leave requests."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={toggling} onClick={handleToggleConfirm}>
              {toggling ? "Saving..." : toggleTarget?.active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this leave type?</AlertDialogTitle>
            <AlertDialogDescription>Delete this leave type? If it&apos;s currently in use, it will be deactivated instead of deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDeleteConfirm}>{deleting ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ApplyLeaveDialog({ open, onOpenChange, types, loading, initialStartDate, initialEndDate, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; types: LeaveTypeResponse[]; loading: boolean; initialStartDate: string; initialEndDate: string; onSubmit: (body: { leaveTypeId: string; startDate: string; endDate: string; reason: string }) => Promise<void> }) {
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [reason, setReason] = useState("");
  const valid = Boolean(leaveTypeId && startDate && endDate && startDate <= endDate && reason.trim());
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Apply for leave</DialogTitle><DialogDescription>Submit your request for manager approval.</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (valid) void onSubmit({ leaveTypeId, startDate, endDate, reason: reason.trim() }); }}><FieldLabel label="Leave type"><Select value={leaveTypeId} onValueChange={setLeaveTypeId}><SelectTrigger className="w-full"><SelectValue placeholder="Select leave type" /></SelectTrigger><SelectContent>{types.map((type) => <SelectItem key={type.id} value={type.id}>{type.name} ({type.code})</SelectItem>)}</SelectContent></Select></FieldLabel><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Start date"><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></FieldLabel><FieldLabel label="End date"><Input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></FieldLabel></div><FieldLabel label="Reason"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Add context for the approver" /></FieldLabel><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button disabled={!valid || loading} type="submit">{loading ? "Submitting..." : "Submit request"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function LeaveTypeDialog({ open, onOpenChange, type }: { open: boolean; onOpenChange: (open: boolean) => void; type: LeaveTypeResponse | null }) {
  const [createType, { isLoading: creating }] = useCreateLeaveTypeMutation();
  const [updateType, { isLoading: updating }] = useUpdateLeaveTypeMutation();
  const [form, setForm] = useState<LeaveTypeRequest>(() => type ? {
    code: type.code,
    name: type.name,
    allocationPeriod: type.allocationPeriod,
    allocationDays: type.allocationDays,
    paid: type.paid,
    active: type.active,
    carryForward: type.carryForward,
    maxCarryForwardDays: type.maxCarryForwardDays,
    expiryMonths: type.expiryMonths,
  } : emptyType);
  const saving = creating || updating;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim() || form.allocationDays <= 0) return;
    try {
      if (type) await updateType({ id: type.id, body: form }).unwrap();
      else await createType(form).unwrap();
      toast.success(type ? "Leave type updated" : "Leave type created");
      onOpenChange(false);
    } catch {
      toast.error("Unable to save leave type");
    }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{type ? "Edit leave type" : "New leave type"}</DialogTitle><DialogDescription>Define how this leave is allocated and carried forward.</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={submit}><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Code"><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></FieldLabel><FieldLabel label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FieldLabel></div><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Allocation period"><Select value={form.allocationPeriod} onValueChange={(value: "MONTHLY" | "FORTNIGHT" | "YEARLY") => setForm({ ...form, allocationPeriod: value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="FORTNIGHT">Fortnight (15 days)</SelectItem><SelectItem value="YEARLY">Yearly</SelectItem></SelectContent></Select></FieldLabel><FieldLabel label="Allocation days"><Input type="number" min="0.5" step="0.5" value={form.allocationDays} onChange={(event) => setForm({ ...form, allocationDays: Number(event.target.value) })} /></FieldLabel></div><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Max carry-forward days"><Input type="number" min="0" step="0.5" value={form.maxCarryForwardDays} onChange={(event) => setForm({ ...form, maxCarryForwardDays: Number(event.target.value) })} /></FieldLabel><FieldLabel label="Expiry months"><Input type="number" min="0" value={form.expiryMonths} onChange={(event) => setForm({ ...form, expiryMonths: Number(event.target.value) })} /></FieldLabel></div><div className="grid gap-2 sm:grid-cols-3">{[["paid", "Paid"], ["active", "Active"], ["carryForward", "Carry forward"]].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key as "paid" | "active" | "carryForward"]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />{label}</label>)}</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save leave type"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function RequestDetailDialog({ request, loading, open, onOpenChange, onCancel }: { request?: LeaveRequestResponse; loading: boolean; open: boolean; onOpenChange: (open: boolean) => void; onCancel: (request: LeaveRequestResponse) => void }) {
  const { contextual } = useRuntimePermissions();
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader>
    <DialogTitle>Leave request details</DialogTitle>
    <DialogDescription>{request ? `${request.leaveTypeCode} - ${formatDate(request.startDate)} to ${formatDate(request.endDate)}` : "Loading request..."}</DialogDescription>
  </DialogHeader>{loading || !request ? <LoadingBlock /> : <div className="space-y-3 text-sm">
    <div className="grid grid-cols-2 gap-3"><Detail label="Days" value={formatDays(request.days)} />
      <Detail label="Status" value={humanizeEnum(request.status)} /><Detail label="Employee" value={request.employeeName || "Employee name unavailable"} />
      <Detail label="Decision date" value={request.decisionAt ? formatDate(request.decisionAt) : "-"} /></div>
    <div><p className="text-xs font-medium text-slate-500">Reason</p><p className="mt-1 whitespace-pre-wrap">{request.reason || "No reason provided"}</p></div>
    {request.decisionComment ? <div><p className="text-xs font-medium text-slate-500">Decision comment</p><p className="mt-1 whitespace-pre-wrap">{request.decisionComment}</p></div> : null}
    {contextual && open ? <ReviewerComments key={request.id} request={request} /> : null}
    <DialogFooter>{!contextual && request.status === "PENDING" ? <Button variant="outline" onClick={() => onCancel(request)}>Cancel request</Button> : null}
      <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
  </div>}</DialogContent></Dialog>;
}

function ReviewerComments({ request }: { request: LeaveRequestResponse }) {
  const { can } = useRuntimePermissions();
  const comments = useGetLeaveRequestCommentsQuery(request.id, { skip: !can("GET", `/api/leave/requests/${request.id}/comments`) });
  const [clarify, saving] = useRequestLeaveClarificationMutation();
  const [comment, setComment] = useState("");
  const submitting = useRef(false);
  return <section className="space-y-3 border-t pt-3" aria-label="Reviewer comments">
    <h3 className="font-semibold">Reviewer discussion</h3>
    {comments.isFetching ? <p role="status">Loading comments...</p> : null}
    {comments.isError ? <p role="alert">Reviewer comments could not be loaded.</p> : null}
    {!comments.isError ? comments.currentData?.map((entry) => <div key={entry.id} className="rounded border p-2">
      <p>{entry.authorName || "Reviewer"} - {humanizeEnum(entry.authorRole)} - {formatDate(entry.createdAt)}</p>
      <p className="whitespace-pre-wrap">{entry.body}</p>
    </div>) : null}
    {request.status === "PENDING" && can("POST", `/api/leave/requests/${request.id}/clarification`) ? <form className="space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      if (submitting.current || saving.isLoading) return;
      if (!comment.trim() || comment.trim().length > 2000) { toast.error("Enter a clarification of 1 to 2000 characters."); return; }
      submitting.current = true;
      try {
        await clarify({ id: request.id, comment: comment.trim() }).unwrap();
        setComment(""); toast.success("Clarification requested");
      } catch { toast.error("Unable to request clarification."); }
      finally { submitting.current = false; }
    }}>
      <label>Clarification required<Textarea required maxLength={2000} disabled={saving.isLoading} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
      <Button disabled={saving.isLoading || comments.isFetching || comments.isError} type="submit">Request clarification</Button>
    </form> : null}
  </section>;
}

function HolidayManagement({ from, to }: { from: string; to: string }) {
  const { can } = useRuntimePermissions();
  const user = useAppSelector((state) => state.auth.user);
  const reviewer = Boolean(user && approverRoles.has(user.role));
  const holidays = useGetHolidaysQuery({ from, to }, { skip: !can("GET", "/api/leave/holidays") });
  const [form, setForm] = useState({ holidayDate: "", name: "", paid: true });
  const [target, setTarget] = useState<HolidayResponse | null>(null);
  const [create, creating] = useCreateHolidayMutation();
  const [remove, deleting] = useDeleteHolidayMutation();
  const submitting = useRef(false);
  const busy = creating.isLoading || deleting.isLoading;
  return <Card className="xl:col-span-2"><CardHeader><CardTitle>Organization holidays</CardTitle>
    <CardDescription>Configure paid and unpaid holidays used by attendance in this factory.</CardDescription></CardHeader>
    <CardContent className="space-y-3">
      {holidays.isError ? <ErrorBlock message="Unable to load organization holidays." /> : holidays.isLoading ? <LoadingBlock /> :
        holidays.currentData?.length ? holidays.currentData.map((holiday) => <div key={holiday.id} className="flex items-center justify-between gap-2 rounded border p-2">
          <div><p className="font-medium">{holiday.name}</p><p>{formatDate(holiday.holidayDate)} - {holiday.paid ? "Paid" : "Unpaid"}</p></div>
          {reviewer ? <Button size="icon-sm" variant="ghost" aria-label={`Delete ${holiday.name}`} disabled={busy || !can("DELETE", `/api/leave/holidays/${holiday.id}`)} onClick={() => setTarget(holiday)}><Trash2 className="h-4 w-4" /></Button> : null}
        </div>) : <p>No holidays configured for this period.</p>}
      {reviewer && can("POST", "/api/leave/holidays") ? <form className="space-y-2 border-t pt-3" onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current || busy) return;
        if (!form.holidayDate || !form.name.trim()) { toast.error("Enter a holiday date and name."); return; }
        submitting.current = true;
        try {
          await create({ ...form, name: form.name.trim() }).unwrap();
          setForm({ holidayDate: "", name: "", paid: true }); toast.success("Holiday added");
        } catch { toast.error("Unable to add holiday."); }
        finally { submitting.current = false; }
      }}>
        <FieldLabel label="Holiday date"><Input required type="date" disabled={busy} value={form.holidayDate} onChange={(event) => setForm({ ...form, holidayDate: event.target.value })} /></FieldLabel>
        <FieldLabel label="Holiday name"><Input required maxLength={100} disabled={busy} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FieldLabel>
        <label><input type="checkbox" disabled={busy} checked={form.paid} onChange={(event) => setForm({ ...form, paid: event.target.checked })} /> Paid</label>
        <Button type="submit" disabled={busy || holidays.isFetching || holidays.isError}>Add holiday</Button>
      </form> : null}
      <AlertDialog open={Boolean(target)} onOpenChange={(open) => { if (!open && !busy) setTarget(null); }}><AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete holiday?</AlertDialogTitle><AlertDialogDescription>Delete {target?.name} from the selected factory.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy || !target || !can("DELETE", `/api/leave/holidays/${target?.id}`)} onClick={(event) => {
            event.preventDefault();
            if (!target || submitting.current || busy) return;
            submitting.current = true;
            void remove(target.id).unwrap().then(() => { setTarget(null); toast.success("Holiday deleted"); })
              .catch(() => toast.error("Unable to delete holiday.")).finally(() => { submitting.current = false; });
          }}>Delete holiday</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent></AlertDialog>
    </CardContent>
  </Card>;
}

function DecisionDialog({ decision, loading, onOpenChange, onSubmit }: { decision: { request: LeaveRequestResponse; action: "approve" | "reject" } | null; loading: boolean; onOpenChange: (open: boolean) => void; onSubmit: (comment: string) => Promise<void> }) {
  const [comment, setComment] = useState("");
  return <Dialog open={Boolean(decision)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{decision?.action === "approve" ? "Approve leave request" : "Reject leave request"}</DialogTitle><DialogDescription>A comment helps the employee understand this decision.</DialogDescription></DialogHeader><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional comment" /><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button variant={decision?.action === "reject" ? "destructive" : "default"} disabled={loading} onClick={() => void onSubmit(comment.trim())}>{loading ? "Saving..." : decision?.action === "approve" ? "Approve" : "Reject"}</Button></DialogFooter></DialogContent></Dialog>;
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-700">{label}</span>{children}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-900">{value}</p></div>; }
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) { if (totalPages <= 1) return null; return <div className="flex items-center justify-end gap-2 border-t px-3 py-2"><span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span><Button size="icon-sm" variant="outline" disabled={page === 0} onClick={() => onChange(page - 1)}><ChevronLeft /></Button><Button size="icon-sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight /></Button></div>; }
function LoadingBlock() { return <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500"><Clock3 className="h-4 w-4 animate-pulse" />Loading...</div>; }
function ErrorBlock({ message }: { message: string }) { return <p className="p-4 text-sm text-red-700">{message}</p>; }
function formatDays(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }
function toIsoDate(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
function normalizeDate(value: string) { return value.slice(0, 10); }
const emptyType: LeaveTypeRequest = { code: "", name: "", allocationPeriod: "YEARLY", allocationDays: 1, paid: true, active: true, carryForward: false, maxCarryForwardDays: 0, expiryMonths: 0 };
