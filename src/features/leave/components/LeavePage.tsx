"use client";

import { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/lib/hook";
import {
  useApproveLeaveRequestMutation,
  useCancelLeaveRequestMutation,
  useCreateLeaveRequestMutation,
  useCreateLeaveTypeMutation,
  useGetLeaveBalancesQuery,
  useGetLeaveRequestQuery,
  useGetLeaveRequestsQuery,
  useGetLeaveTypesQuery,
  useGetPendingLeaveRequestsQuery,
  useRejectLeaveRequestMutation,
  useUpdateLeaveTypeMutation,
} from "../api/leaveApi";
import type {
  LeaveRequestResponse,
  LeaveRequestStatus,
  LeaveTypeRequest,
  LeaveTypeResponse,
} from "../types/leave.types";

const approverRoles = new Set(["OWNER", "ADMIN", "MANAGEMENT"]);
const statusVariant: Record<LeaveRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

export function LeavePage() {
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
  const { data: selectedRequest, isFetching: requestLoading } = useGetLeaveRequestQuery(
    selectedRequestId ?? "",
    { skip: !selectedRequestId },
  );
  const [createRequest, { isLoading: submittingRequest }] = useCreateLeaveRequestMutation();
  const [cancelRequest] = useCancelLeaveRequestMutation();
  const [approveRequest, { isLoading: approving }] = useApproveLeaveRequestMutation();
  const [rejectRequest, { isLoading: rejecting }] = useRejectLeaveRequestMutation();

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

      <ApplyLeaveDialog open={applyOpen} onOpenChange={setApplyOpen} types={activeTypes} loading={submittingRequest} onSubmit={async (body) => {
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

function RequestTable({ requests, loading, canDecide, onView, onCancel, onDecide }: {
  requests: LeaveRequestResponse[];
  loading: boolean;
  canDecide: boolean;
  onView: (id: string) => void;
  onCancel?: (request: LeaveRequestResponse) => void;
  onDecide?: (request: LeaveRequestResponse, action: "approve" | "reject") => void;
}) {
  if (loading) return <LoadingBlock />;
  if (!requests.length) return <EmptyState icon={FileText} title={canDecide ? "No pending requests" : "No leave requests"} description={canDecide ? "New employee requests will appear here." : "Your submitted requests will appear here."} />;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Leave</TableHead>{canDecide && <TableHead>Employee</TableHead>}<TableHead>Dates</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell><button className="text-left font-medium text-blue-700 hover:underline" onClick={() => onView(request.id)}>{request.leaveTypeCode}</button><span className="block text-xs text-slate-500">{request.reason || "No reason provided"}</span></TableCell>
            {canDecide && <TableCell className="text-slate-600">{request.employeeId}</TableCell>}
            <TableCell>{formatDate(request.startDate)} - {formatDate(request.endDate)}</TableCell>
            <TableCell>{formatDays(request.days)}</TableCell>
            <TableCell><Badge variant={statusVariant[request.status]}>{request.status}</Badge></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => onView(request.id)}>View</Button>
                {request.status === "PENDING" && canDecide && onDecide ? <><Button size="sm" onClick={() => onDecide(request, "approve")}><Check className="h-3.5 w-3.5" /></Button><Button size="sm" variant="destructive" onClick={() => onDecide(request, "reject")}><X className="h-3.5 w-3.5" /></Button></> : null}
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
  if (loading) return <LoadingBlock />;
  if (!types.length) return <EmptyState icon={Settings2} title="No leave types configured" description="Create the first leave type for your organization." />;
  return <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Allocation</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{types.map((type) => <TableRow key={type.id}><TableCell><span className="font-medium">{type.name}</span><span className="block text-xs text-slate-500">{type.code}</span></TableCell><TableCell>{formatDays(type.allocationDays)} / {type.allocationPeriod.toLowerCase()} {type.carryForward ? `· carry forward up to ${formatDays(type.maxCarryForwardDays)}` : ""}</TableCell><TableCell>{type.paid ? "Yes" : "No"}</TableCell><TableCell><Badge variant={type.active ? "default" : "outline"}>{type.active ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => onEdit(type)}>Edit</Button></TableCell></TableRow>)}</TableBody></Table>;
}

function ApplyLeaveDialog({ open, onOpenChange, types, loading, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; types: LeaveTypeResponse[]; loading: boolean; onSubmit: (body: { leaveTypeId: string; startDate: string; endDate: string; reason: string }) => Promise<void> }) {
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{type ? "Edit leave type" : "New leave type"}</DialogTitle><DialogDescription>Define how this leave is allocated and carried forward.</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={submit}><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Code"><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></FieldLabel><FieldLabel label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FieldLabel></div><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Allocation period"><Select value={form.allocationPeriod} onValueChange={(value: "MONTHLY" | "YEARLY") => setForm({ ...form, allocationPeriod: value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="YEARLY">Yearly</SelectItem></SelectContent></Select></FieldLabel><FieldLabel label="Allocation days"><Input type="number" min="0.5" step="0.5" value={form.allocationDays} onChange={(event) => setForm({ ...form, allocationDays: Number(event.target.value) })} /></FieldLabel></div><div className="grid gap-3 sm:grid-cols-2"><FieldLabel label="Max carry-forward days"><Input type="number" min="0" step="0.5" value={form.maxCarryForwardDays} onChange={(event) => setForm({ ...form, maxCarryForwardDays: Number(event.target.value) })} /></FieldLabel><FieldLabel label="Expiry months"><Input type="number" min="0" value={form.expiryMonths} onChange={(event) => setForm({ ...form, expiryMonths: Number(event.target.value) })} /></FieldLabel></div><div className="grid gap-2 sm:grid-cols-3">{[["paid", "Paid"], ["active", "Active"], ["carryForward", "Carry forward"]].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key as "paid" | "active" | "carryForward"]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />{label}</label>)}</div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save leave type"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function RequestDetailDialog({ request, loading, open, onOpenChange, onCancel }: { request?: LeaveRequestResponse; loading: boolean; open: boolean; onOpenChange: (open: boolean) => void; onCancel: (request: LeaveRequestResponse) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Leave request details</DialogTitle><DialogDescription>{request ? `${request.leaveTypeCode} · ${formatDate(request.startDate)} to ${formatDate(request.endDate)}` : "Loading request..."}</DialogDescription></DialogHeader>{loading || !request ? <LoadingBlock /> : <div className="space-y-3 text-sm"><div className="grid grid-cols-2 gap-3"><Detail label="Days" value={formatDays(request.days)} /><Detail label="Status" value={request.status} /><Detail label="Employee" value={request.employeeId} /><Detail label="Decision date" value={request.decisionAt ? formatDate(request.decisionAt) : "—"} /></div><div><p className="text-xs font-medium text-slate-500">Reason</p><p className="mt-1 whitespace-pre-wrap">{request.reason || "No reason provided"}</p></div>{request.decisionComment ? <div><p className="text-xs font-medium text-slate-500">Decision comment</p><p className="mt-1 whitespace-pre-wrap">{request.decisionComment}</p></div> : null}<DialogFooter>{request.status === "PENDING" ? <Button variant="outline" onClick={() => onCancel(request)}>Cancel request</Button> : null}<Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter></div>}</DialogContent></Dialog>;
}

function DecisionDialog({ decision, loading, onOpenChange, onSubmit }: { decision: { request: LeaveRequestResponse; action: "approve" | "reject" } | null; loading: boolean; onOpenChange: (open: boolean) => void; onSubmit: (comment: string) => Promise<void> }) {
  const [comment, setComment] = useState("");
  return <Dialog open={Boolean(decision)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{decision?.action === "approve" ? "Approve leave request" : "Reject leave request"}</DialogTitle><DialogDescription>A comment helps the employee understand this decision.</DialogDescription></DialogHeader><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional comment" /><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button variant={decision?.action === "reject" ? "destructive" : "default"} disabled={loading} onClick={() => void onSubmit(comment.trim())}>{loading ? "Saving..." : decision?.action === "approve" ? "Approve" : "Reject"}</Button></DialogFooter></DialogContent></Dialog>;
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-700">{label}</span>{children}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-900">{value}</p></div>; }
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) { if (totalPages <= 1) return null; return <div className="flex items-center justify-end gap-2 border-t px-3 py-2"><span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span><Button size="icon-sm" variant="outline" disabled={page === 0} onClick={() => onChange(page - 1)}><ChevronLeft /></Button><Button size="icon-sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight /></Button></div>; }
function LoadingBlock() { return <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500"><Clock3 className="h-4 w-4 animate-pulse" />Loading...</div>; }
function formatDays(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }
const emptyType: LeaveTypeRequest = { code: "", name: "", allocationPeriod: "YEARLY", allocationDays: 1, paid: true, active: true, carryForward: false, maxCarryForwardDays: 0, expiryMonths: 0 };
