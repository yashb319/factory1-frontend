import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HealthCheckResultPage } from "../components/HealthCheckResultPage";
import { healthCheckResult } from "./testData";

const getResult = vi.fn();

vi.mock("../api/healthCheckApi", () => ({
  useGetHealthCheckResultQuery: (...args: unknown[]) => getResult(...args),
}));

describe("HealthCheckResultPage", () => {
  it("renders the persisted projection returned for the safe token on refresh", () => {
    getResult.mockReturnValue({
      data: { data: healthCheckResult },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<HealthCheckResultPage token="persisted-safe-token" />);
    expect(getResult).toHaveBeenCalledWith("persisted-safe-token");
    expect(screen.getByLabelText("Inventory: 32–68 hours projected per month")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes(healthCheckResult.savingsProjection?.disclaimer ?? "missing"))).toBeInTheDocument();
  });
});
