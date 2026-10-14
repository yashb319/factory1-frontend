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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../api/attendanceApi", () => ({
  useGetSelfAttendanceStatusQuery: () => ({
    data: {
      attendanceId: null,
      attendanceDate: "2026-10-14",
      status: null,
      checkInTime: null,
      checkOutTime: null,
      totalHours: null,
      nextAction: "CHECK_IN",
      finalized: false,
      timezone: "Asia/Kolkata",
    },
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
  });

  it("prevents duplicate in-flight check-in requests and refreshes status", async () => {
    render(<EmployeeSelfAttendancePage />);

    const button = screen.getByRole("button", { name: "Check In" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(checkIn).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
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
