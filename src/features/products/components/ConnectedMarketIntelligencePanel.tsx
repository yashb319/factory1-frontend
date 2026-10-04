"use client";

import { useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/apiError";
import {
  toMarketIntelligenceView,
} from "../api/marketIntelligenceAdapters";
import {
  useGetMarketAvailabilityQuery,
  useGetMarketComparablesQuery,
  useGetMarketRunsQuery,
  useGetMarketSummaryQuery,
  useRetryMarketRunMutation,
  useStartMarketRunMutation,
} from "../api/marketIntelligenceApi";
import type {
  MarketAvailabilityDto,
  MarketComparablesPageDto,
} from "../types/marketIntelligenceApi.types";
import type {
  MarketComparableFilters,
  MarketSearchRequest,
} from "../types/marketIntelligence.types";
import type { ProfitabilityMoney } from "../types/profitability.types";
import { MarketIntelligencePanel } from "./MarketIntelligencePanel";

const DEFAULT_FILTERS: MarketComparableFilters = {
  page: 0,
  size: 20,
  channel: "ALL",
  decision: "ALL",
  freshness: "ALL",
};

const EMPTY_COMPARABLES: MarketComparablesPageDto = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
};

export function ConnectedMarketIntelligencePanel({
  productId,
  productName,
  currentRealizedPrice,
  currentListPrice,
}: {
  productId: string;
  productName: string;
  currentRealizedPrice: ProfitabilityMoney;
  currentListPrice?: ProfitabilityMoney | null;
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const availabilityQuery = useGetMarketAvailabilityQuery();
  const canLoadEvidence = Boolean(
    availabilityQuery.data?.entitled &&
      availabilityQuery.data.productCostingEntitled
  );
  const runsQuery = useGetMarketRunsQuery(
    { productId, page: 0, size: 20 },
    {
      skip: !canLoadEvidence,
      refetchOnMountOrArgChange: true,
      pollingInterval: canLoadEvidence ? 5000 : 0,
    }
  );
  const hasActiveRun = runsQuery.data?.content.some(
    (run) => run.status === "PENDING" || run.status === "RUNNING"
  );
  const comparablesQuery = useGetMarketComparablesQuery(
    { productId, filters },
    { skip: !canLoadEvidence, refetchOnMountOrArgChange: true }
  );
  const summaryQuery = useGetMarketSummaryQuery(productId, {
    skip: !canLoadEvidence,
    refetchOnMountOrArgChange: true,
  });
  const [startRun, startState] = useStartMarketRunMutation();
  const [retryRun, retryState] = useRetryMarketRunMutation();

  const queryError =
    (availabilityQuery.isError &&
      getErrorMessage(
        availabilityQuery.error,
        "Market Intelligence availability could not be loaded."
      )) ||
    (runsQuery.isError &&
      getErrorMessage(
        runsQuery.error,
        "Market provider run history could not be loaded."
      )) ||
    (comparablesQuery.isError &&
      getErrorMessage(
        comparablesQuery.error,
        "Market comparable evidence could not be loaded."
      )) ||
    (summaryQuery.isError &&
      getErrorMessage(
        summaryQuery.error,
        "The server-returned market summary could not be loaded."
      )) ||
    (startState.isError &&
      getErrorMessage(
        startState.error,
        "The provider search could not be started."
      )) ||
    (retryState.isError &&
      getErrorMessage(retryState.error, "The provider run could not be retried.")) ||
    null;

  const loading =
    availabilityQuery.isLoading ||
    (canLoadEvidence &&
      (runsQuery.isLoading ||
        comparablesQuery.isLoading ||
        summaryQuery.isLoading));

  const view = useMemo(() => {
    const availability =
      availabilityQuery.data ?? fallbackAvailability();
    const mapped = toMarketIntelligenceView({
      availability,
      productName,
      runs: runsQuery.data?.content ?? [],
      comparables: comparablesQuery.data ?? {
        ...EMPTY_COMPARABLES,
        page: filters.page,
        size: filters.size,
      },
      summary: summaryQuery.data,
    });
    if (loading) {
      return { ...mapped, availability: "LOADING" as const };
    }
    if (queryError) {
      return {
        ...mapped,
        availability: "FAILED" as const,
        message: queryError,
      };
    }
    return mapped;
  }, [
    availabilityQuery.data,
    comparablesQuery.data,
    filters.page,
    filters.size,
    loading,
    productName,
    queryError,
    runsQuery.data,
    summaryQuery.data,
  ]);

  const start = (request: MarketSearchRequest) => {
    void startRun(request).unwrap().catch(() => undefined);
  };

  const retry = (runId?: string) => {
    const retryId =
      runId ??
      runsQuery.data?.content.find(
        (run) => run.status === "FAILED" || run.status === "UNAVAILABLE"
      )?.id;
    if (!retryId) {
      void Promise.all([
        availabilityQuery.refetch(),
        runsQuery.refetch(),
        comparablesQuery.refetch(),
        summaryQuery.refetch(),
      ]);
      return;
    }
    void retryRun({
      productId,
      runId: retryId,
      requestKey: createRetryRequestKey(retryId),
    })
      .unwrap()
      .catch(() => undefined);
  };

  return (
    <MarketIntelligencePanel
      productId={productId}
      currentRealizedPrice={currentRealizedPrice}
      currentListPrice={currentListPrice}
      view={view}
      filters={filters}
      refreshing={Boolean(hasActiveRun)}
      starting={startState.isLoading || retryState.isLoading}
      onStart={start}
      onRetry={retry}
      onFiltersChange={setFilters}
    />
  );
}

function fallbackAvailability(): MarketAvailabilityDto {
  return {
    entitled: true,
    productCostingEntitled: true,
    providerConfigured: false,
    status: "UNAVAILABLE",
    provider: null,
    reasonCode: "PROVIDER_NOT_CONFIGURED",
    catalog: {
      maxQueryLength: 300,
      maxResults: 40,
      supportedCountries: ["IN"],
      supportedCurrencies: ["INR"],
      channels: [
        "WHOLESALE",
        "RETAIL",
        "MANUFACTURER",
        "DISTRIBUTOR",
        "UNKNOWN",
      ],
      attributes: [],
    },
  };
}

function createRetryRequestKey(runId: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `retry-${runId}-${suffix}`.slice(0, 120);
}
