import type { PageResponseDto } from "./costingApi.types";

export type MarketAvailabilityDto = {
  entitled: boolean;
  productCostingEntitled: boolean;
  providerConfigured: boolean;
  status: "AVAILABLE" | "UNAVAILABLE" | "CIRCUIT_OPEN";
  provider: "SERPAPI_GOOGLE_SHOPPING" | null;
  reasonCode:
    | "AVAILABLE"
    | "FEATURE_DISABLED"
    | "PROVIDER_DISABLED"
    | "PROVIDER_NOT_CONFIGURED"
    | "PROVIDER_UNHEALTHY";
  catalog: {
    maxQueryLength: number;
    maxResults: number;
    supportedCountries: string[];
    supportedCurrencies: string[];
    channels: (
      | "WHOLESALE"
      | "RETAIL"
      | "MANUFACTURER"
      | "DISTRIBUTOR"
      | "UNKNOWN"
    )[];
    attributes: string[];
  };
};

export type MarketSearchRunRequestDto = {
  query?: string;
  material?: string;
  dimensions?: string;
  quality?: string;
  customization?: string;
  packaging?: string;
  marketChannel?:
    | "WHOLESALE"
    | "RETAIL"
    | "MANUFACTURER"
    | "DISTRIBUTOR"
    | "UNKNOWN";
  currency?: "INR";
  country?: "IN";
  maxResults?: number;
  requestKey: string;
};

export type MarketRunErrorCodeDto =
  | "NONE"
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_DISABLED"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_RESPONSE_INVALID"
  | "PROVIDER_RESPONSE_TOO_LARGE"
  | "PROVIDER_CONTENT_TYPE_INVALID"
  | "CIRCUIT_OPEN"
  | "CONCURRENCY_LIMIT"
  | "NO_RESULTS";

export type MarketSearchRunDto = {
  id: string;
  productId: string;
  provider: "SERPAPI_GOOGLE_SHOPPING" | null;
  query?: string | null;
  requestHash: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "UNAVAILABLE";
  startedAt?: string | null;
  completedAt?: string | null;
  requestedBy?: string | null;
  errorCode: MarketRunErrorCodeDto;
  safeError?: string | null;
  providerResponseHash?: string | null;
  resultCount: number;
  acceptedCount: number;
  algorithmVersion?: string | null;
  expiresAt?: string | null;
  metadata?: {
    country: "IN";
    currency: "INR";
    maxResults: number;
    material: string | null;
    dimensions: string | null;
    quality: string | null;
    customization: string | null;
    packaging: string | null;
    marketChannel:
      | "WHOLESALE"
      | "RETAIL"
      | "MANUFACTURER"
      | "DISTRIBUTOR"
      | "UNKNOWN";
    providerResultLimit: 40;
    providerPaginationSupported: false;
    retryOfRunId?: string;
  } | null;
};

export type MarketComparableDto = {
  id: string;
  runId: string;
  sourceDomain: string;
  sourceUrl?: string | null;
  title?: string | null;
  model?: string | null;
  observedAt?: string | null;
  originalCurrency: string;
  originalPriceMin?: number | string | null;
  originalPriceMax?: number | string | null;
  normalizedCurrency?: string | null;
  normalizedPriceMin?: number | string | null;
  normalizedPriceMax?: number | string | null;
  moq?: number | string | null;
  material?: string | null;
  dimensions?: string | null;
  unit?: string | null;
  features?: string[] | null;
  seller?: string | null;
  manufacturer?: string | null;
  marketChannel?:
    | "WHOLESALE"
    | "RETAIL"
    | "MANUFACTURER"
    | "DISTRIBUTOR"
    | "UNKNOWN"
    | null;
  missingFields?: string[] | null;
  evidence?: unknown;
  similarityScore?: number | string | null;
  confidence?: number | string | null;
  accepted: boolean;
  rejectionReason?: string | null;
  algorithmVersion?: string | null;
  freshness: "FRESH" | "STALE" | "EXPIRED";
  expiresAt?: string | null;
};

export type MarketSummaryDto = {
  productId: string;
  currency: string;
  range: {
    low: number | string;
    median: number | string;
    high: number | string;
    sampleCount: number;
    outlierCount: number;
    method: "IQR_P25_MEDIAN_P75";
    channel?: string | null;
    mixedChannels: boolean;
  } | null;
  confidence?: number | string | null;
  freshness?: "FRESH" | "STALE" | "EXPIRED" | null;
  observedFrom?: string | null;
  observedTo?: string | null;
  reasonCode:
    | "INSUFFICIENT_COMPARABLES"
    | "CURRENCY_MISMATCH"
    | "NO_FRESH_COMPARABLES"
    | null;
  sources: string[];
  missingFields: string[];
  disclaimer?: string | null;
};

export type MarketRunsPageDto = PageResponseDto<MarketSearchRunDto>;
export type MarketComparablesPageDto = PageResponseDto<MarketComparableDto>;
