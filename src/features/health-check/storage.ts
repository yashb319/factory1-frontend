import {
  DEFAULT_PROJECTION_INPUTS,
  EMPTY_CONTACT,
  HEALTH_CHECK_DRAFT_VERSION,
  HEALTH_CHECK_STEPS,
} from "./config";
import type {
  HealthCheckContact,
  HealthCheckDraft,
  HealthCheckProjectionInputDraft,
} from "./types";

export const HEALTH_CHECK_DRAFT_KEY = `factory1:health-check:draft:v${HEALTH_CHECK_DRAFT_VERSION}`;
export const HEALTH_CHECK_WELCOME_KEY = `factory1:health-check:welcome:v${HEALTH_CHECK_DRAFT_VERSION}`;
// A dismissal hides the welcome prompt for 14 days; completion hides it for this questionnaire version.
export const WELCOME_DISMISSAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

type WelcomeState = { status: "dismissed"; at: number } | { status: "completed"; at: number };

export function createHealthCheckDraft(): HealthCheckDraft {
  return {
    version: HEALTH_CHECK_DRAFT_VERSION,
    step: 0,
    answers: {},
    contact: { ...EMPTY_CONTACT },
    projectionInputs: { ...DEFAULT_PROJECTION_INPUTS },
    idempotencyKey: crypto.randomUUID(),
    formStartedAtEpochMs: Date.now(),
  };
}

export function loadHealthCheckDraft(storage: Storage = localStorage): HealthCheckDraft | null {
  try {
    const raw = storage.getItem(HEALTH_CHECK_DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<HealthCheckDraft>;
    if (
      value.version !== HEALTH_CHECK_DRAFT_VERSION ||
      typeof value.step !== "number" ||
      !Number.isInteger(value.step) ||
      value.step < 0 ||
      value.step > HEALTH_CHECK_STEPS.length ||
      !isAnswerRecord(value.answers) ||
      !isContact(value.contact) ||
      !isProjectionInputDraft(value.projectionInputs) ||
      !isUuid(value.idempotencyKey) ||
      typeof value.formStartedAtEpochMs !== "number" ||
      !Number.isFinite(value.formStartedAtEpochMs) ||
      value.formStartedAtEpochMs <= 0
    ) {
      storage.removeItem(HEALTH_CHECK_DRAFT_KEY);
      return null;
    }
    return {
      version: value.version,
      step: value.step,
      answers: value.answers,
      contact: value.contact,
      projectionInputs: value.projectionInputs,
      idempotencyKey: value.idempotencyKey,
      formStartedAtEpochMs: value.formStartedAtEpochMs,
    };
  } catch {
    storage.removeItem(HEALTH_CHECK_DRAFT_KEY);
    return null;
  }
}

function isProjectionInputDraft(value: unknown): value is HealthCheckProjectionInputDraft {
  if (!value || typeof value !== "object") return false;
  const inputs = value as Record<string, unknown>;
  return (
    typeof inputs.workingDaysPerMonth === "string" &&
    typeof inputs.loadedHourlyLabourCostInr === "string"
  );
}

function isAnswerRecord(value: unknown): value is Record<string, string> {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((answer) => typeof answer === "string")
  );
}

function isContact(value: unknown): value is HealthCheckContact {
  if (!value || typeof value !== "object") return false;
  const contact = value as Record<string, unknown>;
  return ["name", "email", "phone", "companyName", "location"].every(
    (key) => typeof contact[key] === "string"
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function saveHealthCheckDraft(draft: HealthCheckDraft, storage: Storage = localStorage) {
  storage.setItem(HEALTH_CHECK_DRAFT_KEY, JSON.stringify(draft));
}

export function clearHealthCheckDraft(storage: Storage = localStorage) {
  storage.removeItem(HEALTH_CHECK_DRAFT_KEY);
}

export function shouldShowWelcome(storage: Storage = localStorage, now = Date.now()) {
  try {
    const raw = storage.getItem(HEALTH_CHECK_WELCOME_KEY);
    if (!raw) return true;
    const state = JSON.parse(raw) as WelcomeState;
    if (state.status === "completed") return false;
    return state.status !== "dismissed" || now - state.at >= WELCOME_DISMISSAL_COOLDOWN_MS;
  } catch {
    storage.removeItem(HEALTH_CHECK_WELCOME_KEY);
    return true;
  }
}

export function dismissWelcome(storage: Storage = localStorage, now = Date.now()) {
  storage.setItem(HEALTH_CHECK_WELCOME_KEY, JSON.stringify({ status: "dismissed", at: now }));
}

export function completeWelcome(storage: Storage = localStorage, now = Date.now()) {
  storage.setItem(HEALTH_CHECK_WELCOME_KEY, JSON.stringify({ status: "completed", at: now }));
}
