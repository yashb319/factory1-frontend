import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HealthCheckLeadsPage } from "../components/HealthCheckLeadsPage";
import { healthCheckResult } from "./testData";

const getLeads = vi.fn();
const getLead = vi.fn();

vi.mock("@/lib/hook", () => ({
  useAppSelector: () => ({ platformAdmin: true }),
}));

vi.mock("../api/healthCheckApi", () => ({
  useGetHealthCheckLeadsQuery: (...args: unknown[]) => getLeads(...args),
  useGetHealthCheckLeadQuery: (...args: unknown[]) => getLead(...args),
  useUpdateHealthCheckLeadMutation: () => [vi.fn(), { isLoading: false }],
}));

describe("HealthCheckLeadsPage", () => {
  beforeEach(() => {
    getLeads.mockReset();
    getLead.mockReset();
    getLead.mockReturnValue({ isLoading: false });
  });

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

  it("shows submitted assumptions and the exact persisted projection in lead detail", async () => {
    getLeads.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        data: {
          content: [{
            id: "lead-1",
            createdAt: "2026-10-03T00:00:00Z",
            name: "Asha Rao",
            email: "asha@example.com",
            phone: "9876543210",
            companyName: "Asha Works",
            location: "Pune",
            consentToContact: false,
            followUpPreference: "NO_FOLLOW_UP",
            primaryArea: "INVENTORY",
            priority: "HIGH_OPPORTUNITY",
            status: "NEW",
          }],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        },
      },
    });
    getLead.mockReturnValue({
      isLoading: false,
      data: {
        data: {
          id: "lead-1",
          createdAt: "2026-10-03T00:00:00Z",
          updatedAt: "2026-10-03T00:00:00Z",
          schemaVersion: "2026-10-01",
          contact: {
            name: "Asha Rao",
            email: "asha@example.com",
            phone: "9876543210",
            companyName: "Asha Works",
            location: "Pune",
          },
          consentToContact: false,
          followUpPreference: "NO_FOLLOW_UP",
          answers: [],
          engineVersion: "1",
          primaryArea: "INVENTORY",
          priority: "HIGH_OPPORTUNITY",
          result: healthCheckResult,
          status: "NEW",
        },
      },
    });

    render(<HealthCheckLeadsPage />);
    screen.getByRole("row", { name: /asha rao/i }).click();

    expect(await screen.findByRole("heading", { name: "Submitted savings projection" })).toBeInTheDocument();
    expect(screen.getByText(/marketing or sales follow-up consent: not explicitly provided/i)).toBeInTheDocument();
    expect(screen.getByText("Medium (51–200 people)")).toBeInTheDocument();
    expect(screen.getByText("26")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes(healthCheckResult.savingsProjection?.disclaimer ?? "missing"))).toBeInTheDocument();
  });
});
