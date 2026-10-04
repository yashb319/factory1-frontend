import { describe, expect, it } from "vitest";
import { formatHoursRange } from "../savings";

describe("savings formatting", () => {
  it("uses human-friendly hour-range rounding without fake precision", () => {
    expect(formatHoursRange({ min: 32.4, max: 67.6 })).toBe("32–68 hours");
  });
});
