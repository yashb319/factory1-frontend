import { describe, expect, it } from "vitest";
import {
  BrowserLocationError,
  getLocationErrorMessage,
  requestBrowserLocation,
  toPunchLocation,
} from "../utils/geolocation";

function position(
  overrides: Partial<GeolocationCoordinates> = {},
  timestamp = Date.now()
): GeolocationPosition {
  return {
    coords: {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 20,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
      ...overrides,
    },
    timestamp,
    toJSON: () => ({}),
  };
}

describe("attendance geolocation", () => {
  it("rejects inaccurate and stale browser locations", () => {
    expect(() => toPunchLocation(position({ accuracy: 101 }))).toThrowError(
      expect.objectContaining<Partial<BrowserLocationError>>({
        code: "LOCATION_INACCURATE",
      })
    );

    expect(() =>
      toPunchLocation(position({}, Date.now() - 5 * 60 * 1000 - 1))
    ).toThrowError(
      expect.objectContaining<Partial<BrowserLocationError>>({
        code: "LOCATION_STALE",
      })
    );
  });

  it("maps server geofence errors to actionable copy", () => {
    const cases = [
      ["GEOFENCE_NOT_CONFIGURED", /factory owner must configure/i],
      ["LOCATION_REQUIRED", /current location is required/i],
      ["LOCATION_INVALID", /could not be validated/i],
      ["LOCATION_INACCURATE", /accuracy is too low/i],
      ["LOCATION_STALE", /too old/i],
      ["LOCATION_CAPTURED_IN_FUTURE", /device clock/i],
      ["OUTSIDE_GEOFENCE", /outside the configured attendance site/i],
    ] as const;

    for (const [code, expected] of cases) {
      expect(getLocationErrorMessage({ data: { code } }, "fallback")).toMatch(
        expected
      );
    }
  });

  it("explains the insecure-context browser limitation", async () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false,
    });

    await expect(requestBrowserLocation()).rejects.toMatchObject({
      code: "INSECURE_CONTEXT",
      message: expect.stringMatching(/secure HTTPS connection/i),
    });

    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
  });
});
