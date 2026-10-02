import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HealthCheckLandingCta } from "../components/HealthCheckLandingCta";
import { HealthCheckResultView } from "../components/HealthCheckResultView";

describe("health check presentation", () => {
  it("keeps a permanent landing-page CTA", () => {
    render(<HealthCheckLandingCta />);
    expect(screen.getByRole("link", { name: /start health check/i })).toHaveAttribute("href", "/health-check");
  });

  it("renders safe answer-derived result content without internal scores", () => {
    render(
      <HealthCheckResultView result={{
        resultToken: "safe-token",
        primaryArea: "INVENTORY",
        priority: "HIGH_OPPORTUNITY",
        recommendedModules: ["Inventory", "Production"],
        secondaryAreas: ["PRODUCTION"],
        keyFindings: ["Stock records are updated manually.", "Reordering starts after shortages.", "Production and stock are disconnected.", "Counts often differ.", "This fifth finding is not shown."],
        explanation: "Connected stock movements can give your team earlier warning of shortages.",
      }} />
    );

    expect(screen.getByRole("heading", { name: /inventory management/i })).toBeInTheDocument();
    expect(screen.getByText("Stock records are updated manually.")).toBeInTheDocument();
    expect(screen.queryByText("This fifth finding is not shown.")).not.toBeInTheDocument();
    expect(screen.queryByText(/numeric score|admin status/i)).not.toBeInTheDocument();
  });
});
