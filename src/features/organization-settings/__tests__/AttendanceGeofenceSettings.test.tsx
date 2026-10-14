import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceGeofenceSettings } from "../components/AttendanceGeofenceSettings";

const updateGeofence = vi.fn();
const refetch = vi.fn();
let role = "OWNER";
let settings = {
  latitude: null as number | null,
  longitude: null as number | null,
  radiusMeters: null as number | null,
  configured: false,
  entitlementEnabled: true,
  dependencySatisfied: true,
  updatedAt: null,
  updatedByUserId: null,
};

vi.mock("@/lib/hook", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { user: { role } } }),
}));

vi.mock("../api/organizationSettingsApi", () => ({
  useGetAttendanceGeofenceQuery: vi.fn(() => ({
    data: { data: settings },
    isLoading: false,
    isError: false,
    refetch,
  })),
  useUpdateAttendanceGeofenceMutation: () => [
    updateGeofence,
    { isLoading: false },
  ],
}));

describe("owner attendance geofence settings", () => {
  beforeEach(() => {
    role = "OWNER";
    settings = {
      latitude: null,
      longitude: null,
      radiusMeters: null,
      configured: false,
      entitlementEnabled: true,
      dependencySatisfied: true,
      updatedAt: null,
      updatedByUserId: null,
    };
    updateGeofence.mockReset();
    updateGeofence.mockReturnValue({ unwrap: () => Promise.resolve() });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) =>
          success({
            coords: {
              latitude: 12.971599,
              longitude: 77.594566,
              accuracy: 15,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          })
        ),
      },
    });
  });

  it("is hidden from non-owners", () => {
    role = "ADMIN";
    render(<AttendanceGeofenceSettings />);

    expect(
      screen.queryByText("Employee attendance geofence")
    ).not.toBeInTheDocument();
  });

  it("captures current coordinates and sends the validated contract", async () => {
    render(<AttendanceGeofenceSettings />);

    fireEvent.click(
      screen.getByRole("button", { name: "Use current location" })
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Latitude")).toHaveValue(12.971599)
    );
    fireEvent.change(screen.getByLabelText("Radius (metres)"), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save geofence" }));

    await waitFor(() =>
      expect(updateGeofence).toHaveBeenCalledWith({
        latitude: 12.971599,
        longitude: 77.594566,
        radiusMeters: 250,
      })
    );
  });

  it("validates the backend radius bounds before saving", async () => {
    settings = {
      ...settings,
      latitude: 12,
      longitude: 77,
      radiusMeters: 100,
      configured: true,
    };
    render(<AttendanceGeofenceSettings />);

    fireEvent.change(screen.getByLabelText("Radius (metres)"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save geofence" }));

    expect(
      await screen.findByText(/radius must be at least 10 metres/i)
    ).toBeInTheDocument();
    expect(updateGeofence).not.toHaveBeenCalled();
  });

  it("explains when the SaaS entitlement is disabled", () => {
    settings = { ...settings, entitlementEnabled: false };
    render(<AttendanceGeofenceSettings />);

    expect(
      screen.getByText(/saas administrator must enable it/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save geofence" })
    ).not.toBeInTheDocument();
  });
});
