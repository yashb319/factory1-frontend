import { EMPTY_CONTACT, HEALTH_CHECK_SCHEMA_VERSION } from "./config";
import type { FollowUpPreference, HealthCheckAnswerValue, HealthCheckContact, HealthCheckDraft } from "./types";

export const HEALTH_CHECK_DRAFT_KEY = `factory1:health-check:draft:v${HEALTH_CHECK_SCHEMA_VERSION}`;
export const HEALTH_CHECK_WELCOME_KEY = `factory1:health-check:welcome:v${HEALTH_CHECK_SCHEMA_VERSION}`;
// A dismissal hides the welcome prompt for 14 days; completion hides it for this schema version.
export const WELCOME_DISMISSAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

type WelcomeState = { status: "dismissed"; at: number } | { status: "completed"; at: number };

export function createHealthCheckDraft(): HealthCheckDraft {
  return {
    version: HEALTH_CHECK_SCHEMA_VERSION,
    step: 0,
    answers: {},
    contact: { ...EMPTY_CONTACT },
    consentToContact: false,
    followUpPreference: "NONE",
    idempotencyKey: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
  };
}

export function loadHealthCheckDraft(storage: Storage = localStorage): HealthCheckDraft | null {
  try {
    const raw = storage.getItem(HEALTH_CHECK_DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<HealthCheckDraft>;
    if (
      value.version !== HEALTH_CHECK_SCHEMA_VERSION ||
      typeof value.step !== "number" ||
      !Number.isInteger(value.step) ||
      value.step < 0 ||
      value.step > 6 ||
      !isAnswerRecord(value.answers) ||
      !isContact(value.contact) ||
      typeof value.consentToContact !== "boolean" ||
      !isFollowUpPreference(value.followUpPreference) ||
      typeof value.idempotencyKey !== "string" ||
      typeof value.startedAt !== "string"
    ) {
      storage.removeItem(HEALTH_CHECK_DRAFT_KEY);
      return null;
    }

    function isAnswerRecord(value: unknown): value is Record<string, HealthCheckAnswerValue> {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      return Object.values(value).every(
        (answer) =>
          typeof answer === "string" ||
          (Array.isArray(answer) && answer.every((entry) => typeof entry === "string"))
      );
    }

    function isContact(value: unknown): value is HealthCheckContact {
      if (!value || typeof value !== "object") return false;
      const contact = value as Record<string, unknown>;
      return ["name", "email", "phone", "companyName", "city"].every(
        (key) => typeof contact[key] === "string"
      );
    }

    function isFollowUpPreference(value: unknown): value is FollowUpPreference {
      return value === "EMAIL" || value === "PHONE" || value === "WHATSAPP" || value === "NONE";
    }
    return { ...createHealthCheckDraft(), ...value } as HealthCheckDraft;
  } catch {
    storage.removeItem(HEALTH_CHECK_DRAFT_KEY);
    return null;
  }
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
