"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Database,
  Gauge,
  Loader2,
  Play,
  RefreshCw,
  ShieldAlert,
  Square,
  XCircle,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/lib/hook";
import { getErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import {
  loadTestingApi,
  useCancelLoadTestMutation,
  useGetLoadTestCatalogQuery,
  useGetLoadTestRunQuery,
  useGetLoadTestRunsQuery,
  useStartLoadTestMutation,
} from "../api/loadTestingApi";
import {
  buildLoadTestStartBody,
  formatDuration,
  formatMetric,
  formatPercent,
  humanize,
  isCancellableStatus,
  isTerminalStatus,
} from "../lib/loadTesting";
import type {
  CapacityReport,
  CapacityStatus,
  LoadTestCatalog,
  LoadTestMetrics,
  LoadTestProfile,
  LoadTestProfileConfig,
  LoadTestRunDetail,
  LoadTestRunSummary,
  LoadTestSample,
  LoadTestScenario,
  LoadTestStatus,
} from "../types/loadTesting.types";

const PAGE_SIZE = 20;
const LIVE_POLL_INTERVAL_MS = 4_000;

const PROFILE_COPY: Record<
  LoadTestProfile,
  { description: string; tone: string }
> = {
  SMOKE: {
    description: "Recommended first check for runner, callbacks, and basic stability.",
    tone: "border-emerald-300 bg-emerald-50/60",
  },
  NORMAL: {
    description: "A modest sustained workload for routine regression checks.",
    tone: "",
  },
  EXPECTED: {
    description: "Expected busy-period traffic before a release or scale change.",
    tone: "",
  },
  TARGET: {
    description: "Primary 250-user capacity target for readiness decisions.",
    tone: "border-blue-400 bg-blue-50/70",
  },
  STRESS: {
    description: "High-risk stress run. Use only in an isolated approved window.",
    tone: "border-amber-300 bg-amber-50/60",
  },
  SPIKE: {
    description: "Abrupt traffic ramp. Expect a sharp impact on systems and data flows.",
    tone: "border-amber-300 bg-amber-50/60",
  },
};

const SCENARIO_COPY: Record<LoadTestScenario, string> = {
  API_HEALTH: "Health and readiness endpoints; best for the first Smoke run.",
  AUTHENTICATION: "Repeated login and token issuance.",
  DASHBOARD: "Dashboard summaries and operational overview reads.",
  EMPLOYEE_MANAGEMENT: "Employee-management business journey.",
  ATTENDANCE: "Attendance workflows and related lookups.",
  PRODUCTION: "Production planning and execution journey.",
  INVENTORY: "Inventory availability and movement journey.",
  FULL_FACTORY_WORKFLOW: "Broad cross-module factory workflow with the widest impact.",
};

export function LoadTestingDashboard() {
  const user = useAppSelector((state) => state.auth.user);
  const platformAdmin = Boolean(user?.platformAdmin);
  const [page, setPage] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] =
    useState<LoadTestProfile>("SMOKE");
  const [selectedScenario, setSelectedScenario] =
    useState<LoadTestScenario>("API_HEALTH");
  const [virtualUsers, setVirtualUsers] = useState("10");
  const [rampSeconds, setRampSeconds] = useState("30");
  const [durationSeconds, setDurationSeconds] = useState("120");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const catalogQuery = useGetLoadTestCatalogQuery(undefined, {
    skip: !platformAdmin,
  });
  const catalog = catalogQuery.data?.data;
  const cachedSelectedRun = useAppSelector((state) =>
    selectedRunId
      ? loadTestingApi.endpoints.getLoadTestRun.select(selectedRunId)(state)
          .data?.data
      : undefined
  );
  const detailQuery = useGetLoadTestRunQuery(selectedRunId ?? "", {
    skip: !platformAdmin || !selectedRunId,
    pollingInterval:
      selectedRunId &&
      (!cachedSelectedRun || !isTerminalStatus(cachedSelectedRun.status))
        ? LIVE_POLL_INTERVAL_MS
        : 0,
    refetchOnFocus: true,
  });
  const selectedRun = detailQuery.data?.data;
  const live = Boolean(selectedRun && !isTerminalStatus(selectedRun.status));
  const historyQuery = useGetLoadTestRunsQuery(
    { page, size: PAGE_SIZE },
    {
      skip: !platformAdmin,
      pollingInterval: live ? LIVE_POLL_INTERVAL_MS : 0,
      refetchOnFocus: true,
    }
  );
  const [startLoadTest, startState] = useStartLoadTestMutation();
  const [cancelLoadTest, cancelState] = useCancelLoadTestMutation();

  if (!platformAdmin) {
    return (
      <AccessDenied />
    );
  }

  const draft = {
    profile: selectedProfile,
    scenario: selectedScenario,
    virtualUsers: Number(virtualUsers),
    rampSeconds: Number(rampSeconds),
    durationSeconds: Number(durationSeconds),
  };

  function requestStart() {
    const error = validateDraft(draft, catalog);
    setValidationError(error);
    setActionError(null);
    if (!error) setConfirmOpen(true);
  }

  async function confirmStart() {
    try {
      const response = await startLoadTest(buildLoadTestStartBody(draft)).unwrap();
      setSelectedRunId(response.data.id);
      setPage(0);
      setConfirmOpen(false);
      setActionError(null);
      toast.success("Load test accepted by the external runner");
    } catch (error) {
      const message = getErrorMessage(error, "Could not start the load test");
      setActionError(message);
      setConfirmOpen(false);
      toast.error(message);
    }
  }

  async function cancelRun() {
    if (!selectedRun || !isCancellableStatus(selectedRun.status)) return;
    try {
      const response = await cancelLoadTest(selectedRun.id).unwrap();
      setActionError(null);
      toast.success(
        response.data.status === "CANCEL_REQUESTED"
          ? "Cancellation requested"
          : response.message
      );
    } catch (error) {
      const message = getErrorMessage(error, "Could not cancel the load test");
      setActionError(message);
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-6 w-6 text-blue-700" aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Load Testing
            </h1>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-[var(--factory1-text-secondary)]">
            Dispatch bounded k6 workloads through the externally configured
            runner and review persisted, deterministic capacity evidence.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void catalogQuery.refetch();
            void historyQuery.refetch();
            if (selectedRunId) void detailQuery.refetch();
          }}
          disabled={
            catalogQuery.isFetching ||
            historyQuery.isFetching ||
            detailQuery.isFetching
          }
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              (catalogQuery.isFetching ||
                historyQuery.isFetching ||
                detailQuery.isFetching) &&
                "animate-spin motion-reduce:animate-none"
            )}
          />
          Refresh
        </Button>
      </header>

      <SafetyBanner
        catalog={catalog}
        loading={catalogQuery.isLoading}
        error={catalogQuery.isError}
        onRetry={() => void catalogQuery.refetch()}
      />

      {actionError ? (
        <InlineError message={actionError} onDismiss={() => setActionError(null)} />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]">
        <StartPanel
          catalog={catalog}
          selectedProfile={selectedProfile}
          selectedScenario={selectedScenario}
          virtualUsers={virtualUsers}
          rampSeconds={rampSeconds}
          durationSeconds={durationSeconds}
          validationError={validationError}
          starting={startState.isLoading}
          onProfileChange={(profile) => {
            setSelectedProfile(profile);
            const defaults = catalog?.profiles.find(
              (item) => item.profile === profile
            );
            if (defaults) {
              setVirtualUsers(String(defaults.virtualUsers));
              setRampSeconds(String(defaults.rampSeconds));
              setDurationSeconds(String(defaults.durationSeconds));
            }
          }}
          onScenarioChange={setSelectedScenario}
          onVirtualUsersChange={setVirtualUsers}
          onRampSecondsChange={setRampSeconds}
          onDurationSecondsChange={setDurationSeconds}
          onStart={requestStart}
        />

        <LiveRunPanel
          run={selectedRun}
          loading={detailQuery.isFetching && !selectedRun}
          error={detailQuery.isError}
          cancelling={cancelState.isLoading}
          onRetry={() => void detailQuery.refetch()}
          onCancel={() => void cancelRun()}
        />
      </section>

      <RunHistory
        runs={historyQuery.data?.data.content ?? []}
        page={historyQuery.data?.data.page ?? page}
        totalPages={historyQuery.data?.data.totalPages ?? 0}
        totalElements={historyQuery.data?.data.totalElements ?? 0}
        selectedRunId={selectedRunId}
        loading={historyQuery.isLoading}
        fetching={historyQuery.isFetching}
        error={historyQuery.isError}
        onSelect={setSelectedRunId}
        onPageChange={setPage}
        onRetry={() => void historyQuery.refetch()}
      />

      <HowToTest />

      <StartConfirmationDialog
        open={confirmOpen}
        draft={draft}
        starting={startState.isLoading}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void confirmStart()}
      />
    </div>
  );
}

