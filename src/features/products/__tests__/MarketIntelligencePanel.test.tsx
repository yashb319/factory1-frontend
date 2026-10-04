import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarketIntelligencePanel } from "../components/MarketIntelligencePanel";
import type {
  MarketAvailability,
  MarketIntelligenceView,
} from "../types/marketIntelligence.types";

const baseView: MarketIntelligenceView = {
  availability: "AVAILABLE",
  message: null,
  lastUpdatedAt: "2026-10-01T10:00:00Z",
  expiresAt: "2026-10-08T10:00:00Z",
  searchAttributes: [
    {
      key: "query",
      label: "Search query",
      type: "TEXT",
      required: false,
      maxLength: 300,
      initialValue: "Cabinet",
    },
    {
      key: "material",
      label: "Material",
      type: "TEXT",
      required: false,
      maxLength: 120,
    },
  ],
  searchedAttributes: { query: "Cabinet" },
  summary: {
    range: { currency: "INR", min: 120, max: 190 },
    median: { currency: "INR", value: 150 },
    sampleCount: 4,
    confidence: 0.82,
    method: "IQR_P25_MEDIAN_P75 for RETAIL",
    outlierExclusions: 1,
    limitations: ["Shipping and GST may differ."],
  },
  comparables: [
    {
      id: "comparable-1",
      sourceName: "merchant.example",
      sourceUrl: "https://merchant.example/item",
      observedAt: "2026-10-01",
      freshness: "FRESH",
      title: "Teak Cabinet",
      model: "TC-1",
      originalPrice: { currency: "INR", min: 120, max: 140 },
      normalizedPrice: { currency: "INR", min: 125, max: 145 },
      moq: 5,
      channel: "WHOLESALE",
      material: "Teak",
      dimensions: "100x50 cm",
      features: ["Hand finished"],
      similarity: 0.91,
      confidence: 0.8,
      missingFields: ["shipping"],
      decision: "ACCEPTED",
      decisionReason: "Comparable material and dimensions",
      provider: "SerpApi / Google Shopping",
      providerVersion: null,
      algorithmVersion: "market-v1",
      limitations: ["Seller: Merchant"],
    },
  ],
  page: 0,
  size: 20,
  totalElements: 21,
  totalPages: 2,
  runs: [
    {
      id: "run-1",
      status: "SUCCEEDED",
      startedAt: "2026-10-01T09:59:00Z",
      completedAt: "2026-10-01T10:00:00Z",
      provider: "SerpApi / Google Shopping",
      providerVersion: null,
      algorithmVersion: "market-v1",
      errorCode: "NONE",
      resultCount: 10,
      acceptedCount: 4,
      searchedAttributes: { query: "Cabinet", country: "IN" },
    },
    {
      id: "run-failed",
      status: "FAILED",
      startedAt: "2026-09-30T09:00:00Z",
      safeError: "The provider timed out. Try again later.",
      searchedAttributes: { query: "Cabinet" },
    },
  ],
  advisorEvidence: null,
};

const filters = {
  page: 0,
  size: 20,
  channel: "ALL" as const,
  decision: "ALL" as const,
  freshness: "ALL" as const,
};

function renderPanel(view: MarketIntelligenceView = baseView) {
  const handlers = {
    onStart: vi.fn(),
    onRetry: vi.fn(),
    onFiltersChange: vi.fn(),
  };
  render(
    <MarketIntelligencePanel
      productId="product-1"
      currentRealizedPrice={{ currency: "INR", value: 150 }}
      currentListPrice={{ currency: "INR", value: 175 }}
      view={view}
      filters={filters}
      {...handlers}
    />
  );
  return handlers;
}

