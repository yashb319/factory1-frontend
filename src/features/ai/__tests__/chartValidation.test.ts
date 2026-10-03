import { describe, expect, it } from "vitest";
import { validateAiChart } from "../components/AiChartView";

describe("AI chart gate", () => {
  it("rejects decorative, empty and non-finite charts", () => {
    expect(
      validateAiChart({
        type: "bar",
        title: "Only one point",
        data: [{ label: "Today", value: 12 }],
      })
    ).toBeNull();
    expect(
      validateAiChart({
        type: "line",
        title: "Invalid",
        data: [
          { label: "A", value: Number.NaN },
          { label: "B", value: 2 },
        ],
      })
    ).toBeNull();
    expect(
      validateAiChart({
        type: "pie",
        title: "Empty",
        data: [
          { label: "A", value: 0 },
          { label: "B", value: 0 },
        ],
      })
    ).toBeNull();
  });

  it("keeps valid finite multi-point data", () => {
    expect(
      validateAiChart({
        type: "bar",
        title: "Low stock",
        data: [
          { label: "Steel", value: 12 },
          { label: "Paint", value: 4 },
        ],
      })?.data
    ).toHaveLength(2);
  });
});
