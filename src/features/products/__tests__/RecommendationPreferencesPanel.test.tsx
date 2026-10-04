import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecommendationPreferencesPanel } from "../components/RecommendationPreferencesPanel";

describe("RecommendationPreferencesPanel", () => {
  it("preserves consent and saves only after explicit confirmation", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <RecommendationPreferencesPanel
        preferences={{
          inAppEnabled: true,
          emailEnabled: false,
          minimumSeverity: "WARNING",
        }}
        loading={false}
        saving={false}
        onRetry={vi.fn()}
        onSave={onSave}
      />
    );

    const save = screen.getByRole("button", { name: "Save preferences" });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole("switch", { name: "Email notifications" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(save).toBeEnabled();
    await user.click(save);

    expect(onSave).toHaveBeenCalledWith({
      inAppEnabled: true,
      emailEnabled: true,
      minimumSeverity: "WARNING",
    });
  });

  it("shows load and save errors explicitly", () => {
    const { rerender } = render(
      <RecommendationPreferencesPanel
        loading={false}
        saving={false}
        error="Preferences unavailable"
        onRetry={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Preferences unavailable"
    );

    rerender(
      <RecommendationPreferencesPanel
        preferences={{
          inAppEnabled: true,
          emailEnabled: false,
          minimumSeverity: "WARNING",
        }}
        loading={false}
        saving={false}
        saveError="Consent update failed"
        onRetry={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Consent update failed"
    );
  });
});
