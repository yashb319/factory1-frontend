"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCloseAccountingPeriodMutation,
  useCreateAccountingPeriodMutation,
  useGetAccountingPeriodsQuery,
  useReopenAccountingPeriodMutation,
} from "@/features/accounting/api/accountingApi";
import type { AccountingPeriod } from "@/features/accounting/types/accounting.types";

function errorMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const data = (error as { data?: { message?: unknown } }).data;
  return typeof data?.message === "string" ? data.message : null;
}

export function AccountingPeriodsPanel() {
  const { data: periods = [], isFetching, isError, refetch } =
    useGetAccountingPeriodsQuery();
  const [createPeriod, createState] = useCreateAccountingPeriodMutation();
  const [closePeriod, closeState] = useCloseAccountingPeriodMutation();
  const [reopenPeriod, reopenState] = useReopenAccountingPeriodMutation();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionPeriod, setActionPeriod] = useState<AccountingPeriod | null>(null);
  const [action, setAction] = useState<"close" | "reopen" | null>(null);
  const [reason, setReason] = useState("");

  async function create() {
    if (!name.trim() || !startDate || !endDate) {
      toast.error("Name, start date and end date are required");
      return;
    }
    if (endDate < startDate) {
      toast.error("Period end cannot be before its start");
      return;
    }
    const overlaps = periods.some(
      (period) => startDate <= period.endDate && endDate >= period.startDate,
    );
    if (overlaps) {
      toast.error("This period overlaps an existing accounting period");
      return;
    }
    try {
      await createPeriod({ name: name.trim(), startDate, endDate }).unwrap();
      setName("");
      setStartDate("");
      setEndDate("");
      toast.success("Accounting period created");
    } catch (error) {
      toast.error(errorMessage(error) ?? "Could not create accounting period");
    }
  }

  async function confirmAction() {
    if (!actionPeriod || !action) return;
    if (action === "reopen" && !reason.trim()) {
      toast.error("A reason is required to reopen a period");
      return;
    }
    try {
      if (action === "close") {
        await closePeriod({ id: actionPeriod.id, reason: reason.trim() || null }).unwrap();
        toast.success("Accounting period closed");
      } else {
        await reopenPeriod({ id: actionPeriod.id, reason: reason.trim() }).unwrap();
        toast.success("Accounting period reopened");
      }
      setActionPeriod(null);
      setAction(null);
      setReason("");
    } catch (error) {
      toast.error(
        errorMessage(error) ??
          (action === "close"
            ? "Could not close accounting period"
            : "Could not reopen accounting period"),
      );
    }
  }

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-labelledby="accounting-periods-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="accounting-periods-title" className="text-sm font-semibold">
            Accounting periods
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Posting and reversals are allowed only in open periods.
          </p>
        </div>
        {isFetching ? <span className="text-xs text-muted-foreground">Refreshing...</span> : null}
      </div>

      {isError ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Could not load accounting periods.
          <Button className="ml-2" size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((period) => (
            <div key={period.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{period.name}</span>
                  <Badge variant={period.status === "OPEN" ? "outline" : "secondary"}>
                    {period.status === "OPEN" ? "Open" : "Closed"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {period.startDate} to {period.endDate}
                </p>
                {period.status === "CLOSED" && period.closeReason ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Closed: {period.closeReason}
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActionPeriod(period);
                  setAction(period.status === "OPEN" ? "close" : "reopen");
                  setReason("");
                }}
              >
                {period.status === "OPEN" ? "Close period" : "Reopen period"}
              </Button>
            </div>
          ))}
          {!periods.length && !isFetching ? (
            <div className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
              No accounting periods configured.
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="period-name">New period name</Label>
          <Input id="period-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="FY 2026-27" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="period-start">Start date</Label>
          <Input id="period-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="period-end">End date</Label>
          <Input id="period-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <Button className="sm:col-span-2" disabled={createState.isLoading} onClick={() => void create()}>
          Create accounting period
        </Button>
      </div>

      {actionPeriod && action ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium">
            {action === "close" ? "Close" : "Reopen"} {actionPeriod.name}?
          </p>
          <p className="text-xs text-amber-900">
            {action === "close"
              ? "Closing runs pre-close checks and is blocked while drafts or unbalanced posted data remain."
              : "Reopening permits new accounting effects in this historical date range. Record why this is necessary."}
          </p>
          <div className="space-y-1">
            <Label htmlFor="period-action-reason">
              Reason {action === "reopen" ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              id="period-action-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={action === "close" ? "Month-end close" : "Correction required"}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActionPeriod(null);
                setAction(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={closeState.isLoading || reopenState.isLoading}
              onClick={() => void confirmAction()}
            >
              Confirm {action}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
