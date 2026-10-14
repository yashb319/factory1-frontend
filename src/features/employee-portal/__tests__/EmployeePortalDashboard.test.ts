import { describe, expect, it } from "vitest";
import { enabledEmployeePortalModules } from "../components/EmployeePortalDashboard";

describe("enabledEmployeePortalModules", () => {
  it("only returns modules enabled by SaaS feature controls", () => {
    expect(
      enabledEmployeePortalModules([
        "employee_portal_leave_application",
        "employee_portal_self_attendance",
      ]).map((module) => module.title)
    ).toEqual(["Leave Apply", "Attendance"]);
  });

  it("does not expose modules before feature access is loaded", () => {
    expect(enabledEmployeePortalModules(undefined)).toEqual([]);
  });
});
