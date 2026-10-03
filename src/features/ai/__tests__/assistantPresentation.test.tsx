import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  EmptyAssistant,
  OWNER_BRIEFING_QUESTIONS,
} from "../components/AiAssistantPage";
import { AiMessageContent } from "../components/AiMessageContent";

describe("owner-oriented assistant presentation", () => {
  it("promotes valuable daily briefing questions without unsupported gimmicks", async () => {
    const onAsk = vi.fn();
    render(
      <EmptyAssistant
        questions={[]}
        loading={false}
        error
        onAsk={onAsk}
      />
    );

    for (const question of OWNER_BRIEFING_QUESTIONS) {
      expect(screen.getByRole("button", { name: new RegExp(question, "i") })).toBeInTheDocument();
    }
    expect(screen.queryByText(/machine maintenance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delivery risk/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/purchase request/i)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /how is my factory doing today/i })
    );
    expect(onAsk).toHaveBeenCalledWith("How is my factory doing today?");
  });

  it("renders accessible ranked briefing signals and provenance before visualizations", () => {
    render(
      <AiMessageContent
        snapshot={{
          metrics: [
            { label: "Low stock", value: "3 items", tone: "danger" },
            { label: "Absence", value: "4 people", tone: "warning" },
            { label: "Sales", value: "Up 14%", tone: "good" },
          ],
          suggestions: [],
          provider: "provider",
          fallback: false,
          provenance: {
            module: "GENERAL",
            summary: "Live owner briefing",
            period: "Today",
            recordCount: 12,
          },
        }}
      />
    );

    expect(screen.getByText("Live owner briefing")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner briefing signals")).toBeInTheDocument();
    expect(screen.getByText(/critical · low stock/i)).toBeInTheDocument();
    expect(screen.getByText(/watch · absence/i)).toBeInTheDocument();
    expect(screen.getByText(/positive · sales/i)).toBeInTheDocument();
  });

  it("keeps historical action proposals display-only", () => {
    const onApply = vi.fn();
    render(
      <AiMessageContent
        historical
        onApplyAction={onApply}
        snapshot={{
          metrics: [],
          suggestions: [],
          provider: "provider",
          fallback: false,
          provenance: null,
          actions: [
            {
              id: "a1",
              module: "inventory",
              recordId: "i1",
              recordLabel: "Steel",
              field: "minimumStock",
              currentValue: "10",
              newValue: "20",
              confirmationText: "Raise the reorder level",
            },
          ],
        }}
      />
    );

    expect(screen.getByText(/cannot be replayed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update/i })).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
});
