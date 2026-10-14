"use client";

import { useRef, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/apiError";
import {
  capturePunchLocation,
  getLocationErrorMessage,
} from "../utils/geolocation";
import {
  useCheckInSelfAttendanceMutation,
  useCheckOutSelfAttendanceMutation,
  useGetSelfAttendanceStatusQuery,
} from "../api/attendanceApi";
import type { SelfAttendanceResponse } from "../types/attendance.types";

export function EmployeeSelfAttendancePage() {
  const statusQuery = useGetSelfAttendanceStatusQuery();
  const [checkIn, checkInState] = useCheckInSelfAttendanceMutation();
  const [checkOut, checkOutState] = useCheckOutSelfAttendanceMutation();
  const actionInFlight = useRef(false);
  const [actionPhase, setActionPhase] = useState<
    "idle" | "locating" | "submitting"
  >("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const attendance = statusQuery.data;
  const busy =
    actionPhase !== "idle" ||
    checkInState.isLoading ||
    checkOutState.isLoading ||
    statusQuery.isFetching;

  async function runAction(action: "CHECK_IN" | "CHECK_OUT") {
    if (actionInFlight.current) return;

    actionInFlight.current = true;
    setActionMessage(null);

    try {
      if (attendance?.geofencingRequired && !attendance.geofenceConfigured) {
        setActionMessage(
          "Your factory owner must configure the attendance site before location-based check-in or checkout can be used."
        );
        return;
      }

      let location;
      if (attendance?.geofencingRequired) {
        setActionPhase("locating");
        location = await capturePunchLocation();
      }

      setActionPhase("submitting");
      if (action === "CHECK_IN") {
        await checkIn(location).unwrap();
      } else {
        await checkOut(location).unwrap();
      }

      await statusQuery.refetch().unwrap();
      toast.success(action === "CHECK_IN" ? "Checked in" : "Checked out");
    } catch (error) {
      const fallback = getErrorMessage(
        error,
        `Unable to ${action === "CHECK_IN" ? "check in" : "check out"}`
      ).replace(/^ATTENDANCE_PUNCH_CONFLICT:\s*/, "");
      const message = getLocationErrorMessage(error, fallback);
      setActionMessage(message);
      toast.error(message);
    } finally {
      actionInFlight.current = false;
      setActionPhase("idle");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My attendance</h1>
        <p className="text-sm text-muted-foreground">
          Check in and out for today. Punch times use your factory timezone.
        </p>
      </div>

      {statusQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-white p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading today&apos;s attendance...
        </div>
      ) : statusQuery.isError || !attendance ? (
        <div className="rounded-lg border bg-white p-6">
          <p role="alert" className="text-sm text-destructive">
            We could not load today&apos;s attendance status.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void statusQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <AttendanceStatusCard
          attendance={attendance}
          busy={busy}
          actionPhase={actionPhase}
          actionMessage={actionMessage}
          onAction={runAction}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Attendance policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Completed work of 6 hours or more is present; under 6 hours is a
            half-day.
          </p>
          <p>
            A missing check-in or checkout is marked absent only after the day
            is finalized. An active current-day session remains in progress.
          </p>
          <p>
            Only the factory owner can correct missing or incorrect punches.
          </p>
          <p>
            When attendance geofencing is enabled, both check-in and checkout
            require a fresh browser location captured only when you press the
            attendance button. Factory1 does not track your location in the
            background or save it in this browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceStatusCard({
  attendance,
  busy,
  actionPhase,
  actionMessage,
  onAction,
}: {
  attendance: SelfAttendanceResponse;
  busy: boolean;
  actionPhase: "idle" | "locating" | "submitting";
  actionMessage: string | null;
  onAction: (action: "CHECK_IN" | "CHECK_OUT") => void;
}) {
  const nextAction = attendance.nextAction;
  const actionLabel = nextAction === "CHECK_OUT" ? "Check Out" : "Check In";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Today&apos;s status</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatAttendanceDate(attendance.attendanceDate)} ·{" "}
              {attendance.timezone}
            </p>
          </div>
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800"
            aria-live="polite"
          >
            <CheckCircle2 className="h-4 w-4" />
            {attendanceStatusLabel(attendance)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {attendance.geofencingRequired ? (
          <div
            className={`rounded-lg border p-4 text-sm ${
              attendance.geofenceConfigured
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 shrink-0" />
              Site location required for both check-in and checkout
            </p>
            <p className="mt-1 text-xs">
              {attendance.geofenceConfigured
                ? "Your location is requested only when you perform a punch. The server decides whether it is inside the configured site."
                : "The site is not configured yet. Ask your factory owner to configure it in Organization Settings."}
            </p>
          </div>
        ) : null}

        {actionMessage ? (
          <p
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {actionMessage}
          </p>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-3">
          <AttendanceValue
            label="Check in"
            value={formatOrganizationLocalTime(attendance.checkInTime)}
          />
          <AttendanceValue
            label="Check out"
            value={formatOrganizationLocalTime(attendance.checkOutTime)}
          />
          <AttendanceValue
            label="Total hours"
            value={
              attendance.totalHours == null
                ? "—"
                : `${attendance.totalHours.toFixed(2)} hours`
            }
          />
        </dl>

        {nextAction ? (
          <Button
            type="button"
            size="lg"
            disabled={busy}
            aria-busy={busy}
            onClick={() => onAction(nextAction)}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Clock3 className="mr-2 h-4 w-4" />
            )}
            {actionPhase === "locating"
              ? "Getting location..."
              : actionPhase === "submitting"
                ? `${actionLabel}...`
                : actionLabel}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            No attendance action is available for today.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AttendanceValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

export function attendanceStatusLabel(attendance: SelfAttendanceResponse) {
  if (!attendance.finalized) {
    if (attendance.nextAction === "CHECK_OUT") return "Checked in";
    if (attendance.nextAction === "CHECK_IN") return "Not checked in";
    return "In progress";
  }

  return attendance.status
    ? attendance.status
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
    : "Not recorded";
}

export function formatOrganizationLocalTime(value: string | null) {
  if (!value) return "—";
  const match = value.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return value;

  const [, hourText, minuteText] = match;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatAttendanceDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
