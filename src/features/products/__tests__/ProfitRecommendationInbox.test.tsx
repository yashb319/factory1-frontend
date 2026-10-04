import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfitRecommendationInbox } from "../components/ProfitRecommendationInbox";
import type {
  ProfitRecommendation,
  RecommendationFilters,
  RecommendationPage,
} from "../types/profitRecommendations.types";

const filters: RecommendationFilters = {
  page: 0,
  size: 20,
  lifecycle: "ALL",
  type: "ALL",
  severity: "ALL",
  productId: "",
  freshness: "ALL",
};

const recommendation: ProfitRecommendation = {
  id: "rec-1",
  version: "4",
  title: "Review market price evidence",
  summary: "Three accepted same-channel comparables are available.",
  type: "MARKET_PRICE_EVIDENCE",
  category: "Market price evidence",
  severity: "WARNING",
  lifecycle: "OPEN",
  productId: "product/1",
  productCode: "FG-001",
  productName: "Cabinet",
  confidence: "HIGH",
  dataQuality: "COMPLETE",
  ruleVersion: "rules-6",
  engineVersion: "engine-3",
  generatedAt: "2026-10-05T00:00:00Z",
  expiresAt: "2026-10-10T00:00:00Z",
  impact: {
    label: "Deterministic impact",
    amount: null,
    percent: null,
    unavailableReason: "Market evidence is observational only.",
  },
  evidence: [
    {
      id: "market",
      label: "Review market evidence",
      target: "MARKET_EVIDENCE",
      productId: "product/1",
      sourceCount: 3,
      confidence: "HIGH",
      freshness: "2026-10-10T00:00:00Z",
      channel: "WHOLESALE",
      currency: "INR",
    },
  ],
  rationale: [],
  profitabilityCoverage: 90,
  snapshotStatus: "COMPLETE",
  allowedActions: ["ACKNOWLEDGE", "DISMISS", "RESOLVE"],
};

const page: RecommendationPage = {
  content: [recommendation],
  page: 0,
  size: 20,
  totalElements: 21,
  totalPages: 2,
};

function renderInbox(
  overrides: Partial<React.ComponentProps<typeof ProfitRecommendationInbox>> = {}
) {
  const props: React.ComponentProps<typeof ProfitRecommendationInbox> = {
    page,
    filters,
    selected: null,
    loading: false,
    fetching: false,
    detailLoading: false,
    actionPending: false,
    onFiltersChange: vi.fn(),
    onSelect: vi.fn(),
    onRetry: vi.fn(),
    onRetryDetail: vi.fn(),
    onAction: vi.fn(),
    ...overrides,
  };
  render(<ProfitRecommendationInbox {...props} />);
  return props;
}

describe("ProfitRecommendationInbox", () => {
  it("renders null impact reasons and drives server paging", async () => {
    const user = userEvent.setup();
    const props = renderInbox();

    expect(
      screen.getByText(/Market evidence is observational only/)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(props.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  it("shows safe evidence facts and market review wording", () => {
    renderInbox({ selected: recommendation });

    expect(screen.getByText(/not an instruction to set a price/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("WHOLESALE · INR")).toBeInTheDocument();
    const evidence = screen.getByText("Review market evidence");
    expect(evidence.closest("a")).toBeNull();
    expect(screen.queryByText(/set this price/i)).not.toBeInTheDocument();
  });

  it("confirms lifecycle actions and forwards the current versioned record", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderInbox({ selected: recommendation, onAction });

    await user.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(
      screen.getByText(/current record version/i)
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Confirm acknowledge" })
    );
    expect(onAction).toHaveBeenCalledWith(
      recommendation,
      "ACKNOWLEDGE",
      undefined
    );
  });

  it("keeps expired historical records read-only", () => {
    renderInbox({
      selected: {
        ...recommendation,
        lifecycle: "EXPIRED",
        allowedActions: [],
      },
    });

    expect(screen.getByText(/historical, expired, or resolved/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acknowledge" })).not.toBeInTheDocument();
  });

  it("surfaces lifecycle errors without success-shaped fallback", () => {
    renderInbox({
      selected: recommendation,
      actionError:
        "This recommendation changed in another session. The latest version has been reloaded.",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /changed in another session/
    );
  });
});
