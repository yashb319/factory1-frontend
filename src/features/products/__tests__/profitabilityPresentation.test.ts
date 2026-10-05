import { describe, expect, it } from "vitest";
import {
  formatProfitabilityDate,
  formatProfitabilityMoney,
} from "../utils/profitabilityPresentation";

describe("profitability presentation", () => {
  it("formats date-only contract values without timezone drift or invented time", () => {
    const formatted = formatProfitabilityDate("2026-09-30");

    expect(formatted).toContain("30");
    expect(formatted).toContain("2026");
    expect(formatted).not.toContain("29");
    expect(formatted).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it.each([null, "", "  ", "INVALID", "ZZZ"])(
    "renders money as unavailable for unsupported currency %j",
    (currency) => {
      expect(
        formatProfitabilityMoney({
          currency,
          value: 123.45,
        })
      ).toBe("Not available");
    }
  );

  it("preserves valid response currency formatting", () => {
    const formatted = formatProfitabilityMoney({
      currency: "USD",
      value: 123.45,
    });

    expect(formatted).toContain("$");
    expect(formatted).toContain("123.45");
  });
});
