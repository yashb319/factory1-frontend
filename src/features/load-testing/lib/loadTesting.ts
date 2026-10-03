import type {
  LoadTestProfile,
  LoadTestScenario,
  LoadTestStartRequest,
  LoadTestStatus,
} from "../types/loadTesting.types";

export const TERMINAL_STATUSES: readonly LoadTestStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "DISPATCH_FAILED",
];

export const CANCELLABLE_STATUSES: readonly LoadTestStatus[] = [
  "QUEUED",
  "RUNNING",
];

export function isTerminalStatus(status: LoadTestStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export function isCancellableStatus(status: LoadTestStatus) {
  return CANCELLABLE_STATUSES.includes(status);
}

export function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function formatMetric(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
) {
  return value == null
    ? "Unavailable"
    : new Intl.NumberFormat(undefined, options).format(value);
}

export function formatPercent(value: number | null | undefined) {
  return value == null
    ? "Unavailable"
    : `${new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
      }).format(value * 100)}%`;
}

export function buildLoadTestStartBody(input: {
  profile: LoadTestProfile;
  scenario: LoadTestScenario;
  virtualUsers: number;
  rampSeconds: number;
  durationSeconds: number;
}): LoadTestStartRequest {
  return {
    profile: input.profile,
    scenario: input.scenario,
    virtualUsers: input.virtualUsers,
    rampSeconds: input.rampSeconds,
    durationSeconds: input.durationSeconds,
  };
}
