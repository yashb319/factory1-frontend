import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoadTestingDashboard } from "../components/LoadTestingDashboard";
import {
  buildLoadTestStartBody,
  formatMetric,
  isCancellableStatus,
  isTerminalStatus,
} from "../lib/loadTesting";
import type {
  ApiResponse,
  LoadTestCatalog,
  LoadTestRunDetail,
  LoadTestRunSummary,
  PageResponse,
} from "../types/loadTesting.types";

const mocks = vi.hoisted(() => ({
  cachedStatus: undefined as LoadTestRunDetail["status"] | undefined,
  catalogHook: vi.fn(),
  historyHook: vi.fn(),
  detailHook: vi.fn(),
  startMutation: vi.fn(),
  cancelMutation: vi.fn(),
  startTrigger: vi.fn(),
  cancelTrigger: vi.fn(),
}));

vi.mock("@/lib/hook", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { user: { platformAdmin: true } } }),
}));

vi.mock("../api/loadTestingApi", () => ({
  loadTestingApi: {
    endpoints: {
      getLoadTestRun: {
        select: () => () => ({
          data: mocks.cachedStatus
            ? { data: { status: mocks.cachedStatus } }
            : undefined,
        }),
      },
    },
  },
  useGetLoadTestCatalogQuery: mocks.catalogHook,
  useGetLoadTestRunsQuery: mocks.historyHook,
  useGetLoadTestRunQuery: mocks.detailHook,
  useStartLoadTestMutation: mocks.startMutation,
  useCancelLoadTestMutation: mocks.cancelMutation,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Line: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const catalog: LoadTestCatalog = {
  available: true,
  unavailableReason: null,
  maxVirtualUsers: 500,
  maxDurationSeconds: 900,
  maxConcurrentRuns: 1,
  profiles: [
    {
      profile: "SMOKE",
      virtualUsers: 10,
      rampSeconds: 30,
      durationSeconds: 120,
    },
    {
      profile: "TARGET",
      virtualUsers: 250,
      rampSeconds: 300,
      durationSeconds: 900,
    },
    {
      profile: "STRESS",
      virtualUsers: 500,
      rampSeconds: 300,
      durationSeconds: 900,
    },
    {
      profile: "SPIKE",
      virtualUsers: 250,
      rampSeconds: 10,
      durationSeconds: 300,
    },
  ],
  scenarios: ["API_HEALTH", "DASHBOARD"],
  thresholds: {
    maximumErrorRate: 0.01,
    maximumP95Ms: 750,
    maximumP99Ms: 1500,
    minimumCompletionRate: 0.95,
  },
};

const summary: LoadTestRunSummary = {
  id: "run-1",
  status: "RUNNING",
  profile: "SMOKE",
  scenario: "API_HEALTH",
  requestedVirtualUsers: 10,
  rampSeconds: 30,
  durationSeconds: 120,
  requestedBy: "admin-1",
  createdAt: "2026-10-03T12:00:00Z",
  startedAt: "2026-10-03T12:00:05Z",
  completedAt: null,
  capacityStatus: null,
  errorRate: null,
  latencyP95Ms: null,
};

const nullMetrics: LoadTestRunDetail["metrics"] = {
  requestCount: null,
  completedIterations: null,
  failedRequests: null,
  errorRate: null,
  requestsPerSecond: null,
  completionRate: null,
  latencyP50Ms: null,
  latencyP95Ms: null,
  latencyP99Ms: null,
  latencyMaxMs: null,
  dbPoolActive: null,
  dbPoolIdle: null,
  dbPoolPending: null,
  slowQueryCount: null,
  databaseMetricsAvailable: false,
};

const detail: LoadTestRunDetail = {
  ...summary,
  queuedAt: "2026-10-03T12:00:02Z",
  cancelledAt: null,
  metrics: nullMetrics,
  capacityReport: null,
  failureMessage: null,
  samples: [
    {
      eventKey: "event-1",
      observedAt: "2026-10-03T12:00:10Z",
      status: "RUNNING",
      activeVirtualUsers: null,
      metrics: nullMetrics,
    },
  ],
};

function response<T>(data: T): ApiResponse<T> {
  return { success: true, message: "ok", data };
}

function historyResponse(
  content: LoadTestRunSummary[] = []
): ApiResponse<PageResponse<LoadTestRunSummary>> {
  return response({
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
  });
}

function queryResult<T>(data?: T) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  };
}

beforeEach(() => {
  mocks.cachedStatus = undefined;
  mocks.startTrigger.mockReset();
  mocks.cancelTrigger.mockReset();
  mocks.catalogHook.mockReset();
  mocks.historyHook.mockReset();
  mocks.detailHook.mockReset();
  mocks.startMutation.mockReset();
  mocks.cancelMutation.mockReset();

  mocks.catalogHook.mockReturnValue(queryResult(response(catalog)));
  mocks.historyHook.mockReturnValue(queryResult(historyResponse()));
  mocks.detailHook.mockReturnValue(queryResult());
  mocks.startMutation.mockReturnValue([
    mocks.startTrigger,
    { isLoading: false },
  ]);
  mocks.cancelMutation.mockReturnValue([
    mocks.cancelTrigger,
    { isLoading: false },
  ]);
});

describe("load-testing contract helpers", () => {
  it("builds a bounded start body without any target field", () => {
    const body = buildLoadTestStartBody({
      profile: "SMOKE",
      scenario: "API_HEALTH",
      virtualUsers: 10,
      rampSeconds: 30,
      durationSeconds: 120,
    });

    expect(body).toEqual({
      profile: "SMOKE",
      scenario: "API_HEALTH",
      virtualUsers: 10,
      rampSeconds: 30,
      durationSeconds: 120,
    });
    expect(body).not.toHaveProperty("target");
    expect(body).not.toHaveProperty("targetUrl");
  });

  it("uses explicit terminal and cancellable status sets", () => {
    expect(isTerminalStatus("COMPLETED")).toBe(true);
    expect(isTerminalStatus("CANCEL_REQUESTED")).toBe(false);
    expect(isCancellableStatus("QUEUED")).toBe(true);
    expect(isCancellableStatus("RUNNING")).toBe(true);
    expect(isCancellableStatus("DISPATCHING")).toBe(false);
  });

  it("renders null metrics as unavailable instead of zero", () => {
    expect(formatMetric(null)).toBe("Unavailable");
    expect(formatMetric(0)).toBe("0");
  });
});

describe("LoadTestingDashboard", () => {
  it("shows the exact safe unavailable reason and disables starting", () => {
    mocks.catalogHook.mockReturnValue(
      queryResult(
        response({
          ...catalog,
          available: false,
          unavailableReason: "Load testing is disabled or incompletely configured",
        })
      )
    );

    render(<LoadTestingDashboard />);

    expect(
      screen.getByText("Load testing is disabled or incompletely configured")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review and start" })
    ).toBeDisabled();
    expect(screen.queryByLabelText(/target url/i)).not.toBeInTheDocument();
  });

  it("requires confirmation and sends only the reviewed safe body", async () => {
    const user = userEvent.setup();
    mocks.startTrigger.mockReturnValue({
      unwrap: () => Promise.resolve(response({ ...detail, status: "QUEUED" })),
    });

    render(<LoadTestingDashboard />);
    await user.click(screen.getByRole("button", { name: "Review and start" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Confirm load-test dispatch")
    ).toBeInTheDocument();
    expect(mocks.startTrigger).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: "Confirm and start" })
    );

    await waitFor(() =>
      expect(mocks.startTrigger).toHaveBeenCalledWith({
        profile: "SMOKE",
        scenario: "API_HEALTH",
        virtualUsers: 10,
        rampSeconds: 30,
        durationSeconds: 120,
      })
    );
    expect(mocks.startTrigger.mock.calls[0][0]).not.toHaveProperty("target");
  });

  it("polls a nonterminal selected run and stops polling a terminal run", async () => {
    const user = userEvent.setup();
    mocks.historyHook.mockReturnValue(queryResult(historyResponse([summary])));
    mocks.detailHook.mockImplementation((runId: string) =>
      queryResult(runId ? response(detail) : undefined)
    );

    const { rerender } = render(<LoadTestingDashboard />);
    await user.click(screen.getByRole("button", { name: /view smoke api health/i }));

    expect(mocks.detailHook).toHaveBeenLastCalledWith(
      "run-1",
      expect.objectContaining({ pollingInterval: 4000 })
    );

    mocks.cachedStatus = "COMPLETED";
    mocks.detailHook.mockImplementation((runId: string) =>
      queryResult(
        runId
          ? response({
              ...detail,
              status: "COMPLETED",
              completedAt: "2026-10-03T12:02:05Z",
            })
          : undefined
      )
    );
    rerender(<LoadTestingDashboard />);

    expect(mocks.detailHook).toHaveBeenLastCalledWith(
      "run-1",
      expect.objectContaining({ pollingInterval: 0 })
    );
  });

  it("gates one-point charts, renders unavailable metrics, and surfaces cancellation errors", async () => {
    const user = userEvent.setup();
    mocks.historyHook.mockReturnValue(queryResult(historyResponse([summary])));
    mocks.detailHook.mockImplementation((runId: string) =>
      queryResult(runId ? response(detail) : undefined)
    );
    mocks.cancelTrigger.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { message: "Runner does not support cancellation" },
        }),
    });

    render(<LoadTestingDashboard />);
    await user.click(screen.getByRole("button", { name: /view smoke api health/i }));

    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(5);
    expect(
      screen.getAllByText(/waiting for at least two metric samples/i)
    ).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      await screen.findByText("Runner does not support cancellation")
    ).toBeInTheDocument();
  });

  it("renders the deterministic capacity report and database caveat", async () => {
    const user = userEvent.setup();
    const completed: LoadTestRunDetail = {
      ...detail,
      status: "COMPLETED",
      completedAt: "2026-10-03T12:02:05Z",
      capacityReport: {
        status: "WARN",
        summary: "Near the configured p95 limit",
        interpretation: "Recorded p95 latency was within 20% of the limit.",
        thresholds: catalog.thresholds,
        findings: ["p95 latency is close to the configured maximum"],
        databaseMetricsAvailable: false,
      },
    };
    mocks.historyHook.mockReturnValue(
      queryResult(
        historyResponse([
          { ...summary, status: "COMPLETED", capacityStatus: "WARN" },
        ])
      )
    );
    mocks.detailHook.mockImplementation((runId: string) =>
      queryResult(runId ? response(completed) : undefined)
    );

    render(<LoadTestingDashboard />);
    await user.click(screen.getByRole("button", { name: /view smoke api health/i }));

    expect(
      screen.getByText("Deterministic recorded-metric interpretation")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/database pool and slow-query metrics were unavailable/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/^AI /i)).not.toBeInTheDocument();
  });
});
