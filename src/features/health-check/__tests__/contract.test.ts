import { describe, expect, it } from "vitest";
import { HEALTH_CHECK_SCHEMA_VERSION, HEALTH_CHECK_STEPS } from "../config";
import { buildHealthCheckSubmission } from "../submission";
import { createHealthCheckDraft } from "../storage";
import { buildHealthCheckLeadFilters } from "../adminFilters";

const canonicalQuestions = {
  factory_size: ["MICRO", "SMALL", "MEDIUM", "LARGE"],
  employee_records: ["PAPER", "SPREADSHEET", "MULTIPLE_TOOLS", "CENTRAL_SYSTEM"],
  attendance_payroll: ["MANUAL", "PARTLY_DIGITAL", "SEPARATE_SYSTEMS", "INTEGRATED"],
  employee_compliance: ["REACTIVE", "CALENDAR", "OUTSOURCED", "SYSTEM_TRACKED"],
  production_tracking: ["PAPER", "SPREADSHEET", "BASIC_SOFTWARE", "REAL_TIME_SYSTEM"],
  downtime_visibility: ["NOT_TRACKED", "VERBAL", "MANUAL_LOG", "SYSTEM_TRACKED"],
  quality_tracking: ["REACTIVE", "PAPER_CHECKS", "SPREADSHEET", "SYSTEM_TRACKED"],
  inventory_tracking: ["VISUAL", "PAPER", "SPREADSHEET", "SYSTEM_TRACKED"],
  stock_accuracy: ["LOW", "VARIABLE", "MOSTLY_ACCURATE", "REAL_TIME"],
  reorder_planning: ["SHORTAGE_DRIVEN", "EXPERIENCE", "MIN_MAX_SHEET", "AUTOMATED"],
  costing_visibility: ["UNKNOWN", "ESTIMATED", "SPREADSHEET", "SYSTEM_CALCULATED"],
  receivables_tracking: ["MEMORY", "PAPER", "SPREADSHEET", "SYSTEM_TRACKED"],
  statutory_compliance: ["REACTIVE", "MANUAL_CALENDAR", "ACCOUNTANT_LED", "SYSTEM_TRACKED"],
  reporting_frequency: ["ON_REQUEST", "MONTHLY", "WEEKLY", "REAL_TIME"],
  reports_effort: ["DAYS", "HOURS", "UNDER_HOUR", "AUTOMATED"],
  data_fragmentation: ["PAPER_AND_FILES", "MANY_SPREADSHEETS", "SEPARATE_APPS", "ONE_PLATFORM"],
  software_usage: ["NONE", "ACCOUNTING_ONLY", "FEW_TOOLS", "ERP"],
  implementation_timeline: ["NOW", "ONE_TO_THREE_MONTHS", "THREE_TO_SIX_MONTHS", "EXPLORING"],
};

describe("finalized health check contract", () => {
  it("matches all 18 canonical question IDs and option values", () => {
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

  it("serializes the exact public submission shape", () => {
    const draft = createHealthCheckDraft();
    draft.contact = {
      name: "Asha Rao",
      email: "asha@example.com",
      phone: "9876543210",
      companyName: "Asha Works",
      location: "Pune",
    };
    draft.consentToContact = true;
    draft.followUpPreference = "NO_FOLLOW_UP";
    for (const step of HEALTH_CHECK_STEPS) {
      for (const question of step.questions) {
        draft.answers[question.id] = question.options[0].value;
      }
    }

    const payload = buildHealthCheckSubmission(draft);
    expect(payload.schemaVersion).toBe(HEALTH_CHECK_SCHEMA_VERSION);
    expect(payload.answers).toHaveLength(18);
    expect(payload.contact).toHaveProperty("location", "Pune");
    expect(payload.contact).not.toHaveProperty("city");
    expect(payload).toEqual(expect.objectContaining({
      consentToContact: true,
      followUpPreference: "NO_FOLLOW_UP",
      website: "",
      formStartedAtEpochMs: expect.any(Number),
      idempotencyKey: expect.any(String),
      projectionInputs: {
        workingDaysPerMonth: 26,
        loadedHourlyLabourCostInr: 250,
      },
    }));
    expect(payload).not.toHaveProperty("startedAt");
    expect(payload.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("serializes custom projection inputs exactly and omits the whole optional object when blank", () => {
    const draft = createHealthCheckDraft();
    for (const step of HEALTH_CHECK_STEPS) {
      for (const question of step.questions) draft.answers[question.id] = question.options[0].value;
    }
    draft.projectionInputs = { workingDaysPerMonth: "24", loadedHourlyLabourCostInr: "375.50" };
    expect(buildHealthCheckSubmission(draft).projectionInputs).toEqual({
      workingDaysPerMonth: 24,
      loadedHourlyLabourCostInr: 375.5,
    });

    draft.projectionInputs = { workingDaysPerMonth: "", loadedHourlyLabourCostInr: "" };
    expect(buildHealthCheckSubmission(draft)).not.toHaveProperty("projectionInputs");

    draft.projectionInputs = { workingDaysPerMonth: "19", loadedHourlyLabourCostInr: "250" };
    expect(() => buildHealthCheckSubmission(draft)).toThrow("projection inputs are invalid");
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
