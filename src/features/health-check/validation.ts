import { z } from "zod";
import { HEALTH_CHECK_STEPS } from "./config";
import type {
  HealthCheckContact,
  HealthCheckProjectionInputDraft,
} from "./types";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email address").max(254),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(32, "Enter a valid phone number"),
  companyName: z.string().trim().min(2, "Enter your factory or company name").max(160),
  location: z.string().trim().max(160),
});

export function validateQuestionStep(step: number, answers: Record<string, string>) {
  const errors: Record<string, string> = {};
  const config = HEALTH_CHECK_STEPS[step];
  if (!config) return errors;

  for (const question of config.questions) {
    const value = answers[question.id];
    if (!value || !question.options.some((option) => option.value === value)) {
      errors[question.id] = "Select an answer to continue";
    }
  }
  return errors;
}

export function validateContactStep(
  contact: HealthCheckContact
) {
  const parsed = contactSchema.safeParse(contact);
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  return errors;
}

export function validateProjectionInputs(inputs?: HealthCheckProjectionInputDraft) {
  const errors: Record<string, string> = {};
  if (!inputs) return errors;

  const workingDays = inputs.workingDaysPerMonth.trim();
  if (!workingDays) return errors;

  const parsedDays = Number(workingDays);
  if (!workingDays || !Number.isInteger(parsedDays) || parsedDays < 20 || parsedDays > 31) {
    errors.workingDaysPerMonth = "Enter a whole number from 20 to 31";
  }
  return errors;
}
