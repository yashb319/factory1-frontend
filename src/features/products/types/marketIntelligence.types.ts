export type MarketAvailability =
  | "LOADING"
  | "ENTITLEMENT_REQUIRED"
  | "PROVIDER_DISABLED"
  | "PROVIDER_MISCONFIGURED"
  | "PROVIDER_UNHEALTHY"
  | "NO_DATA"
  | "RUNNING"
  | "FAILED"
  | "STALE"
  | "EXPIRED"
  | "INSUFFICIENT_COMPARABLES"
  | "AVAILABLE";

export type MarketRunStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "UNAVAILABLE";

export type MarketMoney = {
  currency: string;
  value?: number | null;
  min?: number | null;
  max?: number | null;
};

export type MarketSearchAttributeDefinition = {
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "SELECT";
  required: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  unit?: string | null;
  options?: { value: string; label: string }[];
  initialValue?: string | null;
};

export type MarketSearchRequest = {
  productId: string;
  attributes: Record<string, string | number>;
  requestKey: string;
};

export type MarketComparable = {
  id: string;
  sourceName: string;
  sourceUrl?: string | null;
  observedAt?: string | null;
  freshness?: string | null;
  title?: string | null;
  model?: string | null;
  originalPrice: MarketMoney;
  normalizedPrice?: MarketMoney | null;
  moq?: number | null;
  channel?: "WHOLESALE" | "RETAIL" | "UNKNOWN" | null;
  material?: string | null;
  dimensions?: string | null;
  features: string[];
  similarity?: number | null;
  confidence?: number | null;
  missingFields: string[];
  decision: "ACCEPTED" | "EXCLUDED";
  decisionReason?: string | null;
  provider?: string | null;
  providerVersion?: string | null;
  algorithmVersion?: string | null;
  limitations: string[];
};

export type MarketSummary = {
  range: MarketMoney;
  median: MarketMoney;
  sampleCount: number;
  confidence?: number | null;
  method?: string | null;
  outlierExclusions: number;
  limitations: string[];
};

export type GroundedMarketAdvisorEvidence = {
  text: string;
  comparableIds: string[];
  generatedAt?: string | null;
  model?: string | null;
};

export type MarketRun = {
  id: string;
  status: MarketRunStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  provider?: string | null;
  providerVersion?: string | null;
  algorithmVersion?: string | null;
  errorCode?: string | null;
  resultCount?: number;
  acceptedCount?: number;
  safeError?: string | null;
  searchedAttributes: Record<string, string | number>;
};

export type MarketComparableFilters = {
  page: number;
  size: number;
  channel: "ALL" | "WHOLESALE" | "RETAIL";
  decision: "ALL" | "ACCEPTED" | "EXCLUDED";
  freshness: "ALL" | "FRESH" | "STALE" | "EXPIRED";
};

export type MarketIntelligenceView = {
  availability: MarketAvailability;
  message?: string | null;
  lastUpdatedAt?: string | null;
  expiresAt?: string | null;
  searchAttributes: MarketSearchAttributeDefinition[];
  searchedAttributes: Record<string, string | number>;
  summary: MarketSummary | null;
  comparables: MarketComparable[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  runs: MarketRun[];
  advisorEvidence?: GroundedMarketAdvisorEvidence | null;
};
