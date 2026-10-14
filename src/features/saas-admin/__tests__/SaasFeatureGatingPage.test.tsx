import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  OrganizationRow,
  getFeatureToggleBlockReason,
} from "../components/SaasFeatureGatingPage";

vi.mock("../api/featureGatingApi", () => ({
  useClearOrgFeatureOverrideMutation: vi.fn(),
  useGetFeatureCatalogQuery: vi.fn(),
  useGetOrgFeatureDetailQuery: vi.fn(),
  useGetOrgFeatureSummariesQuery: vi.fn(),
  useSetOrgFeatureMutation: vi.fn(),
}));

describe("OrganizationRow", () => {
  it("renders the organization name without exposing its internal id", () => {
    const organizationId = "22222222-2222-4222-8222-222222222222";

    render(
      <table>
        <tbody>
          <OrganizationRow
            organization={{
              organizationId,
              name: "Acme Manufacturing",
              plan: "GROWTH",
              status: "ACTIVE",
              enabledFeatures: [],
            }}
            catalogByKey={new Map()}
            onSelect={vi.fn()}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText("Acme Manufacturing")).toBeInTheDocument();
    expect(screen.queryByText(organizationId)).not.toBeInTheDocument();
  });

  describe("feature dependencies", () => {
    const state = (
      key: string,
      enabled: boolean
    ): {
      key: string;
      enabled: boolean;
      source: "DEFAULT_POLICY";
      overrideReason: null;
      overrideUpdatedAt: null;
    } => ({
      key,
      enabled,
      source: "DEFAULT_POLICY",
      overrideReason: null,
      overrideUpdatedAt: null,
    });

    it("blocks geofencing until self attendance is enabled", () => {
      expect(
        getFeatureToggleBlockReason(
          [
            state("employee_portal_self_attendance", false),
            state("employee_portal_attendance_geofencing", false),
          ],
          "employee_portal_attendance_geofencing",
          true
        )
      ).toBe("Employee Portal Attendance must be enabled first.");
    });

    it("blocks disabling self attendance while geofencing is enabled", () => {
      expect(
        getFeatureToggleBlockReason(
          [
            state("employee_portal_self_attendance", true),
            state("employee_portal_attendance_geofencing", true),
          ],
          "employee_portal_self_attendance",
          false
        )
      ).toBe("Disable Attendance Geofencing first.");
    });
  });
});
