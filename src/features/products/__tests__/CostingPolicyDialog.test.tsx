import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CostingPolicyDialog } from "../components/CostingPolicyDialog";

describe("CostingPolicyDialog", () => {
  it("explains labour allocation and mutable-price limitations", () => {
    render(
      <CostingPolicyDialog
        open
        onOpenChange={vi.fn()}
        policy={null}
        options={{
          materialValuations: [],
          sellingPriceBases: [],
          allocationModes: [],
        }}
        materialItems={[]}
        loading={false}
        saving={false}
        publishing={false}
        creatingVersion={false}
        onRetry={vi.fn()}
        onSave={vi.fn()}
        onPublish={vi.fn()}
        onCreateVersion={vi.fn()}
      />
    );

    expect(screen.getByText(/allocation assumption, not a timesheet/i)).toBeInTheDocument();
    expect(screen.getByText(/mutable inventory and catalog prices are estimates/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish policy" })).toBeInTheDocument();
  });
});
