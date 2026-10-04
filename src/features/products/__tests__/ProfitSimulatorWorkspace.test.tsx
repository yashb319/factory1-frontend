import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ProfitSimulatorWorkspace,
  validateProfitSimulatorDraft,
} from "../components/ProfitSimulatorWorkspace";
import type {
  ProfitSimulationResult,
  ProfitSimulatorBaseline,
} from "../types/profitSimulator.types";

const baseline: ProfitSimulatorBaseline = {
  snapshot: {
    id: "snapshot-1",
    asOf: "2026-09-30",
    frozenAt: "2026-10-01T08:00:00Z",
    current: true,
  },
  completeness: "COMPLETE",
  warnings: [],
  currency: "INR",
  outputUnit: "PCS",
  sellingPrice: 150,
  outputQuantity: 10,
  materials: [
    {
      evidenceId: "evidence-1",
      label: "Plywood",
      sourceLabel: "Frozen inventory evidence",
      sourceReference: "ledger-1",
      asOf: "2026-09-30",
      unit: "SQM",
      currency: "INR",
      quantityPerOutput: 2,
      rate: 40,
      quantitySupported: true,
      rateSupported: true,
      wasteSupported: true,
    },
  ],
  labour: { supported: true, mode: "PER_OUTPUT", amount: 10 },
  overhead: { supported: false, mode: "EXCLUDED", reason: "Policy excluded" },
  misc: { supported: false, mode: "EXCLUDED", reason: "Policy excluded" },
};

const result: ProfitSimulationResult = {
  productId: "product-1",
  productCode: "FG-001",
  productName: "Cabinet",
  status: "COMPLETE",
  hypothetical: true,
  persisted: false,
  baselineSnapshotId: "snapshot-1",
  completeness: "COMPLETE",
  metrics: [
    {
      key: "revenue",
      label: "Revenue",
      baseline: 1500,
      scenario: 1600,
      delta: 100,
      currency: "INR",
    },
    {
      key: "breakEvenVolume",
      label: "Break-even volume",
      undefinedReason:
        "Undefined because unit contribution is not positive.",
      unit: "PCS",
    },
  ],
  appliedAssumptions: [
    { field: "selling.unitPrice", label: "Selling price unitPrice" },
  ],
  ignoredAssumptions: [
    {
      field: "overhead.amount",
      label: "Overhead amount",
      reason: "NO_CHANGE_FROM_BASELINE",
    },
  ],
  assumptions: ["Tax-exclusive selling price"],
  warnings: ["Estimate retained"],
  blockedReasons: [],
  provenance: {
    snapshotId: "snapshot-1",
    snapshotVersion: "3",
    snapshotAsOf: "2026-09-30",
    snapshotFrozenAt: "2026-10-01T08:00:00Z",
    policyId: "policy-1",
    policyVersion: "2",
    bomId: "bom-1",
    bomVersion: "4",
    sourceCostEngineVersion: "costing-1.0",
    simulationEngineVersion: "profit-simulation-1.0",
    selectorLabel: "Frozen snapshot ID",
  },
};

describe("ProfitSimulatorWorkspace", () => {
  it("uses bounded spinner-free controls, summarizes changes, and resets", async () => {
    const user = userEvent.setup();
    const calculate = vi.fn();
    render(
      <ProfitSimulatorWorkspace
        baselines={[baseline]}
        loading={false}
        onCalculate={calculate}
        onRetry={vi.fn()}
      />
    );

    const sellingPrice = screen.getByLabelText("Selling price per unit");
    expect(sellingPrice).toHaveAttribute("type", "text");
    await user.clear(sellingPrice);
    await user.type(sellingPrice, "175");
    expect(screen.getByText("Selling price", { selector: "li" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset to baseline/i }));
    expect(sellingPrice).toHaveValue("150");
    expect(
      screen.getByText(/No assumptions differ from this frozen baseline/i)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Increase Selling price per unit by 0.01",
      })
    );
    await user.click(
      screen.getByRole("button", { name: /calculate simulation/i })
    );
    expect(calculate).toHaveBeenCalledOnce();
  });

  it("validates server bounds, decimal scale, and positive output quantity", () => {
    const errors = validateProfitSimulatorDraft(
      {
        selectorMode: "EFFECTIVE_DATE",
        snapshotId: "snapshot-1",
        effectiveOnDate: "",
        sellingPrice: "1000000000001",
        outputQuantity: "0",
        materials: [
          {
            evidenceId: "evidence-1",
            quantityPerOutput: "1.1234567",
            rate: "40",
            wastePercentChange: "10001",
          },
        ],
        labour: "10",
        overhead: "",
        misc: "",
      },
      baseline
    );

    expect(errors.effectiveOnDate).toMatch(/valid effective date/i);
    expect(errors.sellingPrice).toMatch(/between/i);
    expect(errors.outputQuantity).toMatch(/between/i);
    expect(errors["materials.evidence-1.quantityPerOutput"]).toMatch(
      /6 decimal/i
    );
    expect(errors["materials.evidence-1.wastePercentChange"]).toMatch(
      /between/i
    );
  });

  it("shows accessible comparison, applied/ignored assumptions, undefined reasons, and provenance", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ProfitSimulatorWorkspace
        baselines={[baseline]}
        loading={false}
        onCalculate={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    await user.click(
      screen.getByRole("button", { name: /calculate simulation/i })
    );
    rerender(
      <ProfitSimulatorWorkspace
        baselines={[baseline]}
        result={result}
        loading={false}
        onCalculate={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByRole("table", {
        name: /server-calculated baseline and hypothetical scenario/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("₹1,600.00")).toBeInTheDocument();
    expect(
      screen.getByText(/unit contribution is not positive/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/NO_CHANGE_FROM_BASELINE/i)).toBeInTheDocument();
    expect(screen.getByText("profit-simulation-1.0")).toBeInTheDocument();
    expect(screen.getByText(/hypothetical, non-persistent/i)).toBeInTheDocument();
  });

  it("surfaces calculation errors and retries", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <ProfitSimulatorWorkspace
        baselines={[baseline]}
        loading={false}
        error="Snapshot not found"
        onCalculate={vi.fn()}
        onRetry={retry}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Snapshot not found");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
