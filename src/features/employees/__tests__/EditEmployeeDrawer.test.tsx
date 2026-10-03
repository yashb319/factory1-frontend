import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditEmployeeDrawer } from "../components/EditEmployeeDrawer";
import type { Employee } from "../types/employee.types";

Object.defineProperty(HTMLElement.prototype, "scrollTo", { value: () => {} });

const mocks = vi.hoisted(() => ({
  createStatutoryProfile: vi.fn(),
  createStatutoryProfileUnwrap: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateEmployee: vi.fn(),
  updateEmployeeUnwrap: vi.fn(),
  updateStatutoryProfile: vi.fn(),
  updateStatutoryProfileUnwrap: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

vi.mock("../api/employeeApi", () => ({
  useCreateEmployeeStatutoryProfileMutation: () => [
    mocks.createStatutoryProfile,
    { isLoading: false },
  ],
  useGetEmployeeDesignationsQuery: () => ({ data: [] }),
  useGetEmployeeStatutoryProfileQuery: () => ({
    data: undefined,
    error: { status: 404 },
    isError: true,
    isLoading: false,
  }),
  useGetEmployeesQuery: () => ({
    data: {
      content: [],
      page: 0,
      size: 1000,
      totalElements: 0,
      totalPages: 0,
      last: true,
    },
  }),
  useUpdateEmployeeMutation: () => [
    mocks.updateEmployee,
    { isLoading: false },
  ],
  useUpdateEmployeeStatutoryProfileMutation: () => [
    mocks.updateStatutoryProfile,
    { isLoading: false },
  ],
}));

const employee = {
  id: "employee-1",
  employeeCode: "EMP-001",
  name: "Rahul Kumar",
  salaryRate: 700,
  salaryType: "DAILY",
  status: "ACTIVE",
  annualIncome: null,
  child1Gender: null,
  child2Gender: null,
  fatherGender: null,
  heightCm: null,
  motherGender: null,
  nomineeGender: null,
  smoker: null,
  spouseGender: null,
  weightKg: null,
} as unknown as Employee;

describe("EditEmployeeDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateEmployee.mockReturnValue({
      unwrap: mocks.updateEmployeeUnwrap,
    });
    mocks.updateEmployeeUnwrap.mockResolvedValue({});
    mocks.createStatutoryProfile.mockReturnValue({
      unwrap: mocks.createStatutoryProfileUnwrap,
    });
    mocks.createStatutoryProfileUnwrap.mockResolvedValue({});
    mocks.updateStatutoryProfile.mockReturnValue({
      unwrap: mocks.updateStatutoryProfileUnwrap,
    });
    mocks.updateStatutoryProfileUnwrap.mockResolvedValue({});
  });

  it("submits a valid hydrated employee update exactly once", async () => {
    const user = userEvent.setup();
    render(
      <EditEmployeeDrawer
        employee={employee}
        open
        onOpenChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mocks.updateEmployee).toHaveBeenCalledTimes(1));
    expect(mocks.updateEmployee).toHaveBeenCalledWith({
      id: "employee-1",
      body: expect.objectContaining({
        name: "Rahul Kumar",
        salaryRate: 700,
        salaryType: "DAILY",
        status: "ACTIVE",
      }),
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Employee updated successfully"
    );
  });

  it("reveals, reports, and focuses a hidden invalid field", async () => {
    const user = userEvent.setup();
    const invalidEmployee = {
      ...employee,
      fatherDateOfBirth: "2999-01-01",
    };
    render(
      <EditEmployeeDrawer
        employee={invalidEmployee}
        open
        onOpenChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mocks.updateEmployee).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Please correct the highlighted employee details"
    );
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: /insurance/i })
      ).toHaveAttribute("aria-selected", "true")
    );
    expect(
      screen.getByText("Father's date of birth cannot be in the future")
    ).toBeVisible();
    await waitFor(() =>
      expect(
        document.querySelector<HTMLInputElement>(
          'input[name="fatherDateOfBirth"]'
        )
      ).toHaveFocus()
    );
  });
});
