import { describe, expect, it } from "vitest";
import { recommendationEvidenceHref } from "../utils/profitRecommendationNavigation";

describe("recommendation evidence navigation", () => {
  it("builds only allowlisted in-app routes and encodes identifiers", () => {
    expect(
      recommendationEvidenceHref({
        id: "evidence-1",
        label: "Profitability",
        target: "PRODUCT_PROFITABILITY",
        productId: "product/1?unsafe=true",
        from: "2026-07-01",
        to: "2026-09-30",
      })
    ).toBe(
      "/products?view=profitability&profitabilityProduct=product%2F1%3Funsafe%3Dtrue&from=2026-07-01&to=2026-09-30"
    );
  });

  it("uses immutable snapshots and suppresses unresolved market routes", () => {
    expect(
      recommendationEvidenceHref({
        id: "costing",
        label: "Frozen costing",
        target: "PRODUCT_COSTING",
        productId: "product-1",
        snapshotId: "snapshot-1",
      })
    ).toContain("snapshotId=snapshot-1");
    expect(
      recommendationEvidenceHref({
        id: "market",
        label: "Market evidence",
        target: "MARKET_EVIDENCE",
        productId: "product-1",
        marketRunId: "run-1",
      })
    ).toBeNull();
  });

  it("does not accept arbitrary URLs or mutation actions", () => {
    expect(
      recommendationEvidenceHref({
        id: "evidence-2",
        label: "Unknown",
        target: "UNSUPPORTED" as "PRODUCT_COSTING",
        productId: "product-1",
      })
    ).toBeNull();
  });
});
