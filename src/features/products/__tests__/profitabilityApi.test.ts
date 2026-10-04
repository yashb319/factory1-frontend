import { describe, expect, it } from "vitest";
import { toProfitabilityPortfolioQuery } from "../api/profitabilityApi";

describe("profitability API query mapping", () => {
  it("maps URL filters, backend health enums, sorting, and pagination", () => {
    expect(
      toProfitabilityPortfolioQuery({
        from: "2026-07-01",
        to: "2026-09-30",
        page: 2,
        size: 50,
        search: "cabinet",
        health: "OPPORTUNITY",
        completeness: "COMPLETE",
        sort: "MARGIN",
        direction: "DESC",
      })
    ).toEqual({
      from: "2026-07-01",
      to: "2026-09-30",
      page: 2,
      size: 50,
      search: "cabinet",
      health: "WATCH",
      completeness: "COMPLETE",
      revenueBasis: "REALIZED_POSTED_SALES_TAX_EXCLUSIVE",
      sort: "MARGIN_PERCENT",
      direction: "DESC",
    });
  });

  it("uses completeness for the user-facing incomplete health filter", () => {
    const query = toProfitabilityPortfolioQuery({
      from: "2026-07-01",
      to: "2026-09-30",
      page: 0,
      size: 20,
      search: "",
      health: "INCOMPLETE",
      completeness: "ALL",
      sort: "PRODUCT",
      direction: "ASC",
    });

    expect(query.completeness).toBe("INCOMPLETE");
    expect(query.health).toBeUndefined();
  });
});
