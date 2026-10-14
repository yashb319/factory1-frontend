import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EmployeeSelfAttendancePage,
  attendanceStatusLabel,
  formatOrganizationLocalTime,
} from "../components/EmployeeSelfAttendancePage";
import { AttendanceTable } from "../components/AttendanceTable";
import { correctAttendanceSchema } from "../schemas/attendance.schema";
import type {
  AttendanceRecord,
  SelfAttendanceResponse,
} from "../types/attendance.types";

const checkIn = vi.fn();
const checkOut = vi.fn();
const refetch = vi.fn();
let statusResponse: SelfAttendanceResponse;

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../api/attendanceApi", () => ({
  useGetSelfAttendanceStatusQuery: () => ({
    data: statusResponse,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch,
  }),
  useCheckInSelfAttendanceMutation: () => [
    checkIn,
    { isLoading: false },
  ],
  useCheckOutSelfAttendanceMutation: () => [
    checkOut,
    { isLoading: false },
  ],
  useCorrectAttendanceMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("../components/CorrectAttendanceDialog", () => ({
  CorrectAttendanceDialog: () => null,
}));

const record: AttendanceRecord = {
  id: "attendance-1",
  employeeId: "employee-1",
  employeeName: "Asha",
  date: "2026-10-14",
  status: "PRESENT",
};

describe("employee self attendance", () => {
  beforeEach(() => {
    checkIn.mockReset();
    checkOut.mockReset();
    refetch.mockReset();
    checkIn.mockReturnValue({ unwrap: () => Promise.resolve() });
    checkOut.mockReturnValue({ unwrap: () => Promise.resolve() });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve() });
    statusResponse = {
      attendanceId: null,
      attendanceDate: "2026-10-14",
      status: null,
      checkInTime: null,
      checkOutTime: null,
      totalHours: null,
      nextAction: "CHECK_IN",
      finalized: false,
      timezone: "Asia/Kolkata",
      geofencingRequired: false,
      geofenceConfigured: false,
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(),
      },
    });
  });

  it("prevents duplicate in-flight check-in requests and refreshes status", async () => {
    render(<EmployeeSelfAttendancePage />);

    const button = screen.getByRole("button", { name: "Check In" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(checkIn).toHaveBeenCalledTimes(1);
    expect(checkIn).toHaveBeenCalledWith(undefined);
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it("captures and sends a fresh location for geofenced check-in", async () => {
    statusResponse = {
      ...statusResponse,
      geofencingRequired: true,
      geofenceConfigured: true,
    };
    const timestamp = Date.now();
    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) =>
        success({
          coords: {
            latitude: 12.971599,
            longitude: 77.594566,
            accuracy: 18,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp,
          toJSON: () => ({}),
        })
    );

    render(<EmployeeSelfAttendancePage />);
    fireEvent.click(screen.getByRole("button", { name: "Check In" }));

    await waitFor(() =>
      expect(checkIn).toHaveBeenCalledWith({
        latitude: 12.971599,
        longitude: 77.594566,
        accuracyMeters: 18,
        capturedAt: new Date(timestamp).toISOString(),
      })
    );
  });

  it("requires a fresh location independently for checkout", async () => {
    statusResponse = {
      ...statusResponse,
      attendanceId: "attendance-1",
      checkInTime: "2026-10-14T09:00:00",
      nextAction: "CHECK_OUT",
      geofencingRequired: true,
      geofenceConfigured: true,
    };
    const timestamp = Date.now();
    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) =>
        success({
          coords: {
            latitude: 19.076,
            longitude: 72.8777,
            accuracy: 24,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp,
          toJSON: () => ({}),
        })
    );

    render(<EmployeeSelfAttendancePage />);
    fireEvent.click(screen.getByRole("button", { name: "Check Out" }));

    await waitFor(() =>
      expect(checkOut).toHaveBeenCalledWith({
        latitude: 19.076,
        longitude: 72.8777,
        accuracyMeters: 24,
        capturedAt: new Date(timestamp).toISOString(),
      })
    );
  });

  it("explains denied location permission without submitting", async () => {
    statusResponse = {
      ...statusResponse,
      geofencingRequired: true,
      geofenceConfigured: true,
    };
    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (_success, error) =>
        error?.({
          code: 1,
          message: "denied",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
    );

    render(<EmployeeSelfAttendancePage />);
    fireEvent.click(screen.getByRole("button", { name: "Check In" }));

    expect(
      await screen.findByText(/allow location access for factory1/i)
    ).toBeInTheDocument();
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("blocks punches when the authoritative status says the site is not configured", async () => {
    statusResponse = {
      ...statusResponse,
      geofencingRequired: true,
      geofenceConfigured: false,
    };

    render(<EmployeeSelfAttendancePage />);
    fireEvent.click(screen.getByRole("button", { name: "Check In" }));

    expect(
      await screen.findByText(/factory owner must configure the attendance site/i)
    ).toBeInTheDocument();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("shows authoritative outside-site errors and does not refresh status", async () => {
    statusResponse = {
      ...statusResponse,
      geofencingRequired: true,
      geofenceConfigured: true,
    };
    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) =>
        success({
          coords: {
            latitude: 12.97,
            longitude: 77.59,
            accuracy: 12,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        })
    );
    checkIn.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { code: "OUTSIDE_GEOFENCE" } }),
    });

    render(<EmployeeSelfAttendancePage />);
    fireEvent.click(screen.getByRole("button", { name: "Check In" }));

    expect(
      await screen.findByText(/outside the configured attendance site/i)
    ).toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
  });

  it("does not request location when geofencing is disabled", async () => {
    render(<EmployeeSelfAttendancePage />);
    fireEvent.click(screen.getByRole("button", { name: "Check In" }));

    await waitFor(() => expect(checkIn).toHaveBeenCalledWith(undefined));
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("explains finalization policy and owner-only corrections", () => {
    render(<EmployeeSelfAttendancePage />);

    expect(screen.getByText(/under 6 hours is a half-day/i)).toBeInTheDocument();
    expect(
      screen.getByText(/active current-day session remains in progress/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/only the factory owner can correct/i)
    ).toBeInTheDocument();
  });

  it("never labels an unfinalized current-day response absent", () => {
    const attendance: SelfAttendanceResponse = {
      attendanceId: "attendance-1",
      attendanceDate: "2026-10-14",
      status: "ABSENT",
      checkInTime: "2026-10-14T09:05:00",
      checkOutTime: null,
      totalHours: null,
      nextAction: "CHECK_OUT",
      finalized: false,
      timezone: "Asia/Kolkata",
      geofencingRequired: false,
      geofenceConfigured: false,
    };

    expect(attendanceStatusLabel(attendance)).toBe("Checked in");
    expect(formatOrganizationLocalTime(attendance.checkInTime)).toBe(
      "9:05 AM"
    );
  });
});

describe("owner attendance corrections", () => {
  it("only renders correction controls when explicitly allowed", () => {
    const { rerender } = render(
      <AttendanceTable records={[record]} loading={false} />
    );
    expect(
      screen.queryByRole("button", { name: "Correct" })
    ).not.toBeInTheDocument();

    rerender(
      <AttendanceTable records={[record]} loading={false} canCorrect />
    );
    expect(screen.getByRole("button", { name: "Correct" })).toBeInTheDocument();
  });

  it("requires a nonblank correction reason", () => {
    expect(
      correctAttendanceSchema.safeParse({
        checkInTime: "",
        checkOutTime: "",
        reason: "   ",
      }).success
    ).toBe(false);
  });
});
