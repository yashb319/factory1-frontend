import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HealthCheckLeadsPage } from "../components/HealthCheckLeadsPage";

const getLeads = vi.fn();

vi.mock("@/lib/hook", () => ({
  useAppSelector: () => ({ platformAdmin: true }),
}));

vi.mock("../api/healthCheckApi", () => ({
  useGetHealthCheckLeadsQuery: (...args: unknown[]) => getLeads(...args),
  useGetHealthCheckLeadQuery: () => ({ isLoading: false }),
  useUpdateHealthCheckLeadMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("HealthCheckLeadsPage", () => {
  beforeEach(() => getLeads.mockReset());

  it("shows API loading and error states", () => {
    getLeads.mockReturnValue({ isLoading: true, isError: false, refetch: vi.fn() });
    const { rerender } = render(<HealthCheckLeadsPage />);
    expect(screen.getByLabelText("Loading health check leads")).toBeInTheDocument();

    getLeads.mockReturnValue({ isLoading: false, isError: true, refetch: vi.fn() });
    rerender(<HealthCheckLeadsPage />);
    expect(screen.getByText("Health check leads could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("passes server pagination and filter state to the API hook", () => {
    getLeads.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: { data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } },
    });
    render(<HealthCheckLeadsPage />);
    expect(getLeads).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 20, sortBy: "createdAt", sortDirection: "DESC" }),
      { skip: false }
    );
    expect(screen.getByText("No health check leads match these filters.")).toBeInTheDocument();
  });
});
