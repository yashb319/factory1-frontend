import { z } from "zod";
import { HEALTH_CHECK_STEPS } from "./config";
import type { HealthCheckAnswerValue, HealthCheckContact, FollowUpPreference } from "./types";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20, "Enter a valid phone number"),
  companyName: z.string().trim().min(2, "Enter your factory or company name"),
  city: z.string().trim().min(2, "Enter your city or location"),
});

export function validateQuestionStep(step: number, answers: Record<string, HealthCheckAnswerValue>) {
  const errors: Record<string, string> = {};
  const config = HEALTH_CHECK_STEPS[step];
  if (!config) return errors;

  for (const question of config.questions) {
    const value = answers[question.id];
    if (question.required && (!value || (Array.isArray(value) && value.length === 0))) {
      errors[question.id] = "Select an answer to continue";
    }
    if (question.id === "improvement_goals" && Array.isArray(value) && value.length > 3) {
      errors[question.id] = "Choose no more than three priorities";
    }
  }
  return errors;
}

export function validateContactStep(
  contact: HealthCheckContact,
  consent: boolean,
  followUpPreference: FollowUpPreference
) {
  const parsed = contactSchema.safeParse(contact);
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  if (consent && followUpPreference === "NONE") {
    errors.followUpPreference = "Choose how you would prefer us to contact you";
  }
  if (!consent && followUpPreference !== "NONE") {
    errors.followUpPreference = "Consent is required for follow-up";
  }
  return errors;
}
