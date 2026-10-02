import { describe, expect, it } from "vitest";
import { contactSchema, validateContactStep, validateQuestionStep } from "../validation";

describe("health check validation", () => {
  it("blocks unanswered question steps and excess multi-select choices", () => {
    expect(validateQuestionStep(0, {})).toMatchObject({
      factory_size: expect.any(String),
      software_usage: expect.any(String),
      implementation_timeline: expect.any(String),
    });
    expect(validateQuestionStep(5, { reporting_frequency: "INVALID" })).toMatchObject({
      reporting_frequency: "Select an answer to continue",
    });
  });

  it("requires valid contact details and consent for a follow-up channel", () => {
    expect(contactSchema.safeParse({ name: "", email: "bad", phone: "1", companyName: "", location: "" }).success).toBe(false);
    expect(validateContactStep(
      { name: "Asha Rao", email: "asha@example.com", phone: "9876543210", companyName: "Asha Works", location: "Pune" },
      false,
      "EMAIL"
    )).toHaveProperty("consentToContact");
  });
});
