import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfitabilityPortfolio } from "../components/ProfitabilityPortfolio";
import type {
  ProfitabilityFilters,
  ProfitabilityPortfolioView,
} from "../types/profitability.types";

const filters: ProfitabilityFilters = {
  from: "2026-07-01",
  to: "2026-09-30",
  page: 0,
  size: 20,
  search: "",
  health: "ALL",
  completeness: "ALL",
  sort: "PRODUCT",
  direction: "ASC",
};

const portfolio: ProfitabilityPortfolioView = {
  products: {
    content: [
      {
        productId: "product-1",
        productCode: "FG-001",
        productName: "Cabinet",
        realizedUnitSellingPrice: { currency: "INR" },
        attributedRevenue: { currency: "INR", value: 1500 },
        frozenUnitCost: { currency: "INR", value: 100 },
        unitProfit: { currency: "INR" },
        health: "INCOMPLETE",
        completeness: "INCOMPLETE",
        reasons: ["One attributed sales line lacks effective frozen cost."],
        snapshot: null,
        freshnessAt: null,
        coverage: {
          allocatedSalesPercent: 50,
          allocatedRevenue: { currency: "INR", value: 1500 },
          unallocatedRevenue: { currency: "INR" },
          reason: "One attributed sales line missing cost.",
        },
      },
    ],
    page: 0,
    size: 20,
    totalElements: 21,
    totalPages: 2,
  },
  summary: {
    currency: "INR",
    totalAttributedRevenue: { currency: "INR", value: 1500 },
    totalAttributedCost: { currency: "INR" },
    totalProfit: { currency: "INR" },
    unallocatedSalesAmount: { currency: "INR", value: 250 },
    unallocatedSalesLineCount: 1,
    attributionCoveragePercent: 80,
    costCoveragePercent: 50,
  },
  metadata: { dateBoundary: "INCLUSIVE" },
};

describe("ProfitabilityPortfolio", () => {
  it("preserves missing metrics and drives sorting and pagination through callbacks", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <ProfitabilityPortfolio
        portfolio={portfolio}
        filters={filters}
        loading={false}
        fetching={false}
        onFiltersChange={onFiltersChange}
        onRetry={vi.fn()}
        onOpenDetail={vi.fn()}
        onConfigureCosting={vi.fn()}
      />
    );

    expect(screen.getByText("Incomplete")).toBeInTheDocument();
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    expect(screen.getByText(/One attributed sales line lacks/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Sort by Attributed revenue asc",
      })
    );
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 0,
        sort: "ATTRIBUTED_REVENUE",
        direction: "ASC",
      })
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it("surfaces errors with retry", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <ProfitabilityPortfolio
        portfolio={undefined}
        filters={filters}
        loading={false}
        fetching={false}
        error="Profitability service unavailable"
        onFiltersChange={vi.fn()}
        onRetry={retry}
        onOpenDetail={vi.fn()}
        onConfigureCosting={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
