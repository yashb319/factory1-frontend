import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiMessageContent } from "../components/AiMessageContent";
import type {
  AiMessageSnapshot,
  AiProfitContext,
  AiProvenance,
} from "../types/ai.types";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const profit: AiProfitContext = {
  focus: "LOWEST_CONTRIBUTION_MARGIN",
  from: "2026-09-01",
  to: "2026-09-30",
  status: "INCOMPLETE",
  summary: {
    totalAttributedRevenue: 1500,
    totalAttributedCost: 1000,
    totalProfit: 500,
    marginPercent: 33.33,
    unallocatedSalesAmount: 250,
    unallocatedSalesLineCount: 1,
    attributionCoveragePercent: 72,
    costCoveragePercent: 68,
  },
  products: [
    {
      productId: "product-1",
      productCode: "FG-001",
      productName: "Cabinet",
      currency: "INR",
      snapshotId: "snapshot-1",
      snapshotVersion: 3,
      snapshotAsOfDate: "2026-09-30",
      completeness: "INCOMPLETE",
      attributionCoveragePercent: 72,
      costCoveragePercent: 68,
      realizedRevenue: 1500,
      realizedProfit: 500,
      realizedMarginPercent: 33.33,
      unitContribution: 50,
      totalContribution: 500,
      contributionMarginPercent: 33.33,
    },
  ],
  materialDrivers: [
    {
      evidenceId: "evidence-1",
      inventoryItemId: "inventory-1",
      label: "Steel",
      quantity: 10,
      unit: "kg",
      rate: 50,
      currency: "INR",
      amount: 500,
      percentOfMaterialCost: 70,
      estimate: true,
    },
  ],
  warnings: ["Three sales lines are not attributed to products."],
  unsupportedClaims: [
    "MARKET_PRICING",
    "ALTERNATE_SUPPLIER_SAVINGS",
    "EMPLOYEE_TEAM_EFFICIENCY",
  ],
};

const provenance: AiProvenance = {
  module: "PROFIT",
  summary: "Grounded product contribution evidence",
  period: "September 2026",
  recordCount: 1,
  profit: {
    snapshotReferences: [
      {
        snapshotId: "snapshot-1",
        snapshotVersion: 3,
        policyId: "policy-1",
        policyVersion: 2,
        bomId: "bom-1",
        bomVersion: 4,
        costEngineVersion: "cost-v4",
        asOfDate: "2026-09-30",
        frozenAt: "2026-09-30T10:00:00Z",
        completeness: "INCOMPLETE",
        costCoveragePercent: 68,
      },
    ],
    healthRuleVersion: "health-v2",
    revenueBasis: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE",
    costBasis: "IMMUTABLE_EFFECTIVE_SNAPSHOT",
    from: "2026-09-01",
    to: "2026-09-30",
    attributionCoveragePercent: 72,
    costCoveragePercent: 68,
    simulationEngineVersion: "simulation-v3",
    simulationAssumptions: ["Selling price increases by 5%."],
    appliedOverrides: [
      {
        category: "SELLING_PRICE",
        key: "selling",
        field: "percentChange",
        baselineValue: 100,
        scenarioValue: 105,
      },
    ],
  },
};

function snapshot(
  overrides: Partial<AiMessageSnapshot> = {}
): AiMessageSnapshot {
  return {
    metrics: [],
    suggestions: [],
    chart: null,
    actions: [],
    records: [],
    thinking: [],
    followUp: null,
    provider: "grounded-provider",
    fallback: false,
    intent: null,
    entity: null,
    provenance,
    profit,
    ...overrides,
  };
}

describe("grounded profit advisor presentation", () => {
  it("renders incomplete warnings, coverage, provenance, assumptions, and record links", () => {
    render(<AiMessageContent snapshot={snapshot()} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      /incomplete contribution profitability evidence/i
    );
    expect(screen.getByText(/snapshot snapshot-1/i)).toBeInTheDocument();
    expect(screen.getByText(/policy policy-1 v2/i)).toBeInTheDocument();
    expect(screen.getByText(/cost-v4/i)).toBeInTheDocument();
    expect(screen.getByText(/selling price increases by 5%/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View profitability" })).toHaveAttribute(
      "href",
      "/products?view=profitability&profitabilityProduct=product-1"
    );
    expect(screen.getByRole("link", { name: "View costing record" })).toHaveAttribute(
      "href",
      "/products?costingProduct=product-1&snapshotId=snapshot-1"
    );
    expect(screen.getByText(/not company net profit/i)).toBeInTheDocument();
  });

  it("shows provider fallback transparently without inventing unsupported claims", () => {
    render(
      <AiMessageContent
        snapshot={snapshot({
          profit: { ...profit, unsupportedClaims: [] },
          provider: "deterministic-fallback",
          fallback: true,
        })}
      />
    );

    expect(screen.getByText(/fallback provider/i)).toBeInTheDocument();
    expect(screen.getByText(/deterministic-fallback/i)).toBeInTheDocument();
    expect(screen.queryByText(/market pricing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/supplier savings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/team efficiency/i)).not.toBeInTheDocument();
  });

  it("renders only supported current navigation actions as links", () => {
    const onApply = vi.fn();
    const navigationAction = {
      id: "open-profit-simulator",
      module: "PROFIT",
      recordId: "product-1",
      recordLabel: "Cabinet safe what-if",
      field: "",
      currentValue: "",
      newValue: "",
      confirmationText: "Open the non-persistent simulator",
      actionType: "NAVIGATE" as const,
      displayOnly: true,
      route:
        "/products?view=profitability&profitabilityProduct=product-1&profitSimulator=open&snapshotId=snapshot-1",
    };
    const { rerender } = render(
      <AiMessageContent
        snapshot={snapshot({ actions: [navigationAction] })}
        onApplyAction={onApply}
      />
    );

    expect(screen.getByRole("link", { name: /open record/i })).toHaveAttribute(
      "href",
      navigationAction.route
    );
    expect(onApply).not.toHaveBeenCalled();

    rerender(
      <AiMessageContent
        historical
        snapshot={snapshot({ actions: [navigationAction] })}
        onApplyAction={onApply}
      />
    );
    expect(screen.queryByRole("link", { name: /open record/i })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot be replayed/i)).toBeInTheDocument();
  });

  it("keeps unsupported navigation routes display-only", () => {
    const onApply = vi.fn();
    render(
      <AiMessageContent
        snapshot={snapshot({
          actions: [
            {
              id: "open-profitability",
              module: "PROFIT",
              recordId: "product-1",
              recordLabel: "Unsafe external record",
              field: "",
              currentValue: "",
              newValue: "",
              confirmationText: "Do not navigate",
              actionType: "NAVIGATE",
              displayOnly: true,
              route: "https://attacker.example/steal",
            },
          ],
        })}
        onApplyAction={onApply}
      />
    );

    expect(
      screen.queryByRole("link", { name: /open record/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update/i })).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
});
