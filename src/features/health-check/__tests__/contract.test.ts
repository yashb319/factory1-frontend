import { describe, expect, it } from "vitest";
import { HEALTH_CHECK_SCHEMA_VERSION, HEALTH_CHECK_STEPS } from "../config";
import { buildHealthCheckDraftCreate, buildHealthCheckDraftUpdate } from "../submission";
import { createHealthCheckDraft } from "../storage";
import { buildHealthCheckLeadFilters } from "../adminFilters";

const canonicalQuestions = {
  factory_size: ["MICRO", "SMALL", "MEDIUM", "LARGE"],
  improvement_readiness: ["START_NOW", "NEXT_3_MONTHS", "LATER", "EXPLORING"],
  people_and_payroll: ["PAPER_OR_MEMORY", "SPREADSHEETS", "SEPARATE_TOOLS", "CONNECTED_SYSTEM"],
  production_visibility: ["AFTER_SHIFT_OR_LATER", "BOARD_OR_PAPER", "SPREADSHEET", "LIVE_SYSTEM"],
  stock_control: ["VISUAL_OR_MEMORY", "PAPER", "SPREADSHEET", "LIVE_SYSTEM"],
  cost_and_cash_visibility: ["GUESS_OR_DELAYED", "MONTHLY_REPORTS", "SPREADSHEETS", "LIVE_SYSTEM"],
  owner_reporting: ["ASK_AND_WAIT", "MANUAL_WEEKLY", "SPREADSHEET_DASHBOARD", "LIVE_DASHBOARD"],
};

describe("health check submission adapter", () => {
  it("matches the reduced question IDs and option values", () => {
    const actual = Object.fromEntries(
      HEALTH_CHECK_STEPS.flatMap((step) =>
        step.questions.map((question) => [
          question.id,
          question.options.map((option) => option.value),
        ])
      )
    );
    expect(actual).toEqual(canonicalQuestions);
  });

  it("serializes exact create and answer-snapshot shapes", () => {
    const draft = createHealthCheckDraft();
    draft.contact = {
      name: "Asha Rao",
      email: "asha@example.com",
      phone: "9876543210",
      companyName: "Asha Works",
      location: "Pune",
    };
    for (const step of HEALTH_CHECK_STEPS) {
      for (const question of step.questions) {
        draft.answers[question.id] = question.options[0].value;
      }
    }

    const createPayload = buildHealthCheckDraftCreate(draft);
    expect(createPayload.contact).toHaveProperty("location", "Pune");
    expect(createPayload.contact).not.toHaveProperty("city");
    expect(createPayload).toEqual(expect.objectContaining({
      followUpPreference: "NO_FOLLOW_UP",
      website: "",
      idempotencyKey: expect.any(String),
    }));
    expect(createPayload).not.toHaveProperty("schemaVersion");
    expect(createPayload).not.toHaveProperty("answers");
    expect(createPayload).not.toHaveProperty("consentToContact");

    const updatePayload = buildHealthCheckDraftUpdate(draft, 3);
    expect(updatePayload.schemaVersion).toBe(HEALTH_CHECK_SCHEMA_VERSION);
    expect(updatePayload.answers).toHaveLength(7);
    expect(updatePayload).toEqual(expect.objectContaining({
      followUpPreference: "NO_FOLLOW_UP",
      expectedRevision: 3,
      projectionInputs: {
        workingDaysPerMonth: 26,
      },
    }));
    expect(updatePayload).not.toHaveProperty("contact");
    expect(updatePayload).not.toHaveProperty("idempotencyKey");
    expect(createPayload.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("serializes the working-days input exactly and omits the optional object when blank", () => {
    const draft = createHealthCheckDraft();
    for (const step of HEALTH_CHECK_STEPS) {
      for (const question of step.questions) draft.answers[question.id] = question.options[0].value;
    }
    draft.projectionInputs = { workingDaysPerMonth: "24" };
    expect(buildHealthCheckDraftUpdate(draft, 0).projectionInputs).toEqual({
      workingDaysPerMonth: 24,
    });

    draft.projectionInputs = { workingDaysPerMonth: "" };
    expect(buildHealthCheckDraftUpdate(draft, 0)).not.toHaveProperty("projectionInputs");

    draft.projectionInputs = { workingDaysPerMonth: "19" };
    expect(() => buildHealthCheckDraftUpdate(draft, 0)).toThrow("projection inputs are invalid");
    expect(() => buildHealthCheckDraftUpdate(draft, -1)).toThrow("revision is invalid");
  });

  it("serializes finalized admin list query names and values", () => {
    expect(buildHealthCheckLeadFilters({
      page: 2,
      query: "Asha Works",
      priority: "HIGH_OPPORTUNITY",
      primaryArea: "INVENTORY",
      status: "QUALIFIED",
      createdFrom: "2026-10-01",
      createdTo: "2026-10-02",
      consent: "YES",
    })).toEqual({
      page: 2,
      size: 20,
      sortBy: "createdAt",
      sortDirection: "DESC",
      query: "Asha Works",
      priority: "HIGH_OPPORTUNITY",
      primaryArea: "INVENTORY",
      status: "QUALIFIED",
      createdFrom: "2026-10-01T00:00:00",
      createdTo: "2026-10-02T23:59:59",
      consent: true,
    });
  });
});
