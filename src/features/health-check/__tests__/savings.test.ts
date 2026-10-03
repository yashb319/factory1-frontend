import { describe, expect, it } from "vitest";
import { formatHoursRange, formatInr, formatInrRange, formatPercentRange } from "../savings";

describe("savings formatting", () => {
  it("uses human-friendly range rounding without fake precision", () => {
    expect(formatHoursRange({ min: 32.4, max: 67.6 })).toBe("32–68 hours");
    expect(formatInrRange({ min: 11_100, max: 23_900 })).toBe("₹11,000–₹24,000");
    expect(formatInr(250)).toBe("₹250");
    expect(formatPercentRange({ min: 0.4, max: 0.7 })).toBe("40–70%");
  });
});
