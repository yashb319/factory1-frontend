import { HEALTH_CHECK_SCHEMA_VERSION, HEALTH_CHECK_STEPS } from "./config";
import type { HealthCheckDraft, HealthCheckSubmission } from "./types";
import { validateProjectionInputs } from "./validation";

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

  const workingDays = draft.projectionInputs.workingDaysPerMonth.trim();
  const hourlyCost = draft.projectionInputs.loadedHourlyLabourCostInr.trim();
  if (Object.keys(validateProjectionInputs(draft.projectionInputs)).length > 0) {
    throw new Error("Health check projection inputs are invalid");
  }
  const projectionInputs = workingDays || hourlyCost
    ? {
        workingDaysPerMonth: Number(workingDays),
        loadedHourlyLabourCostInr: Number(hourlyCost),
      }
    : undefined;

  return {
    schemaVersion: HEALTH_CHECK_SCHEMA_VERSION,
    contact: draft.contact,
    answers,
    followUpPreference: "NO_FOLLOW_UP",
    idempotencyKey: draft.idempotencyKey,
    website: "",
    formStartedAtEpochMs: draft.formStartedAtEpochMs,
    ...(projectionInputs ? { projectionInputs } : {}),
  };
}
