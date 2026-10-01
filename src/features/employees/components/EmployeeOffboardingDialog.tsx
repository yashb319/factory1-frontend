"use client";

import { useMemo, useState } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
  AlertTriangle,
  CalendarClock,
  IndianRupee,
  Loader2,
  RotateCcw,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/apiError";
import { useGetLeaveTypesQuery } from "@/features/leave/api/leaveApi";

import {
  useCancelEmployeeOffboardingMutation,
  useConfirmEmployeeOffboardingMutation,
  useGetEmployeeOffboardingQuery,
  usePreviewEmployeeOffboardingMutation,
} from "../api/employeeApi";
import type {
  Employee,
  EmployeeOffboardingRequest,
  EmployeeOffboardingResponse,
} from "../types/employee.types";

interface Props {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isNotFound(error: unknown) {
  return (error as FetchBaseQueryError | undefined)?.status === 404;
}

function money(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function OffboardingSummary({
  data,
  persisted = false,
}: {
  data: EmployeeOffboardingResponse;
  persisted?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Last working date</p>
          <p className="mt-1 font-medium">{data.lastWorkingDate}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Access revocation</p>
          <p className="mt-1 font-medium">
            {data.accessRevocationScheduled ? "Scheduled" : "Immediate"}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.accessRevocationAt}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            {persisted ? "Resignation status" : "Preview status"}
          </p>
          <p className="mt-1 font-medium">{data.status.replaceAll("_", " ")}</p>
        </div>
      </div>

      {data.pendingWorkWarnings.length > 0 && (
        <section className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Pending work requires attention
          </div>
          <p className="text-sm">
            Resignation can continue, but reassign these items before the
            employee&apos;s last working date.
          </p>
          <ul className="space-y-1 text-sm">
            {data.pendingWorkWarnings.map((warning, index) => (
              <li key={`${warning.type}-${warning.referenceId ?? index}`}>
                • {warning.referenceCode ? `${warning.referenceCode}: ` : ""}
                {warning.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Leave settlement</h3>
          <p className="text-sm text-muted-foreground">
            Only explicitly selected leave types are included in F&amp;F.
          </p>
        </div>
        {data.leaveSettlements.length ? (
          <div className="overflow-hidden rounded-lg border">
            {data.leaveSettlements.map((leave) => (
              <div
                key={leave.leaveTypeId}
                className="grid grid-cols-2 gap-2 border-b p-3 text-sm last:border-b-0 sm:grid-cols-4"
              >
                <span className="font-medium">
                  {leave.leaveTypeName} ({leave.leaveTypeCode})
                </span>
                <span>{leave.availableDays} available</span>
                <span>
                  {leave.encashmentSupported
                    ? `${leave.encashableDays} encashable`
                    : "Encashment not supported"}
                </span>
                <span className="text-right font-medium">
                  {money(
                    leave.encashmentAmount,
                    data.payrollEstimate.currency
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No leave balance is included in this settlement.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Final salary estimate</h3>
        </div>
        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Payroll period</p>
            <p className="text-sm font-medium">
              {data.payrollEstimate.periodStart} –{" "}
              {data.payrollEstimate.periodEnd}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gross earnings</p>
            <p className="text-sm font-medium">
              {money(
                data.payrollEstimate.grossEarnings,
                data.payrollEstimate.currency
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Deductions</p>
            <p className="text-sm font-medium">
              {money(
                data.payrollEstimate.deductions,
                data.payrollEstimate.currency
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated F&amp;F net</p>
            <p className="text-base font-semibold">
              {money(data.payrollEstimate.netPay, data.payrollEstimate.currency)}
            </p>
          </div>
        </div>
      </section>

      {data.validationMessages.length > 0 && (
        <ul className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {data.validationMessages.map((message) => (
            <li key={message}>• {message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EmployeeOffboardingDialog({
  employee,
  open,
  onOpenChange,
}: Props) {
  const [lastWorkingDate, setLastWorkingDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [includeLeaveEncashment, setIncludeLeaveEncashment] = useState(false);
  const [leaveTypeIds, setLeaveTypeIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<EmployeeOffboardingResponse | null>(
    null
  );
  const [cancellationReason, setCancellationReason] = useState("");

  const statusQuery = useGetEmployeeOffboardingQuery(employee?.id ?? "", {
    skip: !open || !employee,
  });
  const leaveTypesQuery = useGetLeaveTypesQuery(
    { activeOnly: true },
    { skip: !open || !employee }
  );
  const [previewOffboarding, previewState] =
    usePreviewEmployeeOffboardingMutation();
  const [confirmOffboarding, confirmState] =
    useConfirmEmployeeOffboardingMutation();
  const [cancelOffboarding, cancelState] =
    useCancelEmployeeOffboardingMutation();

  const persisted = statusQuery.data;
  const hasActiveOffboarding =
    persisted &&
    !["CANCELLED", "PAYROLL_FAILED", "PREVIEW"].includes(persisted.status);
  const failedOffboarding =
    persisted?.status === "PAYROLL_FAILED" ? persisted : null;
  const review = preview ?? failedOffboarding;

  const request = useMemo<EmployeeOffboardingRequest>(
    () =>
      failedOffboarding && !preview
        ? {
            lastWorkingDate: failedOffboarding.lastWorkingDate,
            remarks: failedOffboarding.remarks ?? undefined,
            includeLeaveEncashment:
              failedOffboarding.includeLeaveEncashment,
            leaveTypeIds: failedOffboarding.leaveTypeIds,
          }
        : {
            lastWorkingDate,
            remarks: remarks.trim() || undefined,
            includeLeaveEncashment,
            leaveTypeIds: includeLeaveEncashment ? leaveTypeIds : [],
          },
    [
      failedOffboarding,
      includeLeaveEncashment,
      lastWorkingDate,
      leaveTypeIds,
      preview,
      remarks,
    ]
  );

  function resetState() {
    setLastWorkingDate("");
    setRemarks("");
    setIncludeLeaveEncashment(false);
    setLeaveTypeIds([]);
    setPreview(null);
    setCancellationReason("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  }

  function invalidatePreview() {
    setPreview(null);
  }

  function toggleLeaveType(id: string) {
    setLeaveTypeIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
    invalidatePreview();
  }

  async function handlePreview() {
    if (!employee || !lastWorkingDate || remarks.trim().length < 3) {
      toast.error("Enter a last working date and resignation remarks.");
      return;
    }
    if (includeLeaveEncashment && leaveTypeIds.length === 0) {
      toast.error("Choose at least one leave type for F&F encashment.");
      return;
    }

    try {
      setPreview(
        await previewOffboarding({
          employeeId: employee.id,
          body: request,
        }).unwrap()
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Could not calculate resignation impact.")
      );
    }
  }

  async function handleConfirm() {
    if (!employee || !review) return;
    try {
      await confirmOffboarding({
        employeeId: employee.id,
        body: request,
      }).unwrap();
      toast.success(
        "Resignation recorded and final salary regeneration scheduled."
      );
      handleOpenChange(false);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Resignation was not completed. Review the error and retry."
        )
      );
    }
  }

  async function handleCancel() {
    if (!employee || cancellationReason.trim().length < 3) {
      toast.error("Enter a reason for cancelling the resignation.");
      return;
    }
    try {
      await cancelOffboarding({
        employeeId: employee.id,
        reason: cancellationReason.trim(),
      }).unwrap();
      toast.success("Resignation cancelled.");
      handleOpenChange(false);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Could not cancel the resignation.")
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[95vh] w-[95vw] max-w-[95vw] min-w-5xl flex-col overflow-hidden p-0"
        onEscapeKeyDown={() => handleOpenChange(false)}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>
            {hasActiveOffboarding ? "Resignation Status" : "Resign Employee"}
          </DialogTitle>
          <DialogDescription>
            {employee
              ? `${employee.name} (${employee.employeeCode})`
              : "Review resignation and full-and-final settlement."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {statusQuery.isLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hasActiveOffboarding && persisted ? (
            <>
              <OffboardingSummary data={persisted} persisted />
              {persisted.canCancel && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Cancel resignation
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Access is restored only when the backend confirms it is
                        safe to do so.
                      </p>
                    </div>
                    <Textarea
                      value={cancellationReason}
                      onChange={(event) =>
                        setCancellationReason(event.target.value)
                      }
                      placeholder="Reason for cancellation"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={cancelState.isLoading}
                      onClick={handleCancel}
                    >
                      {cancelState.isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Cancel Resignation
                    </Button>
                  </section>
                </>
              )}
            </>
          ) : failedOffboarding ? (
            <>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Final payroll generation failed. No overall offboarding success
                was recorded. Review the retained calculation and retry the
                same idempotent confirmation.
              </div>
              <OffboardingSummary data={failedOffboarding} persisted />
            </>
          ) : (
            <>
              {statusQuery.isError && !isNotFound(statusQuery.error) && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  Existing resignation status could not be loaded. Preview is
                  disabled until the status can be verified.
                </p>
              )}

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="last-working-date">Last Working Date *</Label>
                  <Input
                    id="last-working-date"
                    type="date"
                    min={employee?.joiningDate}
                    value={lastWorkingDate}
                    onChange={(event) => {
                      setLastWorkingDate(event.target.value);
                      invalidatePreview();
                    }}
                  />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="resignation-remarks">
                    Resignation Remarks *
                  </Label>
                  <Textarea
                    id="resignation-remarks"
                    value={remarks}
                    onChange={(event) => {
                      setRemarks(event.target.value);
                      invalidatePreview();
                    }}
                    placeholder="Reason and handover notes"
                  />
                </div>
              </section>

              <section className="space-y-3 rounded-xl border p-4">
                <Label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={includeLeaveEncashment}
                    onCheckedChange={(checked) => {
                      setIncludeLeaveEncashment(checked === true);
                      invalidatePreview();
                    }}
                  />
                  <span>
                    <span className="block font-medium">
                      Include remaining leave in F&amp;F
                    </span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      Select exactly which leave balances should be encashed.
                    </span>
                  </span>
                </Label>

                {includeLeaveEncashment && (
                  <div className="grid gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(leaveTypesQuery.data ?? []).map((leaveType) => (
                      <Label
                        key={leaveType.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                      >
                        <Checkbox
                          checked={leaveTypeIds.includes(leaveType.id)}
                          onCheckedChange={() => toggleLeaveType(leaveType.id)}
                        />
                        <span>
                          {leaveType.name}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({leaveType.code})
                          </span>
                        </span>
                      </Label>
                    ))}
                    {!leaveTypesQuery.isLoading &&
                      !leaveTypesQuery.data?.length && (
                        <p className="text-sm text-muted-foreground">
                          No active leave types are configured.
                        </p>
                      )}
                  </div>
                )}
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      Regenerate salary through the last working date
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confirmation creates or recalculates the employee&apos;s
                      final payroll and F&amp;F.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Checkbox checked disabled />
                  Included
                </div>
              </div>

              {!preview ? (
                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={
                    previewState.isLoading ||
                    (statusQuery.isError && !isNotFound(statusQuery.error))
                  }
                >
                  {previewState.isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Review F&amp;F and Warnings
                </Button>
              ) : (
                <>
                  <Separator />
                  <OffboardingSummary data={preview} />
                </>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
          {!hasActiveOffboarding && review && (
            <Button
              type="button"
              variant="destructive"
              disabled={!review.canConfirm || confirmState.isLoading}
              onClick={handleConfirm}
            >
              {confirmState.isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldOff className="mr-2 h-4 w-4" />
              )}
              {failedOffboarding
                ? "Retry F&F Generation"
                : "Confirm Resignation & Generate F&F"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
