"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateLeaveRequestMutation, useGetLeaveRequestsQuery } from "@/features/leave/api/leaveApi";

export default function LeavePage() {
  const { data: requests = [], isLoading } = useGetLeaveRequestsQuery();
  const [createRequest, { isLoading: isSubmitting }] = useCreateLeaveRequestMutation();
  const [form, setForm] = useState({ leaveType: "CASUAL", startDate: "", endDate: "", reason: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createRequest(form).unwrap();
      setForm({ leaveType: "CASUAL", startDate: "", endDate: "", reason: "" });
      toast.success("Leave request submitted.");
    } catch {
      toast.error("Could not submit leave request.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-semibold">My Leave</h1><p className="text-sm text-muted-foreground">Request time off and review your leave history.</p></div>
      <Card><CardHeader><CardTitle>Request leave</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Leave type<select className="h-10 w-full rounded-md border bg-background px-3" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}><option>CASUAL</option><option>SICK</option><option>ANNUAL</option></select></label>
        <label className="space-y-2 text-sm font-medium">Reason<Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required /></label>
        <label className="space-y-2 text-sm font-medium">From<Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></label>
        <label className="space-y-2 text-sm font-medium">To<Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></label>
        <Button className="sm:col-span-2 sm:w-fit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit request"}</Button>
      </form></CardContent></Card>
      <Card><CardHeader><CardTitle>Leave history</CardTitle></CardHeader><CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : requests.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests yet.</p> : <div className="space-y-2">{requests.map((request) => <div key={request.id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm"><span>{request.leaveType || "Leave"} · {request.startDate || "-"} to {request.endDate || "-"}</span><span className="text-muted-foreground">{request.status || "PENDING"}</span></div>)}</div>}</CardContent></Card>
    </div>
  );
}
