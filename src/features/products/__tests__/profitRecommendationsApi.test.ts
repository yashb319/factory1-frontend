import { describe, expect, it } from "vitest";
import {
  recommendationLifecycleBody,
  toRecommendationQuery,
} from "../api/profitRecommendationsApi";

describe("profit recommendation API query mapping", () => {
  it("maps all server paging and filter fields including freshness", () => {
    expect(
      toRecommendationQuery({
        page: 2,
        size: 50,
        lifecycle: "ACKNOWLEDGED",
        type: "LOW_CONTRIBUTION_MARGIN",
        severity: "WARNING",
        productId: "product-1",
        freshness: "EXPIRING",
      })
    ).toEqual({
      page: 2,
      size: 50,
      status: "ACKNOWLEDGED",
      type: "LOW_CONTRIBUTION_MARGIN",
      severity: "WARNING",
      productId: "product-1",
      freshness: "EXPIRING",
    });
  });

  it("omits all optional filters instead of inventing defaults", () => {
    expect(
      toRecommendationQuery({
        page: 0,
        size: 20,
        lifecycle: "ALL",
        type: "ALL",
        severity: "ALL",
        productId: "",
        freshness: "ALL",
      })
    ).toEqual({
      page: 0,
      size: 20,
      status: undefined,
      type: undefined,
      severity: undefined,
      productId: undefined,
      freshness: undefined,
    });

  });

  it("always sends the optimistic concurrency token and only dismiss reasons", () => {
    expect(
      recommendationLifecycleBody({
        id: "rec-1",
        action: "DISMISS",
        expectedVersion: 4,
        reason: "Already addressed",
      })
    ).toEqual({ expectedVersion: 4, reason: "Already addressed" });
    expect(
      recommendationLifecycleBody({
        id: "rec-1",
        action: "ACKNOWLEDGE",
        expectedVersion: 5,
        reason: "ignored",
      })
    ).toEqual({ expectedVersion: 5 });
  });
});
