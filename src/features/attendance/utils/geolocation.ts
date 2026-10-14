import type { SelfAttendancePunchRequest } from "../types/attendance.types";

export type BrowserLocationErrorCode =
  | "INSECURE_CONTEXT"
  | "UNSUPPORTED"
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "LOCATION_INVALID"
  | "LOCATION_INACCURATE"
  | "LOCATION_STALE"
  | "LOCATION_CAPTURED_IN_FUTURE";

export class BrowserLocationError extends Error {
  constructor(
    public readonly code: BrowserLocationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "BrowserLocationError";
  }
}

export function requestBrowserLocation(): Promise<GeolocationPosition> {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return Promise.reject(
      new BrowserLocationError(
        "INSECURE_CONTEXT",
        "Location access requires a secure HTTPS connection. Open Factory1 over HTTPS and try again."
      )
    );
  }

  if (!navigator.geolocation) {
    return Promise.reject(
      new BrowserLocationError(
        "UNSUPPORTED",
        "This browser cannot provide your location. Try a current mobile browser with location services enabled."
      )
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new BrowserLocationError(
              "PERMISSION_DENIED",
              "Location permission was denied. Allow location access for Factory1 in your browser settings, then try again."
            )
          );
          return;
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          reject(
            new BrowserLocationError(
              "POSITION_UNAVAILABLE",
              "Your location is currently unavailable. Turn on device location services, move near a window, and try again."
            )
          );
          return;
        }

        reject(
          new BrowserLocationError(
            "TIMEOUT",
            "Location capture timed out. Check your signal and location services, then try again."
          )
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10_000,
      }
    );
  });
}

export function toPunchLocation(
  position: GeolocationPosition,
  now = Date.now()
): SelfAttendancePunchRequest {
  const { latitude, longitude, accuracy } = position.coords;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(accuracy) ||
    accuracy <= 0
  ) {
    throw new BrowserLocationError(
      "LOCATION_INVALID",
      "The browser returned an invalid location. Refresh location services and try again."
    );
  }

  if (accuracy > 100) {
    throw new BrowserLocationError(
      "LOCATION_INACCURATE",
      "Location accuracy is too low. Move outdoors or near a window, wait for GPS to improve, and try again."
    );
  }

  const ageMs = now - position.timestamp;
  if (ageMs > 5 * 60 * 1000) {
    throw new BrowserLocationError(
      "LOCATION_STALE",
      "The captured location is too old. Try the attendance action again to collect a fresh location."
    );
  }
  if (ageMs < -30 * 1000) {
    throw new BrowserLocationError(
      "LOCATION_CAPTURED_IN_FUTURE",
      "Your device clock appears incorrect. Set the date and time automatically, then try again."
    );
  }

  return {
    latitude,
    longitude,
    accuracyMeters: accuracy,
    capturedAt: new Date(position.timestamp).toISOString(),
  };
}

export async function capturePunchLocation() {
  return toPunchLocation(await requestBrowserLocation());
}

export function getLocationErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof BrowserLocationError) {
    return error.message;
  }

  const code = getApiErrorCode(error);
  const messages: Record<string, string> = {
    FEATURE_DEPENDENCY_NOT_MET:
      "Attendance geofencing requires Employee Portal Attendance. Ask your SaaS administrator to correct the feature settings.",
    GEOFENCE_NOT_CONFIGURED:
      "Your factory owner must configure the attendance site before location-based check-in or checkout can be used.",
    LOCATION_REQUIRED:
      "A current location is required for both check-in and checkout. Allow location access and try again.",
    LOCATION_INVALID:
      "The location could not be validated. Refresh location services and try again.",
    LOCATION_INACCURATE:
      "Location accuracy is too low. Move outdoors or near a window, wait for GPS to improve, and try again.",
    LOCATION_STALE:
      "The captured location is too old. Try the attendance action again to collect a fresh location.",
    LOCATION_CAPTURED_IN_FUTURE:
      "Your device clock appears incorrect. Set the date and time automatically, then try again.",
    OUTSIDE_GEOFENCE:
      "You are outside the configured attendance site. Move inside the site boundary and try again.",
    FEATURE_DISABLED:
      "Employee self-attendance is not enabled for your organization.",
  };

  return code ? messages[code] ?? fallback : fallback;
}

function getApiErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return null;
  }

  const data = (error as { data?: { code?: unknown; message?: unknown } }).data;
  if (typeof data?.code === "string") return data.code;
  if (typeof data?.message !== "string") return null;
  const message = data.message;

  return Object.keys({
    FEATURE_DEPENDENCY_NOT_MET: true,
    GEOFENCE_NOT_CONFIGURED: true,
    LOCATION_REQUIRED: true,
    LOCATION_INVALID: true,
    LOCATION_INACCURATE: true,
    LOCATION_STALE: true,
    LOCATION_CAPTURED_IN_FUTURE: true,
    OUTSIDE_GEOFENCE: true,
    FEATURE_DISABLED: true,
  }).find((code) => message.includes(code)) ?? null;
}
