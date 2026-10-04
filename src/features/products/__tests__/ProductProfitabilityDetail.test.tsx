import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductProfitabilityDetailDialog } from "../components/ProductProfitabilityDetail";
import type { ProductProfitabilityDetail } from "../types/profitability.types";
import {
  AI_PROFIT_ADVISOR_EVENT,
  type AiProfitAdvisorEntryRequest,
} from "@/features/ai/lib/profitAdvisorEntry";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const detail: ProductProfitabilityDetail = {
  productId: "product-1",
  productCode: "FG-001",
  productName: "Cabinet",
  realizedUnitSellingPrice: { currency: "INR", value: 150 },
  attributedRevenue: { currency: "INR", value: 1500 },
  frozenUnitCost: { currency: "INR", value: 100 },
  unitProfit: { currency: "INR", value: 50 },
  grossProfit: { currency: "INR", value: 500 },
  marginPercent: 33.333333,
  health: "HEALTHY",
  completeness: "COMPLETE",
  reasons: [],
  snapshot: {
    id: "snapshot-current",
    costingSnapshotId: "snapshot-current",
    asOf: "2026-09-30",
    current: true,
  },
  freshnessAt: "2026-09-30",
  coverage: {
    allocatedSalesPercent: 80,
    allocatedRevenue: { currency: "INR", value: 1500 },
    unallocatedRevenue: { currency: "INR", value: 250 },
    reason: "1 sales line explicitly unallocated.",
  },
  components: [
    {
      key: "MATERIAL",
      label: "Materials",
      amount: { currency: "INR", value: 700 },
      perUnit: { currency: "INR", value: 70 },
      sourceLabel: "Material issue ledger",
      sourceReference: "ledger-1",
      asOf: "2026-09-30",
    },
  ],
  evidence: [
    {
      id: "evidence-1",
      label: "Material issue ledger",
      sourceType: "INVENTORY_LEDGER",
      sourceReference: "ledger-1",
      asOf: "2026-09-30",
      quality: "Actual",
    },
  ],
  warnings: ["One sales line is not linked to a product."],
  snapshotHistory: [
    {
      id: "snapshot-old",
      asOf: "2026-09-01",
      costingSnapshotId: "snapshot-old",
      costingSnapshotFrozenAt: "2026-08-31",
      current: false,
    },
  ],
  trends: [
    {
      period: "2026-09-01",
      periodLabel: "September 2026",
      attributedRevenue: { currency: "INR", value: 900 },
      grossProfit: { currency: "INR", value: 300 },
      marginPercent: 33.333333,
      costingSnapshotId: "snapshot-old",
      completeness: "COMPLETE",
    },
  ],
  metadata: {
    costBasis: "IMMUTABLE_EFFECTIVE_SNAPSHOT",
    revenueBasis: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE",
    dateBoundary: "INCLUSIVE",
  },
};

describe("ProductProfitabilityDetailDialog", () => {
  it("shows provenance, unallocated coverage, immutable history, and an accessible trend table", () => {
    render(
      <ProductProfitabilityDetailDialog
        open
        onOpenChange={vi.fn()}
        detail={detail}
        loading={false}
        onRetry={vi.fn()}
        onConfigureCosting={vi.fn()}
      />
    );

    expect(screen.getByText("Explicitly unallocated revenue")).toBeInTheDocument();
    expect(screen.getByText("₹250.00")).toBeInTheDocument();
    expect(screen.getByText("ledger-1")).toBeInTheDocument();
    expect(screen.getAllByText("snapshot-old").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("table", {
        name: /Historical attributed revenue, gross profit/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/not company net profit/i)).toBeInTheDocument();
  });

  it("shows a retry action when detail loading fails", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <ProductProfitabilityDetailDialog
        open
        onOpenChange={vi.fn()}
        detail={null}
        loading={false}
        error="Trend query failed"
        onRetry={retry}
        onConfigureCosting={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("shows a gated contextual Ask Factory1 action with exact product and period context", async () => {
    const user = userEvent.setup();
    const request = vi.fn<(event: Event) => void>();
    window.addEventListener(AI_PROFIT_ADVISOR_EVENT, request);

    render(
      <ProductProfitabilityDetailDialog
        open
        onOpenChange={vi.fn()}
        detail={detail}
        loading={false}
        onRetry={vi.fn()}
        onConfigureCosting={vi.fn()}
        profitAdvisorEnabled
        advisorPeriod={{ from: "2026-09-01", to: "2026-09-30" }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Ask Factory1" }));
    expect(request).toHaveBeenCalledOnce();
    const event = request.mock.calls[0][0] as CustomEvent<AiProfitAdvisorEntryRequest>;
    expect(event.detail.profit).toEqual({
      focus: "GENERAL",
      from: "2026-09-01",
      to: "2026-09-30",
      productId: "product-1",
    });
    expect(event.detail.question).toMatch(/contribution margin/i);
    expect(event.detail.question).not.toMatch(/supplier quote|employee productivity/i);

    window.removeEventListener(AI_PROFIT_ADVISOR_EVENT, request);
  });

  it("hides Ask Factory1 when profit advisor access is not permitted", () => {
    render(
      <ProductProfitabilityDetailDialog
        open
        onOpenChange={vi.fn()}
        detail={detail}
        loading={false}
        onRetry={vi.fn()}
        onConfigureCosting={vi.fn()}
        profitAdvisorEnabled={false}
        advisorPeriod={{ from: "2026-09-01", to: "2026-09-30" }}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Ask Factory1" })
    ).not.toBeInTheDocument();
  });
});
