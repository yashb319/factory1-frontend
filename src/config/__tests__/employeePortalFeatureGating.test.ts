import { describe, expect, it } from "vitest";
import {
  featureKeyForPath,
  isEmployeePortalFeatureEnabled,
} from "../featureGating";

describe("employee portal feature gating", () => {
  it("uses portal-only feature keys for employee routes", () => {
    expect(featureKeyForPath("/leave", "EMPLOYEE")).toBe(
      "employee_portal_leave_application"
    );
    expect(featureKeyForPath("/production/my-assignments", "EMPLOYEE")).toBe(
      "employee_portal_work_orders"
    );
    expect(featureKeyForPath("/attendance", "EMPLOYEE")).toBe(
      "employee_portal_self_attendance"
    );
  });

  it("keeps broad organization feature keys unchanged for non-employees", () => {
    expect(featureKeyForPath("/leave", "OWNER")).toBe("leave_management");
    expect(featureKeyForPath("/production", "OWNER")).toBe(
      "production_tracking"
    );
    expect(featureKeyForPath("/attendance", "OWNER")).toBeNull();
  });

  it("fails closed until the employee portal feature list is available", () => {
    expect(
      isEmployeePortalFeatureEnabled(
        undefined,
        "employee_portal_self_attendance"
      )
    ).toBe(false);
    expect(
      isEmployeePortalFeatureEnabled(
        ["employee_portal_self_attendance"],
        "employee_portal_self_attendance"
      )
    ).toBe(true);
  });
});
