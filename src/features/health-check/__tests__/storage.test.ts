import { describe, expect, it } from "vitest";
import {
  HEALTH_CHECK_DRAFT_KEY,
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
    draft.answers.inventory_tracking = "MANUAL";
    saveHealthCheckDraft(draft);

    expect(loadHealthCheckDraft()).toMatchObject({
      version: draft.version,
      step: 3,
      answers: { inventory_tracking: "MANUAL" },
      projectionInputs: {
        workingDaysPerMonth: "26",
        loadedHourlyLabourCostInr: "250",
      },
    });
  });

  it("keeps safe legacy draft fields while removing obsolete consent state", () => {
    const draft = createHealthCheckDraft();
    localStorage.setItem(HEALTH_CHECK_DRAFT_KEY, JSON.stringify({
        ...draft,
        step: 2,
        answers: { production_tracking: "PAPER" },
        consentToContact: true,
        followUpPreference: "EMAIL",
    }));

    expect(loadHealthCheckDraft()).toEqual({
      ...draft,
      step: 2,
      answers: { production_tracking: "PAPER" },
    });
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
