import { HEALTH_CHECK_SCHEMA_VERSION, HEALTH_CHECK_STEPS } from "./config";
import type { HealthCheckDraft, HealthCheckSubmission } from "./types";

export function buildHealthCheckSubmission(draft: HealthCheckDraft): HealthCheckSubmission {
  const answers = HEALTH_CHECK_STEPS.flatMap((step) =>
    step.questions.map((question) => ({
      questionId: question.id,
      value: draft.answers[question.id],
    }))
  );

  if (answers.length !== 18 || answers.some((answer) => !answer.value)) {
    throw new Error("Health check requires exactly 18 completed answers");
  }

  return {
    schemaVersion: HEALTH_CHECK_SCHEMA_VERSION,
    contact: draft.contact,
    answers,
    consentToContact: draft.consentToContact,
    followUpPreference: draft.followUpPreference,
    idempotencyKey: draft.idempotencyKey,
    website: "",
    formStartedAtEpochMs: draft.formStartedAtEpochMs,
  };
}
