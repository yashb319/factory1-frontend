import { describe, expect, it } from "vitest";
import { contactSchema, validateContactStep, validateProjectionInputs, validateQuestionStep } from "../validation";

describe("health check validation", () => {
  it("blocks unanswered question steps and excess multi-select choices", () => {
    expect(validateQuestionStep(0, {})).toMatchObject({
      factory_size: expect.any(String),
      improvement_readiness: expect.any(String),
    });

    expect(validateQuestionStep(2, { owner_reporting: "INVALID" })).toMatchObject({
      owner_reporting: "Select an answer to continue",
    });
  });

  it("validates optional projection inputs against the backend boundaries", () => {
    expect(validateProjectionInputs({ workingDaysPerMonth: "", loadedHourlyLabourCostInr: "" })).toEqual({});
    expect(validateProjectionInputs({ workingDaysPerMonth: "20", loadedHourlyLabourCostInr: "100" })).toEqual({});
    expect(validateProjectionInputs({ workingDaysPerMonth: "31", loadedHourlyLabourCostInr: "10000" })).toEqual({});
    expect(validateProjectionInputs({ workingDaysPerMonth: "19", loadedHourlyLabourCostInr: "10001" })).toEqual({
      workingDaysPerMonth: expect.any(String),
      loadedHourlyLabourCostInr: expect.any(String),
    });
    expect(validateProjectionInputs({ workingDaysPerMonth: "26", loadedHourlyLabourCostInr: "" })).toHaveProperty("loadedHourlyLabourCostInr");
  });

  it("requires valid contact details without a consent blocker", () => {
    expect(contactSchema.safeParse({ name: "", email: "bad", phone: "1", companyName: "", location: "" }).success).toBe(false);
    expect(validateContactStep(
      { name: "Asha Rao", email: "asha@example.com", phone: "9876543210", companyName: "Asha Works", location: "Pune" }
    )).toEqual({});
  });
});
