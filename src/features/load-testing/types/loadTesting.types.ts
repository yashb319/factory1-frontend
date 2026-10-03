export type LoadTestProfile =
  | "SMOKE"
  | "NORMAL"
  | "EXPECTED"
  | "TARGET"
  | "STRESS"
  | "SPIKE";

export type LoadTestScenario =
  | "API_HEALTH"
  | "AUTHENTICATION"
  | "DASHBOARD"
  | "EMPLOYEE_MANAGEMENT"
  | "ATTENDANCE"
  | "PRODUCTION"
  | "INVENTORY"
  | "FULL_FACTORY_WORKFLOW";

export type LoadTestStatus =
  | "DISPATCHING"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "DISPATCH_FAILED";

export type CapacityStatus = "PASS" | "WARN" | "FAIL";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface LoadTestThresholds {
  maximumErrorRate: number;
  maximumP95Ms: number;
  maximumP99Ms: number;
  minimumCompletionRate: number;
}

export interface LoadTestProfileConfig {
  profile: LoadTestProfile;
  virtualUsers: number;
  rampSeconds: number;
  durationSeconds: number;
}

export interface LoadTestCatalog {
  available: boolean;
  unavailableReason: string | null;
  maxVirtualUsers: number;
  maxDurationSeconds: number;
  maxConcurrentRuns: number;
  profiles: LoadTestProfileConfig[];
  scenarios: LoadTestScenario[];
  thresholds: LoadTestThresholds;
}

export interface LoadTestMetrics {
  requestCount: number | null;
  completedIterations: number | null;
  failedRequests: number | null;
  errorRate: number | null;
  requestsPerSecond: number | null;
  completionRate: number | null;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  latencyP99Ms: number | null;
  latencyMaxMs: number | null;
  dbPoolActive: number | null;
  dbPoolIdle: number | null;
  dbPoolPending: number | null;
  slowQueryCount: number | null;
  databaseMetricsAvailable: boolean;
}

export interface LoadTestSample {
  eventKey: string;
  observedAt: string;
  status: LoadTestStatus;
  activeVirtualUsers: number | null;
  metrics: LoadTestMetrics;
}

export interface CapacityReport {
  status: CapacityStatus;
  summary: string;
  interpretation: string;
  thresholds: LoadTestThresholds;
  findings: string[];
  databaseMetricsAvailable: boolean;
}

export interface LoadTestRunSummary {
  id: string;
  status: LoadTestStatus;
  profile: LoadTestProfile;
  scenario: LoadTestScenario;
  requestedVirtualUsers: number;
  rampSeconds: number;
  durationSeconds: number;
  requestedBy: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  capacityStatus: CapacityStatus | null;
  errorRate: number | null;
  latencyP95Ms: number | null;
}

export interface LoadTestRunDetail {
  id: string;
  status: LoadTestStatus;
  profile: LoadTestProfile;
  scenario: LoadTestScenario;
  requestedVirtualUsers: number;
  rampSeconds: number;
  durationSeconds: number;
  requestedBy: string;
  createdAt: string;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  metrics: LoadTestMetrics;
  capacityReport: CapacityReport | null;
  failureMessage: string | null;
  samples: LoadTestSample[];
}

export interface LoadTestStartRequest {
  profile: LoadTestProfile;
  scenario: LoadTestScenario;
  virtualUsers?: number;
  rampSeconds?: number;
  durationSeconds?: number;
}
