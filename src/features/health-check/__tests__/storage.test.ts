import { describe, expect, it } from "vitest";
import {
  HEALTH_CHECK_DRAFT_KEY,
  LEGACY_HEALTH_CHECK_DRAFT_KEY,
  WELCOME_DISMISSAL_COOLDOWN_MS,
  completeWelcome,
  createHealthCheckDraft,
  dismissWelcome,
  loadHealthCheckDraft,
  saveHealthCheckDraft,
  shouldShowWelcome,
} from "../storage";

describe("health check storage", () => {
  it("round-trips the current draft version", () => {
    const draft = createHealthCheckDraft();
    draft.step = 3;
    draft.answers.stock_control = "PAPER";
    draft.remoteDraft = {
      draftId: "11111111-1111-4111-8111-111111111111",
      draftToken: "opaque-token",
      status: "DRAFT",
      revision: 2,
      createdAt: "2026-10-04T00:00:00Z",
      updatedAt: "2026-10-04T00:01:00Z",
    };
    saveHealthCheckDraft(draft);

    expect(loadHealthCheckDraft()).toMatchObject({
      version: draft.version,
      step: 3,
      answers: { stock_control: "PAPER" },
      remoteDraft: {
        draftToken: "opaque-token",
        revision: 2,
      },
      projectionInputs: {
        workingDaysPerMonth: "26",
      },
    });
  });

  it("keeps safe legacy draft fields while removing obsolete consent state", () => {
    const draft = createHealthCheckDraft();
    localStorage.setItem(LEGACY_HEALTH_CHECK_DRAFT_KEY, JSON.stringify({
        ...draft,
        version: 5,
        step: 0,
        answers: { production_visibility: "BOARD_OR_PAPER" },
        projectionInputs: {
          workingDaysPerMonth: "24",
          loadedHourlyLabourCostInr: "375",
        },
        consentToContact: true,
        followUpPreference: "EMAIL",
    }));

    expect(loadHealthCheckDraft()).toEqual({
      ...draft,
      step: 0,
      answers: { production_visibility: "BOARD_OR_PAPER" },
      projectionInputs: { workingDaysPerMonth: "24" },
    });
    expect(localStorage.getItem(LEGACY_HEALTH_CHECK_DRAFT_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(HEALTH_CHECK_DRAFT_KEY) ?? "{}")).not.toHaveProperty(
      "projectionInputs.loadedHourlyLabourCostInr"
    );
  });

  it("discards corrupt and obsolete drafts", () => {
    localStorage.setItem(HEALTH_CHECK_DRAFT_KEY, "{bad json");
    expect(loadHealthCheckDraft()).toBeNull();
    expect(localStorage.getItem(HEALTH_CHECK_DRAFT_KEY)).toBeNull();

    localStorage.setItem(HEALTH_CHECK_DRAFT_KEY, JSON.stringify({ ...createHealthCheckDraft(), version: 0 }));
    expect(loadHealthCheckDraft()).toBeNull();
  });

  it("reopens after the documented 14-day dismissal cooldown but not after completion", () => {
    const now = Date.now();
    dismissWelcome(localStorage, now);
    expect(shouldShowWelcome(localStorage, now + WELCOME_DISMISSAL_COOLDOWN_MS - 1)).toBe(false);
    expect(shouldShowWelcome(localStorage, now + WELCOME_DISMISSAL_COOLDOWN_MS)).toBe(true);

    completeWelcome(localStorage, now);
    expect(shouldShowWelcome(localStorage, now + WELCOME_DISMISSAL_COOLDOWN_MS * 10)).toBe(false);
  });
});
