import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HealthCheckLandingCta } from "../components/HealthCheckLandingCta";
import { HealthCheckResultView } from "../components/HealthCheckResultView";
import { healthCheckResult, savingsProjection } from "./testData";

describe("health check presentation", () => {
  it("keeps a permanent landing-page CTA", () => {
    render(<HealthCheckLandingCta />);
    expect(screen.getByRole("link", { name: /start health check/i })).toHaveAttribute("href", "/health-check");
  });

  it("renders safe answer-derived result content without internal scores", () => {
    render(
      <HealthCheckResultView result={{
        ...healthCheckResult,
        keyFindings: [...healthCheckResult.keyFindings, "This fifth finding is not shown."],
      }} />
    );

    expect(screen.getByRole("heading", { name: /inventory management/i })).toBeInTheDocument();
    expect(screen.getByText("Stock records are updated manually.")).toBeInTheDocument();
    expect(screen.queryByText("This fifth finding is not shown.")).not.toBeInTheDocument();
    expect(screen.queryByText(/numeric score|admin status/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/report (?:was|has been) (?:sent|emailed)|email (?:was|has been) sent/i)).not.toBeInTheDocument();
  });

  it("renders answer-grounded value statements and cautious monthly-hour ranges without money", () => {
    render(<HealthCheckResultView result={healthCheckResult} />);

    expect(screen.getByText(/stock receipts and usage become easier to trace/i)).toBeInTheDocument();
    expect(screen.getByText(/owners can check the same structured update/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Inventory: 32–68 hours possible per month")).toBeInTheDocument();
    expect(screen.getByText("44–96 hours")).toBeInTheDocument();
    expect(screen.getByText(/not a promised result/i)).toBeInTheDocument();
    expect(screen.queryByText(/₹|time-cost|labour cost|cash savings|payback|roi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/factory size band|realization factor|projection model/i)).not.toBeInTheDocument();
  });

  it("shows a useful low-opportunity state instead of misleading bars", () => {
    render(
      <HealthCheckResultView
        result={{
          ...healthCheckResult,
          savingsProjection: {
            ...savingsProjection,
            modules: savingsProjection.modules.map((module) => ({
              ...module,
              estimatedHoursSavedPerMonth: { min: 0, max: 0 },
            })),
          },
        }}
      />
    );

    expect(screen.getByRole("heading", { name: /start with the operating improvements above/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/possible monthly hours available by module/i)).not.toBeInTheDocument();
  });

  it("handles historical results without a projection", () => {
    render(<HealthCheckResultView result={{ ...healthCheckResult, savingsProjection: null }} />);
    expect(screen.getByRole("heading", { name: /make stock changes easier to trace/i })).toBeInTheDocument();
    expect(screen.queryByText(/snapshot unavailable/i)).not.toBeInTheDocument();
  });
});
