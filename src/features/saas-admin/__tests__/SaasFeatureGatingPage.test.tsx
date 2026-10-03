import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationRow } from "../components/SaasFeatureGatingPage";

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
});
