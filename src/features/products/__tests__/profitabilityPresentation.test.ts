import { describe, expect, it } from "vitest";
import { formatProfitabilityDate } from "../utils/profitabilityPresentation";

describe("profitability presentation", () => {
  it("formats date-only contract values without timezone drift or invented time", () => {
    const formatted = formatProfitabilityDate("2026-09-30");

    expect(formatted).toContain("30");
    expect(formatted).toContain("2026");
    expect(formatted).not.toContain("29");
    expect(formatted).not.toMatch(/\d{1,2}:\d{2}/);
  });
});
