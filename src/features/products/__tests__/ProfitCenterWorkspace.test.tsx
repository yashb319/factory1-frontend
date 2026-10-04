import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  GenerationStatus,
  isRecommendationVersionConflict,
  recommendationFiltersFromSearchParams,
} from "../components/ProfitCenterWorkspace";

describe("ProfitCenterWorkspace helpers", () => {
  it("parses only supported server filters and paging", () => {
    const search = new URLSearchParams({
      recommendationPage: "2",
      recommendationSize: "50",
      recommendationStatus: "ACKNOWLEDGED",
      recommendationType: "MATERIAL_COST_INCREASE",
      recommendationSeverity: "HIGH",
      recommendationProduct: "product-1",
      recommendationFreshness: "EXPIRING",
    });

    expect(recommendationFiltersFromSearchParams(search)).toEqual({
      page: 2,
      size: 50,
      lifecycle: "ACKNOWLEDGED",
      type: "MATERIAL_COST_INCREASE",
      severity: "HIGH",
      productId: "product-1",
      freshness: "EXPIRING",
    });
  });

  it("shows bounded running status and failed retry explicitly", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = render(
      <GenerationStatus
        job={{
          id: "job-1",
          status: "RUNNING",
          from: "2026-07-01",
          to: "2026-09-30",
          attempts: 1,
          generatedCount: 0,
          requestedAt: "2026-10-05T00:00:00Z",
          progressMessage: "Evaluating frozen facts",
          retryAllowed: false,
        }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Evaluating frozen facts"
    );

    rerender(
      <GenerationStatus
        job={{
          id: "job-1",
          status: "FAILED",
          from: "2026-07-01",
          to: "2026-09-30",
          attempts: 2,
          generatedCount: 0,
          requestedAt: "2026-10-05T00:00:00Z",
          failureReason: "Generation cooldown active",
          retryAllowed: true,
        }}
        onRetry={retry}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Generation cooldown active"
    );
    await user.click(screen.getByRole("button", { name: "Retry generation" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("recognizes optimistic concurrency conflicts without masking other errors", () => {
    expect(isRecommendationVersionConflict({ status: 409 })).toBe(true);
    expect(isRecommendationVersionConflict({ status: 500 })).toBe(false);
    expect(isRecommendationVersionConflict(new Error("network"))).toBe(false);
  });
});
