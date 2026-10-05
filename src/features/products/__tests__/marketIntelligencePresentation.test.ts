import { describe, expect, it } from "vitest";
import { formatMarketMoney } from "../utils/marketIntelligencePresentation";

describe("market intelligence presentation", () => {
  it.each([null, "", "INVALID", "ZZZ"])(
    "does not invent a currency when market facts return %j",
    (currency) => {
      expect(formatMarketMoney({ currency, value: 150 })).toBe("Not available");
      expect(formatMarketMoney({ currency, min: 120, max: 190 })).toBe(
        "Not available"
      );
    }
  );

  it("preserves valid market range formatting", () => {
    const formatted = formatMarketMoney({
      currency: "EUR",
      min: 120,
      max: 190,
    });

    expect(formatted).toContain("€");
    expect(formatted).toContain("120");
    expect(formatted).toContain("190");
  });
});
