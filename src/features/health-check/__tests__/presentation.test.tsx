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

  it("renders accessible module ranges, overall arithmetic, assumptions, and the exact disclaimer", () => {
    render(<HealthCheckResultView result={healthCheckResult} />);

    expect(screen.getByLabelText("Inventory: 32–68 hours projected per month")).toBeInTheDocument();
    expect(screen.getByText("44–96 hours")).toBeInTheDocument();
    expect(screen.getByText("₹11,000–₹24,000")).toBeInTheDocument();
    expect(screen.getByText("Medium (51–200 people)")).toBeInTheDocument();
    expect(screen.getByText("40–70%")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes(savingsProjection.disclaimer))).toBeInTheDocument();
    expect(screen.getAllByText(/time-cost equivalent/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not a forecast or guarantee/i)).toBeInTheDocument();
    expect(screen.queryByText(/hours saved \/ year|equivalent \/ year/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/payback|roi/i)).not.toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: /less obvious manual effort/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/projected monthly hours saved by module/i)).not.toBeInTheDocument();
  });

  it("handles historical results without a projection", () => {
    render(<HealthCheckResultView result={{ ...healthCheckResult, savingsProjection: null }} />);
    expect(screen.getByRole("heading", { name: /savings snapshot unavailable/i })).toBeInTheDocument();
  });
});