function AccessDenied() {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>Platform administrator access required</CardTitle>
        <CardDescription>
          Load testing is not available to tenant users.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function SafetyBanner({
  catalog,
  loading,
  error,
  onRetry,
}: {
  catalog?: LoadTestCatalog;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const unavailable = catalog && !catalog.available;
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        unavailable || error
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-blue-200 bg-blue-50 text-blue-950"
      )}
      role={unavailable || error ? "alert" : "note"}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {unavailable
              ? "Load testing is unavailable"
              : "Staging-first safety boundary"}
          </p>
          {loading ? (
            <p className="mt-1 text-sm">Checking the runner configuration…</p>
          ) : error ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span>The safe load-testing catalog could not be loaded.</span>
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : unavailable ? (
            <>
              <p className="mt-1 text-sm font-medium">
                {catalog.unavailableReason ?? "Load testing is unavailable"}
              </p>
              <p className="mt-1 text-sm">
                Deploy the external runner and complete the backend’s
                environment-backed runner, callback, fixed-target, allow-list,
                and signing configuration.
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm">
              Tests should target isolated staging by default and can affect
              traffic, downstream systems, and data. The target and journey
              behavior are configured outside this UI; no target URL or secret
              is accepted here.
            </p>
          )}
          {catalog ? (
            <p className="mt-2 text-xs">
              Limits: {catalog.maxVirtualUsers} VUs ·{" "}
              {formatDuration(catalog.maxDurationSeconds)} duration ·{" "}
              {catalog.maxConcurrentRuns} concurrent{" "}
              {catalog.maxConcurrentRuns === 1 ? "run" : "runs"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StartPanel({
  catalog,
  selectedProfile,
  selectedScenario,
  virtualUsers,
  rampSeconds,
  durationSeconds,
  validationError,
  starting,
  onProfileChange,
  onScenarioChange,
  onVirtualUsersChange,
  onRampSecondsChange,
  onDurationSecondsChange,
  onStart,
}: {
  catalog?: LoadTestCatalog;
  selectedProfile: LoadTestProfile;
  selectedScenario: LoadTestScenario;
  virtualUsers: string;
  rampSeconds: string;
  durationSeconds: string;
  validationError: string | null;
  starting: boolean;
  onProfileChange: (profile: LoadTestProfile) => void;
  onScenarioChange: (scenario: LoadTestScenario) => void;
  onVirtualUsersChange: (value: string) => void;
  onRampSecondsChange: (value: string) => void;
  onDurationSecondsChange: (value: string) => void;
  onStart: () => void;
}) {
  const profiles = catalog?.profiles ?? [];
  const scenarios = catalog?.scenarios ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure a bounded run</CardTitle>
        <CardDescription>
          Choose a known profile and scenario, then optionally adjust its
          bounded values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Profile</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.profile}
                profile={profile}
                selected={selectedProfile === profile.profile}
                onSelect={() => onProfileChange(profile.profile)}
              />
            ))}
          </div>
          {!catalog ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Scenario</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {scenarios.map((scenario) => (
              <label
                key={scenario}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 transition-colors",
                  selectedScenario === scenario
                    ? "border-blue-500 bg-blue-50"
                    : "border-[var(--factory1-border)] hover:bg-slate-50"
                )}
              >
                <span className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="load-test-scenario"
                    value={scenario}
                    checked={selectedScenario === scenario}
                    onChange={() => onScenarioChange(scenario)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {humanize(scenario)}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      {SCENARIO_COPY[scenario]}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            id="load-test-vus"
            label="Virtual users"
            value={virtualUsers}
            min={1}
            max={catalog?.maxVirtualUsers}
            onChange={onVirtualUsersChange}
          />
          <NumberField
            id="load-test-ramp"
            label="Ramp (seconds)"
            value={rampSeconds}
            min={0}
            max={3600}
            onChange={onRampSecondsChange}
          />
          <NumberField
            id="load-test-duration"
            label="Duration (seconds)"
            value={durationSeconds}
            min={30}
            max={catalog?.maxDurationSeconds}
            onChange={onDurationSecondsChange}
          />
        </div>

        {validationError ? (
          <p className="text-sm font-medium text-red-700" role="alert">
            {validationError}
          </p>
        ) : null}

        <Button
          className="w-full sm:w-auto"
          onClick={onStart}
          disabled={!catalog?.available || starting}
        >
          {starting ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Review and start
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileCard({
  profile,
  selected,
  onSelect,
}: {
  profile: LoadTestProfileConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = PROFILE_COPY[profile.profile];
  return (
    <label
      className={cn(
        "cursor-pointer rounded-lg border p-3 transition-colors",
        copy.tone,
        selected && "ring-2 ring-blue-600 ring-offset-1"
      )}
    >
      <span className="flex items-start gap-2">
        <input
          type="radio"
          name="load-test-profile"
          value={profile.profile}
          checked={selected}
          onChange={onSelect}
          className="mt-1"
        />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {humanize(profile.profile)}
            {profile.profile === "SMOKE" ? (
              <span className="rounded-full bg-emerald-700 px-1.5 py-0.5 text-[10px] text-white">
                Recommended
              </span>
            ) : null}
            {profile.profile === "TARGET" ? (
              <span className="rounded-full bg-blue-700 px-1.5 py-0.5 text-[10px] text-white">
                250 target
              </span>
            ) : null}
          </span>
          <span className="mt-1 block text-xs text-slate-700">
            {profile.virtualUsers} VUs · {formatDuration(profile.rampSeconds)}{" "}
            ramp · {formatDuration(profile.durationSeconds)}
          </span>
          <span className="mt-1 block text-xs text-slate-600">
            {copy.description}
          </span>
        </span>
      </span>
    </label>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: number;
  max?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="block text-xs text-slate-500">
        {max == null ? `Minimum ${min}` : `${min}–${max}`}
      </span>
    </label>
  );
}

function LiveRunPanel({
  run,
  loading,
  error,
  cancelling,
  onRetry,
  onCancel,
}: {
  run?: LoadTestRunDetail;
  loading: boolean;
  error: boolean;
  cancelling: boolean;
  onRetry: () => void;
  onCancel: () => void;
}) {
  if (loading) {
    return (
      <Card className="min-h-96">
        <CardContent className="flex flex-1 items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
          Loading selected run…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="min-h-96">
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <XCircle className="h-8 w-8 text-red-600" />
          <p className="text-sm">The selected run could not be loaded.</p>
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!run) {
    return (
      <Card className="min-h-96">
        <CardContent className="flex flex-1 flex-col items-center justify-center text-center text-sm text-slate-500">
          <Activity className="mb-2 h-8 w-8" />
          Start or select a run to see live evidence.
        </CardContent>
      </Card>
    );
  }

  const latestSample = run.samples.at(-1);
  const metrics = run.metrics;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Selected run
          <StatusPill status={run.status} />
          {!isTerminalStatus(run.status) ? (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-blue-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600 motion-reduce:animate-none" />
              Live · refreshes every 4s
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>
          {humanize(run.profile)} · {humanize(run.scenario)} ·{" "}
          {run.requestedVirtualUsers} VUs
        </CardDescription>
        {isCancellableStatus(run.status) ? (
          <CardAction>
            <Button
              size="sm"
              variant="destructive"
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              Cancel
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {run.failureMessage ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
            role="alert"
          >
            {run.failureMessage}
          </div>
        ) : null}

        <MetricGrid
          metrics={metrics}
          activeVirtualUsers={latestSample?.activeVirtualUsers}
        />

        <LiveCharts samples={run.samples} />

        <RunTimeline run={run} />

        {run.capacityReport ? (
          <CapacityReportPanel
            report={run.capacityReport}
            metrics={metrics}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricGrid({
  metrics,
  activeVirtualUsers,
}: {
  metrics: LoadTestMetrics;
  activeVirtualUsers: number | null | undefined;
}) {
  const values = [
    ["Current users", formatMetric(activeVirtualUsers)],
    ["Requests", formatMetric(metrics.requestCount)],
    [
      "RPS",
      formatMetric(metrics.requestsPerSecond, { maximumFractionDigits: 2 }),
    ],
    ["p50", metricMs(metrics.latencyP50Ms)],
    ["p95", metricMs(metrics.latencyP95Ms)],
    ["p99", metricMs(metrics.latencyP99Ms)],
    ["Max", metricMs(metrics.latencyMaxMs)],
    ["Error rate", formatPercent(metrics.errorRate)],
    ["Completion", formatPercent(metrics.completionRate)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {values.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-slate-50 p-2.5">
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LiveCharts({ samples }: { samples: LoadTestSample[] }) {
  const points = useMemo(
    () =>
      samples.map((sample) => ({
        key: sample.eventKey,
        time: formatChartTime(sample.observedAt),
        p50: sample.metrics.latencyP50Ms,
        p95: sample.metrics.latencyP95Ms,
        p99: sample.metrics.latencyP99Ms,
        errorRate:
          sample.metrics.errorRate == null
            ? null
            : sample.metrics.errorRate * 100,
        rps: sample.metrics.requestsPerSecond,
      })),
    [samples]
  );
  const latencyPoints = points.filter(
    (point) => point.p50 != null || point.p95 != null || point.p99 != null
  );
  const trafficPoints = points.filter(
    (point) => point.errorRate != null || point.rps != null
  );

  return (
    <section aria-labelledby="live-charts-heading">
      <h3 id="live-charts-heading" className="mb-2 text-sm font-semibold">
        Live trends
      </h3>
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Response latency"
          description="Recent bounded reservoir percentiles"
          points={latencyPoints}
          lines={[
            { key: "p50", label: "p50", color: "#0f766e" },
            { key: "p95", label: "p95", color: "#2563eb" },
            { key: "p99", label: "p99", color: "#9333ea" },
          ]}
          unit="ms"
        />
        <ChartCard
          title="Error and throughput"
          description="Error percentage and requests per second"
          points={trafficPoints}
          lines={[
            { key: "errorRate", label: "Error %", color: "#dc2626" },
            { key: "rps", label: "RPS", color: "#d97706" },
          ]}
        />
      </div>
    </section>
  );
}

function ChartCard({
  title,
  description,
  points,
  lines,
  unit = "",
}: {
  title: string;
  description: string;
  points: Array<Record<string, string | number | null>>;
  lines: Array<{ key: string; label: string; color: string }>;
  unit?: string;
}) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-slate-500">
          Waiting for at least two metric samples. {description}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
      <div className="mt-2 h-52" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              formatter={(value, name) => [
                `${formatMetric(Number(value), {
                  maximumFractionDigits: 2,
                })}${unit}`,
                String(name),
              ]}
            />
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-medium">
          Accessible chart data
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pr-3">Time</th>
                {lines.map((line) => (
                  <th key={line.key} className="pr-3">
                    {line.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={String(point.key)} className="border-t">
                  <td className="py-1 pr-3">{point.time}</td>
                  {lines.map((line) => (
                    <td key={line.key} className="py-1 pr-3">
                      {formatMetric(point[line.key] as number | null)}
                      {point[line.key] != null ? unit : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function RunTimeline({ run }: { run: LoadTestRunDetail }) {
  const items = [
    ["Created", run.createdAt],
    ["Queued", run.queuedAt],
    ["Started", run.startedAt],
    ["Completed", run.completedAt],
    ["Cancelled", run.cancelledAt],
  ];
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Lifecycle</h3>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b py-1">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-right">{formatDate(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CapacityReportPanel({
  report,
  metrics,
}: {
  report: CapacityReport;
  metrics: LoadTestMetrics;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4",
        capacityTone(report.status)
      )}
      aria-labelledby="capacity-report-heading"
    >
      <div className="flex items-start gap-2">
        <CapacityIcon status={report.status} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">
            Deterministic recorded-metric interpretation
          </p>
          <h3 id="capacity-report-heading" className="text-base font-semibold">
            {report.status}: {report.summary}
          </h3>
        </div>
      </div>
      <p className="mt-2 text-sm">{report.interpretation}</p>
      {report.findings.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {report.findings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <Threshold
          label="Maximum error rate"
          value={formatPercent(report.thresholds.maximumErrorRate)}
        />
        <Threshold
          label="Maximum p95"
          value={metricMs(report.thresholds.maximumP95Ms)}
        />
        <Threshold
          label="Maximum p99"
          value={metricMs(report.thresholds.maximumP99Ms)}
        />
        <Threshold
          label="Minimum completion"
          value={formatPercent(report.thresholds.minimumCompletionRate)}
        />
      </div>
      {report.databaseMetricsAvailable && metrics.databaseMetricsAvailable ? (
        <div className="mt-3 rounded-lg border border-current/20 bg-white/50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Database className="h-4 w-4" />
            Database observations
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Threshold
              label="Pool active"
              value={formatMetric(metrics.dbPoolActive)}
            />
            <Threshold
              label="Pool idle"
              value={formatMetric(metrics.dbPoolIdle)}
            />
            <Threshold
              label="Pool pending"
              value={formatMetric(metrics.dbPoolPending)}
            />
            <Threshold
              label="Slow queries"
              value={formatMetric(metrics.slowQueryCount)}
            />
          </dl>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-current/20 bg-white/50 p-3 text-xs">
          Database pool and slow-query metrics were unavailable. Do not infer
          database saturation from HTTP latency alone; correlate this run’s
          timestamps with database and query telemetry.
        </p>
      )}
    </section>
  );
}

function CapacityIcon({ status }: { status: CapacityStatus }) {
  if (status === "PASS") return <CheckCircle2 className="h-5 w-5 shrink-0" />;
  if (status === "WARN") return <AlertTriangle className="h-5 w-5 shrink-0" />;
  return <XCircle className="h-5 w-5 shrink-0" />;
}

function Threshold({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-current/70">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function RunHistory({
  runs,
  page,
  totalPages,
  totalElements,
  selectedRunId,
  loading,
  fetching,
  error,
  onSelect,
  onPageChange,
  onRetry,
}: {
  runs: LoadTestRunSummary[];
  page: number;
  totalPages: number;
  totalElements: number;
  selectedRunId: string | null;
  loading: boolean;
  fetching: boolean;
  error: boolean;
  onSelect: (runId: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Run history</CardTitle>
        <CardDescription>
          {totalElements} recorded {totalElements === 1 ? "run" : "runs"}
        </CardDescription>
        {fetching && !loading ? (
          <CardAction>
            <Loader2 className="h-4 w-4 animate-spin text-slate-500 motion-reduce:animate-none" />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading run history…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm">Run history could not be loaded.</p>
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : runs.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No load-test runs have been recorded. Start with Smoke in staging.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-slate-500">
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Profile</th>
                  <th className="px-2 py-2">Scenario</th>
                  <th className="px-2 py-2">VUs</th>
                  <th className="px-2 py-2">Requested</th>
                  <th className="px-2 py-2">Completed</th>
                  <th className="px-2 py-2">Result</th>
                  <th className="px-2 py-2">p95</th>
                  <th className="px-2 py-2">
                    <span className="sr-only">Select</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className={cn(
                      "border-b transition-colors hover:bg-slate-50",
                      selectedRunId === run.id && "bg-blue-50"
                    )}
                  >
                    <td className="px-2 py-3">
                      <StatusPill status={run.status} />
                    </td>
                    <td className="px-2 py-3">{humanize(run.profile)}</td>
                    <td className="px-2 py-3">{humanize(run.scenario)}</td>
                    <td className="px-2 py-3">{run.requestedVirtualUsers}</td>
                    <td className="px-2 py-3">{formatDate(run.createdAt)}</td>
                    <td className="px-2 py-3">
                      {formatDate(run.completedAt)}
                    </td>
                    <td className="px-2 py-3">
                      {run.capacityStatus ?? "Pending"}
                    </td>
                    <td className="px-2 py-3">
                      {metricMs(run.latencyP95Ms)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Button
                        size="sm"
                        variant={
                          selectedRunId === run.id ? "secondary" : "outline"
                        }
                        onClick={() => onSelect(run.id)}
                        aria-label={`View ${humanize(run.profile)} ${humanize(run.scenario)} run from ${formatDate(run.createdAt)}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!error && totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 0}
            >
              Previous
            </Button>
            <span className="text-xs text-slate-500">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages}
            >
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HowToTest() {
  const steps = [
    "Deploy the external runner in an isolated environment.",
    "Configure the backend’s runner, callback, fixed target, allow-list, and signing values in its secret manager.",
    "Start a Smoke run against staging.",
    "Verify signed callbacks and live samples arrive.",
    "Scale one profile at a time toward Target.",
  ];
  const copy = steps.map((step, index) => `${index + 1}. ${step}`).join("\n");

  async function copySteps() {
    try {
      await navigator.clipboard.writeText(copy);
      toast.success("Safe test steps copied");
    } catch {
      toast.error("Could not copy the test steps");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>How to test safely</CardTitle>
        <CardDescription>
          Deployment sequence aligned with the backend load-testing
          documentation. Secrets stay in deployment configuration.
        </CardDescription>
        <CardAction>
          <Button size="sm" variant="outline" onClick={() => void copySteps()}>
            <Clipboard className="h-4 w-4" />
            Copy steps
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-2 text-sm sm:grid-cols-5">
          {steps.map((step, index) => (
            <li key={step} className="rounded-lg bg-slate-50 p-3">
              <span className="mb-1 block text-xs font-semibold text-blue-700">
                Step {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          See the backend repository’s{" "}
          <a
            className="font-medium text-blue-700 underline underline-offset-2"
            href="https://github.com/yashb319/factory1-backend/blob/9fa7310/docs/LOAD_TESTING.md"
            target="_blank"
            rel="noreferrer"
          >
            canonical load-testing guide
          </a>{" "}
          and{" "}
          <a
            className="font-medium text-blue-700 underline underline-offset-2"
            href="https://github.com/yashb319/factory1-backend/blob/9fa7310/load-testing/README.md"
            target="_blank"
            rel="noreferrer"
          >
            runner README
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

function StartConfirmationDialog({
  open,
  draft,
  starting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  draft: {
    profile: LoadTestProfile;
    scenario: LoadTestScenario;
    virtualUsers: number;
    rampSeconds: number;
    durationSeconds: number;
  };
  starting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm load-test dispatch</DialogTitle>
          <DialogDescription>
            This sends real traffic through the externally configured runner.
            Confirm the configured target is the intended isolated staging
            environment and monitoring is active.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
          <Threshold label="Profile" value={humanize(draft.profile)} />
          <Threshold label="Scenario" value={humanize(draft.scenario)} />
          <Threshold label="Virtual users" value={String(draft.virtualUsers)} />
          <Threshold label="Ramp" value={formatDuration(draft.rampSeconds)} />
          <Threshold
            label="Duration"
            value={formatDuration(draft.durationSeconds)}
          />
        </dl>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={starting}>
              Go back
            </Button>
          </DialogClose>
          <Button onClick={onConfirm} disabled={starting}>
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Confirm and start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InlineError({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
      role="alert"
    >
      <span>{message}</span>
      <Button size="sm" variant="ghost" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}

function StatusPill({ status }: { status: LoadTestStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        statusTone(status)
      )}
    >
      {humanize(status)}
    </span>
  );
}

function statusTone(status: LoadTestStatus) {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-800";
  if (status === "FAILED" || status === "DISPATCH_FAILED")
    return "bg-red-100 text-red-800";
  if (status === "CANCELLED") return "bg-slate-200 text-slate-800";
  if (status === "CANCEL_REQUESTED")
    return "bg-amber-100 text-amber-900";
  return "bg-blue-100 text-blue-800";
}

function capacityTone(status: CapacityStatus) {
  if (status === "PASS") return "border-emerald-300 bg-emerald-50 text-emerald-950";
  if (status === "WARN") return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-red-300 bg-red-50 text-red-950";
}

function metricMs(value: number | null | undefined) {
  return value == null
    ? "Unavailable"
    : `${formatMetric(value, { maximumFractionDigits: 1 })} ms`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatChartTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function validateDraft(
  draft: {
    virtualUsers: number;
    rampSeconds: number;
    durationSeconds: number;
  },
  catalog: LoadTestCatalog | undefined
) {
  if (!catalog?.available) return "Load testing is not currently available.";
  if (
    !Number.isInteger(draft.virtualUsers) ||
    draft.virtualUsers < 1 ||
    draft.virtualUsers > catalog.maxVirtualUsers
  ) {
    return `Virtual users must be a whole number from 1 to ${catalog.maxVirtualUsers}.`;
  }
  if (
    !Number.isInteger(draft.rampSeconds) ||
    draft.rampSeconds < 0 ||
    draft.rampSeconds > 3600
  ) {
    return "Ramp time must be a whole number from 0 to 3600 seconds.";
  }
  if (
    !Number.isInteger(draft.durationSeconds) ||
    draft.durationSeconds < 30 ||
    draft.durationSeconds > catalog.maxDurationSeconds
  ) {
    return `Duration must be a whole number from 30 to ${catalog.maxDurationSeconds} seconds.`;
  }
  return null;
}
