"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/apiError";
import { useAppDispatch } from "@/lib/hook";
import {
  profitRecommendationsApi,
  useGetProfitCenterDashboardQuery,
  useGetProfitRecommendationQuery,
  useGetProfitRecommendationsQuery,
  useGetRecommendationPreferencesQuery,
  useLazyGetRecommendationRefreshQuery,
  useRequestRecommendationRefreshMutation,
  useUpdateRecommendationLifecycleMutation,
  useUpdateRecommendationPreferencesMutation,
} from "../api/profitRecommendationsApi";
import type {
  ProfitRecommendation,
  RecommendationFilters,
  RecommendationGenerationJob,
  RecommendationLifecycleAction,
  RecommendationSeverity,
} from "../types/profitRecommendations.types";
import { filtersFromSearchParams } from "./ProfitabilityWorkspace";
import { ProfitCenterDashboard } from "./ProfitCenterDashboard";
import { ProfitRecommendationInbox } from "./ProfitRecommendationInbox";
import { RecommendationPreferencesPanel } from "./RecommendationPreferencesPanel";

type ProfitCenterTab = "dashboard" | "recommendations" | "preferences";

export function ProfitCenterWorkspace({
  canRefresh,
}: {
  canRefresh: boolean;
}) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profitabilityFilters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams]
  );
  const period = {
    from: profitabilityFilters.from,
    to: profitabilityFilters.to,
  };
  const tab = profitCenterTab(searchParams.get("profitCenterTab"));
  const recommendationFilters = useMemo(
    () => recommendationFiltersFromSearchParams(searchParams),
    [searchParams]
  );
  const selectedId = searchParams.get("recommendation");

  const dashboardQuery = useGetProfitCenterDashboardQuery(period, {
    skip: tab !== "dashboard",
  });
  const recommendationsQuery = useGetProfitRecommendationsQuery(
    recommendationFilters,
    { skip: tab !== "recommendations" }
  );
  const recommendationQuery = useGetProfitRecommendationQuery(
    selectedId ?? "",
    { skip: !selectedId || tab !== "recommendations" }
  );
  const preferencesQuery = useGetRecommendationPreferencesQuery(undefined, {
    skip: tab !== "preferences",
  });

  const [job, setJob] = useState<RecommendationGenerationJob | null>(null);
  const [requestRefresh, requestRefreshState] =
    useRequestRecommendationRefreshMutation();
  const [getRefreshStatus, refreshQuery] =
    useLazyGetRecommendationRefreshQuery();
  const [updateLifecycle, lifecycleState] =
    useUpdateRecommendationLifecycleMutation();
  const [updatePreferences, preferencesState] =
    useUpdateRecommendationPreferencesMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const completedJobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!job || !["PENDING", "RUNNING"].includes(job.status)) return;
    const timer = window.setTimeout(() => {
      void getRefreshStatus(job.id, false)
        .unwrap()
        .then(setJob)
        .catch(() => undefined);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [getRefreshStatus, job]);

  useEffect(() => {
    if (!job || !["SUCCEEDED", "FAILED"].includes(job.status)) return;
    if (completedJobRef.current === `${job.id}:${job.status}`) return;
    completedJobRef.current = `${job.id}:${job.status}`;

    if (job.status === "SUCCEEDED") {
      toast.success("Profit recommendations refreshed");
      dispatch(
        profitRecommendationsApi.util.invalidateTags([
          { type: "ProfitRecommendations", id: "DASHBOARD" },
          { type: "ProfitRecommendations", id: "LIST" },
        ])
      );
    } else {
      toast.error("Recommendation generation failed", {
        description:
          job.failureReason ?? "The backend job did not complete successfully.",
      });
    }
  }, [dispatch, job]);

  const updateSearch = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const setTab = (nextTab: ProfitCenterTab) => {
    updateSearch({
      profitCenterTab: nextTab === "dashboard" ? null : nextTab,
      recommendation: null,
    });
  };

  const updateRecommendationFilters = (filters: RecommendationFilters) => {
    updateSearch({
      recommendationPage: String(filters.page),
      recommendationSize: String(filters.size),
      recommendationStatus:
        filters.lifecycle === "ALL" ? null : filters.lifecycle,
      recommendationType: filters.type === "ALL" ? null : filters.type,
      recommendationSeverity:
        filters.severity === "ALL" ? null : filters.severity,
      recommendationProduct: filters.productId || null,
      recommendationFreshness:
        filters.freshness === "ALL" ? null : filters.freshness,
      recommendation: null,
    });
  };

  const startRefresh = async () => {
    if (!canRefresh) return;
    try {
      const nextJob = await requestRefresh({
        ...period,
        requestKey: recommendationRequestKey(),
      }).unwrap();
      setJob(nextJob);
      toast.success("Recommendation generation queued");
    } catch (error) {
      toast.error("Could not start recommendation generation", {
        description: getErrorMessage(
          error,
          "The backend did not accept the refresh request."
        ),
      });
    }
  };

  const handleLifecycle = async (
    recommendation: ProfitRecommendation,
    action: RecommendationLifecycleAction,
    reason?: string
  ) => {
    setActionError(null);
    try {
      await updateLifecycle({
        id: recommendation.id,
        action,
        expectedVersion: Number(recommendation.version),
        reason,
      }).unwrap();
      toast.success(`Recommendation ${pastTenseAction(action)}`);
    } catch (error) {
      if (isRecommendationVersionConflict(error)) {
        setActionError(
          "This recommendation changed in another session. The latest version has been reloaded; review it before trying again."
        );
        void recommendationQuery.refetch();
        void recommendationsQuery.refetch();
        return;
      }
      setActionError(
        getErrorMessage(
          error,
          "The recommendation lifecycle could not be updated."
        )
      );
    }
  };

  const handlePreferences = async (next: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    minimumSeverity: RecommendationSeverity;
  }) => {
    setPreferenceError(null);
    try {
      await updatePreferences(next).unwrap();
      toast.success("Recommendation notification preferences saved");
    } catch (error) {
      setPreferenceError(
        getErrorMessage(
          error,
          "Notification preferences could not be saved."
        )
      );
    }
  };

  const activeJob = job;
  const jobRunning =
    requestRefreshState.isLoading ||
    activeJob?.status === "PENDING" ||
    activeJob?.status === "RUNNING";

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-1 rounded-lg border p-1"
        role="group"
        aria-label="Profit Center view"
      >
        <TabButton
          active={tab === "dashboard"}
          onClick={() => setTab("dashboard")}
        >
          Dashboard
        </TabButton>
        <TabButton
          active={tab === "recommendations"}
          onClick={() => setTab("recommendations")}
        >
          Recommendation inbox
        </TabButton>
        <TabButton
          active={tab === "preferences"}
          onClick={() => setTab("preferences")}
        >
          Notifications
        </TabButton>
      </div>

      {activeJob ? (
        <GenerationStatus
          job={activeJob}
          onRetry={
            canRefresh && activeJob.retryAllowed
              ? () => void startRefresh()
              : undefined
          }
        />
      ) : null}
      {refreshQuery.isError ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
          Generation status could not be loaded. The app will not assume the
          refresh succeeded.
          <Button
            className="ml-2"
            size="sm"
            variant="outline"
            onClick={() => {
              if (job) {
                void getRefreshStatus(job.id, false)
                  .unwrap()
                  .then(setJob)
                  .catch(() => undefined);
              }
            }}
          >
            Retry status
          </Button>
        </div>
      ) : null}

      {tab === "dashboard" ? (
        <ProfitCenterDashboard
          dashboard={dashboardQuery.data}
          loading={dashboardQuery.isLoading}
          fetching={dashboardQuery.isFetching}
          error={
            dashboardQuery.isError
              ? getErrorMessage(
                  dashboardQuery.error,
                  "The backend could not load Profit Center facts."
                )
              : null
          }
          canRefresh={canRefresh}
          refreshing={Boolean(jobRunning)}
          onRetry={() => void dashboardQuery.refetch()}
          onRefresh={() => void startRefresh()}
          onPeriodChange={(nextPeriod) =>
            updateSearch({
              from: nextPeriod.from,
              to: nextPeriod.to,
            })
          }
          onOpenRecommendations={() => setTab("recommendations")}
          onOpenProduct={(productId) =>
            router.push(
              `/products?view=profitability&profitabilityProduct=${encodeURIComponent(productId)}`
            )
          }
        />
      ) : null}

      {tab === "recommendations" ? (
        <ProfitRecommendationInbox
          page={recommendationsQuery.data}
          filters={recommendationFilters}
          selected={
            selectedId &&
            recommendationQuery.currentData?.id === selectedId
              ? recommendationQuery.currentData
              : null
          }
          loading={recommendationsQuery.isLoading}
          fetching={recommendationsQuery.isFetching}
          detailLoading={Boolean(selectedId) && recommendationQuery.isLoading}
          error={
            recommendationsQuery.isError
              ? getErrorMessage(
                  recommendationsQuery.error,
                  "The backend could not load recommendations."
                )
              : null
          }
          detailError={
            selectedId && recommendationQuery.isError
              ? getErrorMessage(
                  recommendationQuery.error,
                  "The backend could not load recommendation detail."
                )
              : null
          }
          actionError={actionError}
          actionPending={lifecycleState.isLoading}
          onFiltersChange={updateRecommendationFilters}
          onSelect={(id) => {
            setActionError(null);
            updateSearch({ recommendation: id });
          }}
          onRetry={() => void recommendationsQuery.refetch()}
          onRetryDetail={() => void recommendationQuery.refetch()}
          onAction={handleLifecycle}
        />
      ) : null}

      {tab === "preferences" ? (
        <RecommendationPreferencesPanel
          preferences={preferencesQuery.data}
          loading={preferencesQuery.isLoading}
          saving={preferencesState.isLoading}
          error={
            preferencesQuery.isError
              ? getErrorMessage(
                  preferencesQuery.error,
                  "The backend could not load notification preferences."
                )
              : null
          }
          saveError={preferenceError}
          onRetry={() => void preferencesQuery.refetch()}
          onSave={handlePreferences}
        />
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "secondary" : "ghost"}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function GenerationStatus({
  job,
  onRetry,
}: {
  job: RecommendationGenerationJob;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-md border bg-muted/30 p-3 text-sm"
      role={job.status === "FAILED" ? "alert" : "status"}
    >
      <p className="font-medium">
        Recommendation generation: {job.status.toLowerCase()}
      </p>
      <p className="text-xs text-muted-foreground">
        {job.progressMessage ??
          (job.status === "FAILED"
            ? job.failureReason ?? "The backend job failed."
            : "The backend is processing a bounded generation job.")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Period {job.from} to {job.to} · attempt {job.attempts}
        {job.status === "SUCCEEDED"
          ? ` · ${job.generatedCount} generated`
          : ""}
      </p>
      {job.lastGeneratedAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Last generated {job.lastGeneratedAt}
        </p>
      ) : null}
      {job.status === "FAILED" && onRetry ? (
        <Button className="mt-2" size="sm" variant="outline" onClick={onRetry}>
          Retry generation
        </Button>
      ) : null}
    </div>
  );
}

export function recommendationFiltersFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): RecommendationFilters {
  const lifecycle = searchParams.get("recommendationStatus");
  const type = searchParams.get("recommendationType");
  const severity = searchParams.get("recommendationSeverity");
  const freshness = searchParams.get("recommendationFreshness");
  const size = integerParam(searchParams.get("recommendationSize"), 20);
  const page = integerParam(searchParams.get("recommendationPage"), 0);

  return {
    page: Math.max(0, page),
    size: [10, 20, 50].includes(size) ? size : 20,
    lifecycle:
      lifecycle === "OPEN" ||
      lifecycle === "ACKNOWLEDGED" ||
      lifecycle === "DISMISSED" ||
      lifecycle === "RESOLVED" ||
      lifecycle === "EXPIRED"
        ? lifecycle
        : "ALL",
    type:
      type === "NEGATIVE_CONTRIBUTION_MARGIN" ||
      type === "LOW_CONTRIBUTION_MARGIN" ||
      type === "COST_DATA_INCOMPLETE_OR_STALE" ||
      type === "MATERIAL_COST_CONCENTRATION" ||
      type === "MATERIAL_COST_INCREASE" ||
      type === "PRICE_WHAT_IF_OPPORTUNITY" ||
      type === "MARKET_PRICE_EVIDENCE" ||
      type === "MARGIN_RISK_FROM_COST_CHANGE"
        ? type
        : "ALL",
    severity:
      severity === "INFO" || severity === "WARNING" || severity === "HIGH"
        ? severity
        : "ALL",
    productId: searchParams.get("recommendationProduct") ?? "",
    freshness:
      freshness === "FRESH" ||
      freshness === "EXPIRING" ||
      freshness === "EXPIRED"
        ? freshness
        : "ALL",
  };
}

function profitCenterTab(value: string | null): ProfitCenterTab {
  return value === "recommendations" || value === "preferences"
    ? value
    : "dashboard";
}

function integerParam(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function recommendationRequestKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `profit-${crypto.randomUUID()}`;
  }
  return `profit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pastTenseAction(action: RecommendationLifecycleAction) {
  switch (action) {
    case "ACKNOWLEDGE":
      return "acknowledged";
    case "DISMISS":
      return "dismissed";
    case "RESTORE":
      return "restored";
    case "RESOLVE":
      return "resolved";
  }
}

export function isRecommendationVersionConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 409
  );
}
