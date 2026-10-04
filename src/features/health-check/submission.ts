import { HEALTH_CHECK_SCHEMA_VERSION, HEALTH_CHECK_STEPS } from "./config";
import type {
  CreateHealthCheckDraftRequest,
  HealthCheckDraft,
  UpdateHealthCheckDraftRequest,
} from "./types";
import { validateProjectionInputs } from "./validation";

export function buildHealthCheckDraftCreate(draft: HealthCheckDraft): CreateHealthCheckDraftRequest {
  const location = draft.contact.location.trim();
  return {
    contact: {
      name: draft.contact.name.trim(),
      email: draft.contact.email.trim(),
      phone: draft.contact.phone.trim(),
      companyName: draft.contact.companyName.trim(),
      ...(location ? { location } : {}),
    },
    followUpPreference: "NO_FOLLOW_UP",
    idempotencyKey: draft.idempotencyKey,
    website: "",
  };
}

export function buildHealthCheckDraftUpdate(
  draft: HealthCheckDraft,
  expectedRevision: number
): UpdateHealthCheckDraftRequest {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error("Health check draft revision is invalid");
  }
  const answers = HEALTH_CHECK_STEPS.flatMap((step) =>
    step.questions.map((question) => ({
      questionId: question.id,
      value: draft.answers[question.id],
    }))
  );

  const questionCount = HEALTH_CHECK_STEPS.reduce((total, step) => total + step.questions.length, 0);
  if (answers.length !== questionCount || answers.some((answer) => !answer.value)) {
    throw new Error(`Health check requires exactly ${questionCount} completed answers`);
  }

  const workingDays = draft.projectionInputs.workingDaysPerMonth.trim();
  if (Object.keys(validateProjectionInputs(draft.projectionInputs)).length > 0) {
    throw new Error("Health check projection inputs are invalid");
  }
  const projectionInputs = workingDays
    ? { workingDaysPerMonth: Number(workingDays) }
    : undefined;

  return {
    schemaVersion: HEALTH_CHECK_SCHEMA_VERSION,
    answers,
    followUpPreference: "NO_FOLLOW_UP",
    expectedRevision,
    ...(projectionInputs ? { projectionInputs } : {}),
  };
}
