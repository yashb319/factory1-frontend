import { describe, expect, it } from "vitest";
import { contactSchema, validateContactStep, validateQuestionStep } from "../validation";

describe("health check validation", () => {
  it("blocks unanswered question steps and excess multi-select choices", () => {
    expect(validateQuestionStep(0, {})).toMatchObject({
      factory_size: expect.any(String),
      production_model: expect.any(String),
      locations: expect.any(String),
    });
    expect(validateQuestionStep(5, { improvement_goals: ["EMPLOYEE", "PRODUCTION", "INVENTORY", "FINANCE"] })).toMatchObject({
      improvement_goals: "Choose no more than three priorities",
    });
  });

  it("requires valid contact details and consent for a follow-up channel", () => {
    expect(contactSchema.safeParse({ name: "", email: "bad", phone: "1", companyName: "", city: "" }).success).toBe(false);
    expect(validateContactStep(
      { name: "Asha Rao", email: "asha@example.com", phone: "9876543210", companyName: "Asha Works", city: "Pune" },
      false,
      "EMAIL"
    )).toHaveProperty("followUpPreference");
  });
});
