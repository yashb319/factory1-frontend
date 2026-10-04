import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductCostingDialog } from "../components/ProductCostingDialog";
import type { ProductCostingView } from "../types/costing.types";

const estimatedCosting: ProductCostingView = {
  productId: "product-1",
  productCode: "FG-001",
  productName: "Finished Cabinet",
  quantity: 10,
  unit: "PCS",
  currency: "INR",
  completeness: "ESTIMATED",
  missingInputs: ["Published labour assumptions"],
  sourceQuality: "Mixed",
  warnings: ["Catalog price is mutable"],
  sourceLabels: ["Inventory catalog"],
  asOf: "2026-10-04T12:00:00Z",
  basis: "Published policy preview",
  totalCost: { currency: "INR", perUnit: 125, total: 1250 },
  sellingPrice: null,
  policyVersion: "3",
  policyId: "policy-1",
  bomId: "bom-1",
  bomVersion: "7",
  snapshotVersion: "2",
  engineVersion: "1.0",
  immutableSnapshotId: null,
  canFreeze: true,
  components: [
    {
      key: "materials",
      label: "Materials",
      completeness: "ESTIMATED",
      amount: { currency: "INR", perUnit: null, total: 900 },
      explanation: "Catalog price estimate",
      evidence: [
        {
          id: "evidence-1",
          label: "Steel sheet catalog price",
          sourceType: "Inventory catalog",
          quality: "Mutable",
          amount: { currency: "INR", total: 900 },
        },
      ],
    },
  ],
};

describe("ProductCostingDialog", () => {
  it("labels estimates clearly and never substitutes zero for a missing amount", async () => {
    const user = userEvent.setup();
    render(
      <ProductCostingDialog
        open
        onOpenChange={vi.fn()}
        data={estimatedCosting}
        loading={false}
        refreshing={false}
        freezing={false}
        onRetry={vi.fn()}
        onFreeze={vi.fn()}
      />
    );

    expect(screen.getAllByText("Estimated")).toHaveLength(2);
    expect(
      screen.getByText(/must not be treated as true cost/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    expect(screen.getByText("Published labour assumptions")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "1 source" }));
    expect(screen.getByText("Steel sheet catalog price")).toBeInTheDocument();
    expect(screen.getByText("Mutable")).toBeInTheDocument();
  });

  it("surfaces backend errors with an explicit retry", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <ProductCostingDialog
        open
        onOpenChange={vi.fn()}
        data={null}
        loading={false}
        refreshing={false}
        freezing={false}
        loadError="Policy version is no longer available"
        onRetry={retry}
        onFreeze={vi.fn()}
      />
    );

    expect(
      screen.getByText("Policy version is no longer available")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