describe("MarketIntelligencePanel", () => {
  it.each([
    ["LOADING", "Loading market evidence"],
    ["ENTITLEMENT_REQUIRED", "Market Intelligence is not included"],
    ["PROVIDER_DISABLED", "Market provider is disabled"],
    ["PROVIDER_MISCONFIGURED", "Market provider needs setup"],
    ["PROVIDER_UNHEALTHY", "Market provider is temporarily unavailable"],
    ["NO_DATA", "No market evidence yet"],
    ["RUNNING", "Provider search is running"],
    ["FAILED", "Market search failed"],
    ["STALE", "Market evidence is stale"],
    ["EXPIRED", "Market evidence has expired"],
    ["INSUFFICIENT_COMPARABLES", "Insufficient comparable data"],
    ["AVAILABLE", "Market evidence available"],
  ] as [MarketAvailability, string][])(
    "renders the %s availability state",
    (availability, label) => {
      renderPanel({
        ...baseView,
        availability,
        summary:
          availability === "INSUFFICIENT_COMPARABLES" ? null : baseView.summary,
      });
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  it("shows attributed freshness, missingness, confidence, safe external links, and server range context", () => {
    renderPanel();
    expect(screen.getByText("Server-returned market summary")).toBeInTheDocument();
    expect(screen.getAllByText("₹120.00 - ₹190.00")).toHaveLength(2);
    expect(screen.getByText(/Missing: shipping/i)).toBeInTheDocument();
    expect(screen.getByText(/Similarity: 91%/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence: 80%/i)).toBeInTheDocument();
    expect(screen.getByText(/taxes, GST, shipping, MOQ, quality/i)).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /merchant\.example \(opens outside Factory1\)/i,
    });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("table", {
        name: /attributed external market observations/i,
      })
    ).toHaveClass("responsive-table");
  });

  it("never renders a market range when the server returns null", () => {
    renderPanel({
      ...baseView,
      availability: "INSUFFICIENT_COMPARABLES",
      summary: null,
    });

    expect(screen.queryByText("Server-returned market summary")).not.toBeInTheDocument();
    expect(screen.getByText("Not returned by server")).toBeInTheDocument();
    expect(screen.queryByText("₹120.00 - ₹190.00")).not.toBeInTheDocument();
  });

  it("preserves collected evidence while provider setup blocks new searches", () => {
    renderPanel({
      ...baseView,
      availability: "PROVIDER_MISCONFIGURED",
    });
    expect(screen.getByText("Teak Cabinet")).toBeInTheDocument();
    expect(screen.getByText("Provider run history")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /provider search|refresh from provider/i })
    ).not.toBeInTheDocument();
  });

  it("submits only the displayed bounded structured attributes and exposes no URL or secret input", async () => {
    const user = userEvent.setup();
    const { onStart } = renderPanel();
    await user.clear(screen.getByLabelText("Material"));
    await user.type(screen.getByLabelText("Material"), "Teak");
    expect(screen.getByText(/Will search: Search query: Cabinet · Material: Teak/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start new provider search" }));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product-1",
        attributes: { query: "Cabinet", material: "Teak" },
      })
    );
    expect(screen.queryByLabelText(/url|secret|token|api key/i)).not.toBeInTheDocument();
  });

  it("supports failed-run retry, filtering, pagination, and safe error display", async () => {
    const user = userEvent.setup();
    const { onRetry, onFiltersChange } = renderPanel();
    expect(
      screen.getByText("The provider timed out. Try again later.")
    ).toHaveAttribute("role", "alert");
    await user.click(screen.getByRole("button", { name: "Retry run" }));
    expect(onRetry).toHaveBeenCalledWith("run-failed");
    await user.selectOptions(screen.getByLabelText("Freshness"), "STALE");
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...filters,
      freshness: "STALE",
      page: 0,
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, page: 1 });
  });

  it("contains no proactive recommendation or recommended-price wording", () => {
    const { container } = render(
      <MarketIntelligencePanel
        productId="product-1"
        currentRealizedPrice={{ currency: "INR", value: 150 }}
        view={baseView}
        filters={filters}
        onStart={vi.fn()}
        onRetry={vi.fn()}
        onFiltersChange={vi.fn()}
      />
    );
    expect(container.textContent).not.toMatch(/recommended price|recommendation inbox/i);
  });
});
