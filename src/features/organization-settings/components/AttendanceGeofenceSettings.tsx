"use client";

import { useState } from "react";
import { Crosshair, Loader2, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/lib/hook";
import { getErrorMessage } from "@/lib/apiError";
import { requestBrowserLocation } from "@/features/attendance/utils/geolocation";
import {
  useGetAttendanceGeofenceQuery,
  useUpdateAttendanceGeofenceMutation,
} from "../api/organizationSettingsApi";
import { attendanceGeofenceSchema } from "../schemas/attendanceGeofence.schema";

type Draft = {
  latitude: string;
  longitude: string;
  radiusMeters: string;
};

const emptyDraft: Draft = {
  latitude: "",
  longitude: "",
  radiusMeters: "100",
};

export function AttendanceGeofenceSettings() {
  const user = useAppSelector((state) => state.auth.user);
  const isOwner = user?.role === "OWNER";
  const geofenceQuery = useGetAttendanceGeofenceQuery(undefined, {
    skip: !isOwner,
  });
  const [updateGeofence, updateState] = useUpdateAttendanceGeofenceMutation();
  const [draftOverride, setDraftOverride] = useState<Draft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [locationState, setLocationState] = useState<string | null>(null);
  const settings = geofenceQuery.data?.data;
  const draft =
    draftOverride ??
    (settings
      ? {
          latitude: settings.latitude?.toString() ?? "",
          longitude: settings.longitude?.toString() ?? "",
          radiusMeters: settings.radiusMeters?.toString() ?? "100",
        }
      : emptyDraft);

  function updateDraft(update: (current: Draft) => Draft) {
    setDraftOverride((current) => update(current ?? draft));
  }

  if (!isOwner) return null;

  async function useCurrentLocation() {
    setLocationState("Requesting your current location...");

    try {
      const position = await requestBrowserLocation();
      updateDraft((current) => ({
        ...current,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
      }));
      setFieldErrors({});
      setLocationState(
        `Current location captured with approximately ${Math.round(position.coords.accuracy)} m accuracy. Review the values and save.`
      );
    } catch (error) {
      const message = getErrorMessage(
        error,
        error instanceof Error
          ? error.message
          : "Could not capture the current location."
      );
      setLocationState(message);
    }
  }

  async function saveGeofence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = attendanceGeofenceSchema.safeParse({
      latitude: draft.latitude.trim() ? Number(draft.latitude) : Number.NaN,
      longitude: draft.longitude.trim() ? Number(draft.longitude) : Number.NaN,
      radiusMeters: draft.radiusMeters.trim()
        ? Number(draft.radiusMeters)
        : Number.NaN,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    try {
      await updateGeofence(result.data).unwrap();
      setFieldErrors({});
      toast.success("Attendance geofence saved");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Could not save the attendance geofence").replace(
          /^FEATURE_DEPENDENCY_NOT_MET:\s*/,
          ""
        )
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Employee attendance geofence
        </CardTitle>
        <CardDescription>
          Set the factory site where employees can check in and check out.
          Location is collected only when an employee performs either punch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {geofenceQuery.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading geofence settings...
          </p>
        ) : geofenceQuery.isError || !settings ? (
          <div>
            <p role="alert" className="text-sm text-red-600">
              Could not load attendance geofence settings.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void geofenceQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : !settings.entitlementEnabled ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Attendance geofencing is disabled for this organization. A Factory1
            SaaS administrator must enable it before you can configure the site.
          </div>
        ) : !settings.dependencySatisfied ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            Employee Portal Attendance must be enabled before attendance
            geofencing can be configured.
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Current configuration
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {settings.configured
                  ? `${settings.latitude}, ${settings.longitude} · ${settings.radiusMeters} m radius`
                  : "Not configured"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Both employee check-in and checkout are rejected until a site
                is configured and the employee is inside its boundary.
              </p>
            </div>

            <form className="space-y-4" onSubmit={saveGeofence} noValidate>
              <Button
                type="button"
                variant="outline"
                onClick={() => void useCurrentLocation()}
              >
                <Crosshair className="h-4 w-4" />
                Use current location
              </Button>

              {locationState ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm text-slate-600"
                >
                  {locationState}
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <GeofenceField
                  id="geofence-latitude"
                  label="Latitude"
                  value={draft.latitude}
                  error={fieldErrors.latitude}
                  min="-90"
                  max="90"
                  step="any"
                  onChange={(latitude) =>
                    updateDraft((current) => ({ ...current, latitude }))
                  }
                />
                <GeofenceField
                  id="geofence-longitude"
                  label="Longitude"
                  value={draft.longitude}
                  error={fieldErrors.longitude}
                  min="-180"
                  max="180"
                  step="any"
                  onChange={(longitude) =>
                    updateDraft((current) => ({ ...current, longitude }))
                  }
                />
                <GeofenceField
                  id="geofence-radius"
                  label="Radius (metres)"
                  value={draft.radiusMeters}
                  error={fieldErrors.radiusMeters}
                  min="10"
                  max="5000"
                  step="1"
                  onChange={(radiusMeters) =>
                    updateDraft((current) => ({ ...current, radiusMeters }))
                  }
                />
              </div>

              <p className="text-xs text-slate-500">
                Allowed radius: 10 to 5,000 metres. Choose the smallest
                practical boundary that covers the employee punch area.
              </p>

              <Button type="submit" disabled={updateState.isLoading}>
                {updateState.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save geofence
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function GeofenceField({
  id,
  label,
  value,
  error,
  onChange,
  ...inputProps
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
} & Pick<React.ComponentProps<"input">, "min" | "max" | "step">) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...inputProps}
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
