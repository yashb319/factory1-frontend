import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfitCenterDashboard } from "../components/ProfitCenterDashboard";
import type { ProfitCenterDashboard as Dashboard } from "../types/profitRecommendations.types";

const dashboard: Dashboard = {
  from: "2026-07-01",
  to: "2026-09-30",
  generatedAt: "2026-10-05T00:00:00Z",
  freshnessLabel: "2 current, 1 aging, 1 stale, and 1 missing cost snapshots",
  attributedRevenue: { currency: "INR", value: 1000 },
  frozenProductCost: { currency: "INR", value: 700 },
  contributionProfit: { currency: "INR", value: 123.45 },
  contributionMarginPercent: 9.87,
  costComposition: [
    {
      label: "Materials",
      value: { currency: "INR", value: 401 },
      percent: 57.29,
    },
  ],
  trends: [
    {
      period: "2026-09-01 to 2026-09-30",
      attributedRevenue: { currency: "INR", value: 400 },
      frozenCost: { currency: "INR", value: 350 },
      contributionProfit: { currency: "INR", value: -17.25 },
      contributionMarginPercent: -4.31,
    },
  ],
  attributionCoveragePercent: 80,
  costCoveragePercent: 70,
  unallocatedRevenue: { currency: "INR", value: 250 },
  unallocatedRevenueLineCount: 2,
  dataGapReasons: [
    "2 products have incomplete profitability evidence.",
    "1 product lacks an effective cost snapshot.",
  ],
  openRecommendationCount: 3,
  recommendationSeverityCounts: { HIGH: 1, WARNING: 2 },
  recommendationCategoryCounts: [
    { category: "Low contribution margin", count: 2 },
  ],
  topProducts: [
    {
      productId: "product-1",
      productCode: "FG-001",
      productName: "Cabinet",
      contributionProfit: { currency: "INR", value: 100 },
      contributionMarginPercent: 20,
      completeness: "COMPLETE",
      freshness: "CURRENT",
    },
  ],
  bottomProducts: [],
};

describe("ProfitCenterDashboard", () => {
  it("renders server reconciliation, freshness, gaps and exact returned contribution", () => {
    render(
      <ProfitCenterDashboard
        dashboard={dashboard}
        loading={false}
        fetching={false}
        canRefresh
        refreshing={false}
        onRetry={vi.fn()}
        onRefresh={vi.fn()}
        onPeriodChange={vi.fn()}
        onOpenRecommendations={vi.fn()}
        onOpenProduct={vi.fn()}
      />
    );

    expect(screen.getByText("₹123.45")).toBeInTheDocument();
    expect(screen.queryByText("₹300")).not.toBeInTheDocument();
    expect(screen.getByText("₹250.00")).toBeInTheDocument();
    expect(screen.getByText("2 unallocated lines")).toBeInTheDocument();
    expect(screen.getByText(/1 stale, and 1 missing/)).toBeInTheDocument();
    expect(screen.getByText(/2 products have incomplete/)).toBeInTheDocument();
    expect(screen.getByText("₹401.00")).toBeInTheDocument();
    expect(screen.getByText("-₹17.25")).toBeInTheDocument();
    expect(screen.getByText(/not company net profit/i)).toBeInTheDocument();
    expect(screen.queryByText(/supplier|employee|waste|energy/i)).not.toBeInTheDocument();
  });

  it("keeps missing or mixed-currency values explicitly unavailable", () => {
    render(
      <ProfitCenterDashboard
        dashboard={{
          ...dashboard,
          attributedRevenue: {
            currency: null,
            value: 1000,
            unavailableReason: "MIXED_SNAPSHOT_CURRENCIES",
          },
        }}
        loading={false}
        fetching={false}
        canRefresh={false}
        refreshing={false}
        onRetry={vi.fn()}
        onRefresh={vi.fn()}
        onPeriodChange={vi.fn()}
        onOpenRecommendations={vi.fn()}
        onOpenProduct={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Not available \(mixed snapshot currencies\)/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /refresh recommendations/i })
    ).not.toBeInTheDocument();
  });

  it("routes dashboard actions through callbacks", async () => {
    const user = userEvent.setup();
    const refresh = vi.fn();
    const recommendations = vi.fn();
    const openProduct = vi.fn();
    render(
      <ProfitCenterDashboard
        dashboard={dashboard}
        loading={false}
        fetching={false}
        canRefresh
        refreshing={false}
        onRetry={vi.fn()}
        onRefresh={refresh}
        onPeriodChange={vi.fn()}
        onOpenRecommendations={recommendations}
        onOpenProduct={openProduct}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Refresh recommendations" })
    );
    await user.click(screen.getByRole("button", { name: /Recommendations \(3\)/ }));
    await user.click(screen.getByRole("button", { name: "View product" }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(recommendations).toHaveBeenCalledOnce();
    expect(openProduct).toHaveBeenCalledWith("product-1");
  });
});
