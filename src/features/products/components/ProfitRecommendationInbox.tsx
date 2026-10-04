"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Inbox, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProfitRecommendation,
  RecommendationFilters,
  RecommendationLifecycleAction,
  RecommendationPage,
  RecommendationSeverity,
  RecommendationType,
} from "../types/profitRecommendations.types";
import { recommendationEvidenceHref } from "../utils/profitRecommendationNavigation";
import {
  formatProfitabilityDate,
  formatProfitabilityMoney,
  formatProfitabilityPercent,
} from "../utils/profitabilityPresentation";
import { recommendationTypeLabel } from "../api/profitRecommendationsAdapters";

const TYPES: RecommendationType[] = [
  "NEGATIVE_CONTRIBUTION_MARGIN",
  "LOW_CONTRIBUTION_MARGIN",
  "COST_DATA_INCOMPLETE_OR_STALE",
  "MATERIAL_COST_CONCENTRATION",
  "MATERIAL_COST_INCREASE",
  "PRICE_WHAT_IF_OPPORTUNITY",
  "MARKET_PRICE_EVIDENCE",
  "MARGIN_RISK_FROM_COST_CHANGE",
];

type Props = {
  page?: RecommendationPage;
  filters: RecommendationFilters;
  selected?: ProfitRecommendation | null;
  loading: boolean;
  fetching: boolean;
  detailLoading: boolean;
  error?: string | null;
  detailError?: string | null;
  actionError?: string | null;
  actionPending: boolean;
  onFiltersChange: (filters: RecommendationFilters) => void;
  onSelect: (id: string | null) => void;
  onRetry: () => void;
  onRetryDetail: () => void;
  onAction: (
    recommendation: ProfitRecommendation,
    action: RecommendationLifecycleAction,
    reason?: string
  ) => void;
};

export function ProfitRecommendationInbox({
  page,
  filters,
  selected,
  loading,
  fetching,
  detailLoading,
  error,
  detailError,
  actionError,
  actionPending,
  onFiltersChange,
  onSelect,
  onRetry,
  onRetryDetail,
  onAction,
}: Props) {
  const [confirmation, setConfirmation] = useState<{
    recommendation: ProfitRecommendation;
    action: RecommendationLifecycleAction;
  } | null>(null);
  const [dismissalReason, setDismissalReason] = useState("");
  const update = (changes: Partial<RecommendationFilters>) =>
    onFiltersChange({ ...filters, page: 0, ...changes });

  const confirmAction = () => {
    if (!confirmation) return;
    onAction(
      confirmation.recommendation,
      confirmation.action,
      confirmation.action === "DISMISS"
        ? dismissalReason.trim() || undefined
        : undefined
    );
    setConfirmation(null);
    setDismissalReason("");
  };

  return (
    <section className="space-y-4" aria-labelledby="recommendation-inbox-title">
      <div>
        <h2 id="recommendation-inbox-title" className="text-lg font-semibold">
          Profit recommendations
        </h2>
        <p className="text-sm text-muted-foreground">
          Proactive, rule-versioned observations grounded in frozen cost,
          attributed sales, simulations, and accepted market evidence.
        </p>
      </div>

      <div
        className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-6"
        aria-label="Recommendation filters"
      >
        <FilterSelect
          label="Lifecycle"
          value={filters.lifecycle}
          onChange={(lifecycle) =>
            update({
              lifecycle: lifecycle as RecommendationFilters["lifecycle"],
            })
          }
          options={[
            ["ALL", "All lifecycle states"],
            ["OPEN", "Open"],
            ["ACKNOWLEDGED", "Acknowledged"],
            ["DISMISSED", "Dismissed"],
            ["RESOLVED", "Resolved"],
            ["EXPIRED", "Expired"],
          ]}
        />
        <FilterSelect
          label="Type"
          value={filters.type}
          onChange={(type) =>
            update({ type: type as RecommendationFilters["type"] })
          }
          options={[
            ["ALL", "All rule types"],
            ...TYPES.map(
              (type) => [type, recommendationTypeLabel(type)] as [string, string]
            ),
          ]}
        />
        <FilterSelect
          label="Severity"
          value={filters.severity}
          onChange={(severity) =>
            update({
              severity: severity as RecommendationFilters["severity"],
            })
          }
          options={[
            ["ALL", "All severities"],
            ["HIGH", "High"],
            ["WARNING", "Warning"],
            ["INFO", "Info"],
          ]}
        />
        <FilterSelect
          label="Freshness"
          value={filters.freshness}
          onChange={(freshness) =>
            update({
              freshness: freshness as RecommendationFilters["freshness"],
            })
          }
          options={[
            ["ALL", "All freshness states"],
            ["FRESH", "Fresh"],
            ["EXPIRING", "Expiring within 48 hours"],
            ["EXPIRED", "Expired"],
          ]}
        />
        <label className="space-y-1">
          <span className="text-xs font-medium">Product ID</span>
          <Input
            value={filters.productId}
            placeholder="Optional exact product"
            onChange={(event) => update({ productId: event.target.value.trim() })}
          />
        </label>
        <FilterSelect
          label="Rows per page"
          value={String(filters.size)}
          onChange={(size) => update({ size: Number(size) })}
          options={[
            ["10", "10"],
            ["20", "20"],
            ["50", "50"],
          ]}
        />
      </div>

      {loading ? (
        <p role="status" className="rounded-lg border p-8 text-center">
          Loading recommendations...
        </p>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">
            Recommendations could not be loaded
          </p>
          <p className="mt-1 text-sm text-red-800">{error}</p>
          <Button className="mt-3" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : !page?.content.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-medium">No recommendations found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust the filters or refresh generation when your role allows it.
          </p>
        </div>
      ) : (
        <>
          {fetching ? (
            <p role="status" className="text-xs text-muted-foreground">
              Updating recommendation results...
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-lg border">
            <table className="responsive-table w-full text-sm">
              <caption className="sr-only">
                Profit recommendations with severity, product, evidence quality,
                impact, freshness and lifecycle
              </caption>
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left" scope="col">Recommendation</th>
                  <th className="p-3 text-left" scope="col">Severity</th>
                  <th className="p-3 text-left" scope="col">Product</th>
                  <th className="p-3 text-left" scope="col">Evidence</th>
                  <th className="p-3 text-right" scope="col">Impact</th>
                  <th className="p-3 text-left" scope="col">Lifecycle</th>
                  <th className="p-3 text-right" scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((recommendation) => (
                  <tr key={recommendation.id} className="border-t align-top">
                    <th className="p-3 text-left" scope="row">
                      <p className="font-medium">{recommendation.title}</p>
                      <p className="mt-1 max-w-md text-xs text-muted-foreground">
                        {recommendation.category}
                      </p>
                    </th>
                    <td className="p-3" data-label="Severity">
                      <SeverityBadge severity={recommendation.severity} />
                    </td>
                    <td className="p-3" data-label="Product">
                      {recommendation.productName ?? "Portfolio"}
                      {recommendation.productCode ? (
                        <p className="text-xs text-muted-foreground">
                          {recommendation.productCode}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3" data-label="Evidence">
                      <p>{recommendation.dataQuality.toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        Confidence {recommendation.confidence.toLowerCase()}
                      </p>
                    </td>
                    <td className="p-3 text-right" data-label="Impact">
                      <Impact recommendation={recommendation} />
                    </td>
                    <td className="p-3" data-label="Lifecycle">
                      <Badge variant="outline">
                        {recommendation.lifecycle.toLowerCase()}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Generated{" "}
                        {formatProfitabilityDate(recommendation.generatedAt)}
                      </p>
                    </td>
                    <td className="p-3 text-right" data-label="Action">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelect(recommendation.id)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page.page + 1} of {Math.max(page.totalPages, 1)} ·{" "}
              {page.totalElements} recommendation
              {page.totalElements === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page.page <= 0}
                onClick={() =>
                  onFiltersChange({ ...filters, page: page.page - 1 })
                }
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page.page + 1 >= page.totalPages}
                onClick={() =>
                  onFiltersChange({ ...filters, page: page.page + 1 })
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={Boolean(selected) || detailLoading || Boolean(detailError)} onOpenChange={(open) => !open && onSelect(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.title ?? "Recommendation detail"}
            </DialogTitle>
            <DialogDescription>
              Deterministic recommendation evidence and lifecycle history.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p role="status">Loading recommendation detail...</p>
          ) : detailError ? (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-red-900">{detailError}</p>
              <Button className="mt-3" variant="outline" onClick={onRetryDetail}>
                Retry
              </Button>
            </div>
          ) : selected ? (
            <RecommendationDetail
              recommendation={selected}
              actionError={actionError}
              actionPending={actionPending}
              onRequestAction={(action) =>
                setConfirmation({ recommendation: selected, action })
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(null);
            setDismissalReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation
                ? `${actionLabel(confirmation.action)} recommendation?`
                : "Update recommendation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This updates the server lifecycle using the current record
              version. A concurrent change will be rejected and reloaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmation?.action === "DISMISS" ? (
            <label className="space-y-1">
              <span className="text-xs font-medium">
                Dismissal reason (optional)
              </span>
              <Textarea
                value={dismissalReason}
                maxLength={500}
                onChange={(event) => setDismissalReason(event.target.value)}
              />
              <span className="block text-right text-xs text-muted-foreground">
                {dismissalReason.length}/500
              </span>
            </label>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              Confirm {confirmation ? actionLabel(confirmation.action).toLowerCase() : "update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function RecommendationDetail({
  recommendation,
  actionError,
  actionPending,
  onRequestAction,
}: {
  recommendation: ProfitRecommendation;
  actionError?: string | null;
  actionPending: boolean;
  onRequestAction: (action: RecommendationLifecycleAction) => void;
}) {
  const readOnly = recommendation.allowedActions.length === 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SeverityBadge severity={recommendation.severity} />
        <Badge variant="outline">{recommendation.lifecycle.toLowerCase()}</Badge>
        <Badge variant="outline">
          {recommendation.dataQuality.toLowerCase()} evidence
        </Badge>
        <Badge variant="outline">
          {recommendation.confidence.toLowerCase()} confidence
        </Badge>
      </div>
      <p>{recommendation.summary}</p>

      <section className="rounded-md border p-3" aria-labelledby="impact-title">
        <h3 id="impact-title" className="font-medium">
          Deterministic impact
        </h3>
        <div className="mt-1">
          <Impact recommendation={recommendation} />
        </div>
      </section>

      {recommendation.type === "MARKET_PRICE_EVIDENCE" ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-950">
          <p className="font-medium">Market-derived opportunity</p>
          <p className="mt-1 text-sm">
            Review the accepted comparable evidence and assumptions. This is
            not an instruction to set a price.
          </p>
        </div>
      ) : null}

      {(recommendation.type === "LOW_CONTRIBUTION_MARGIN" ||
        recommendation.type === "NEGATIVE_CONTRIBUTION_MARGIN") ? (
        <dl className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
          <DetailMetric
            label="Profitability cost coverage"
            value={formatProfitabilityPercent(
              recommendation.profitabilityCoverage
            )}
          />
          <DetailMetric
            label="Effective snapshot status"
            value={
              recommendation.snapshotStatus?.toLowerCase() ?? "Not available"
            }
          />
        </dl>
      ) : null}

      <section aria-labelledby="evidence-title">
        <h3 id="evidence-title" className="font-medium">
          Review evidence
        </h3>
        {recommendation.evidence.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendation.evidence.map((evidence) => {
              const href = recommendationEvidenceHref(evidence);
              if (!href) {
                return (
                  <Badge key={evidence.id} variant="outline">
                    {evidence.label}
                  </Badge>
                );
              }
              return (
                <Button key={evidence.id} size="sm" variant="outline" asChild>
                  <Link href={href}>{evidence.label}</Link>
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No safe in-app evidence route was returned.
          </p>
        )}
        {recommendation.evidence
          .filter((evidence) => evidence.target === "MARKET_EVIDENCE")
          .map((evidence) => (
            <dl
              key={`${evidence.id}:facts`}
              className="mt-3 grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <DetailMetric
                label="Accepted sources"
                value={
                  evidence.sourceCount === null ||
                  evidence.sourceCount === undefined
                    ? "Not available"
                    : String(evidence.sourceCount)
                }
              />
              <DetailMetric
                label="Confidence"
                value={evidence.confidence?.toLowerCase() ?? "Not available"}
              />
              <DetailMetric
                label="Freshness"
                value={
                  formatProfitabilityDate(evidence.freshness) || "Not available"
                }
              />
              <DetailMetric
                label="Channel / currency"
                value={[evidence.channel, evidence.currency]
                  .filter(Boolean)
                  .join(" · ") || "Not available"}
              />
            </dl>
          ))}
      </section>

      <dl className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailMetric label="Rule version" value={recommendation.ruleVersion} />
        <DetailMetric
          label="Engine version"
          value={recommendation.engineVersion}
        />
        <DetailMetric
          label="Generated"
          value={formatProfitabilityDate(recommendation.generatedAt)}
        />
        <DetailMetric
          label="Expires"
          value={formatProfitabilityDate(recommendation.expiresAt)}
        />
      </dl>

      {recommendation.aiExplanation ? (
        <section
          className="rounded-md border border-violet-200 bg-violet-50 p-3"
          aria-labelledby="ai-explanation-title"
        >
          <h3
            id="ai-explanation-title"
            className="flex items-center gap-2 font-medium text-violet-950"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Optional AI explanation
          </h3>
          <p className="mt-1 text-sm text-violet-900">
            {recommendation.aiExplanation}
          </p>
          <p className="mt-2 text-xs text-violet-800">
            Separate from the deterministic recommendation and evidence above.
          </p>
        </section>
      ) : null}

      {actionError ? (
        <div role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{actionError}</p>
        </div>
      ) : null}

      {readOnly ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          This historical, expired, or resolved recommendation is read-only.
        </p>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          {recommendation.allowedActions.map((action) => (
            <Button
              key={action}
              variant={action === "RESOLVE" ? "default" : "outline"}
              disabled={actionPending}
              onClick={() => onRequestAction(action)}
            >
              {actionLabel(action)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([option, optionLabel]) => (
            <SelectItem key={option} value={option}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function SeverityBadge({ severity }: { severity: RecommendationSeverity }) {
  return (
    <Badge variant={severity === "HIGH" ? "destructive" : "outline"}>
      {severity.toLowerCase()}
    </Badge>
  );
}

function Impact({
  recommendation,
}: {
  recommendation: ProfitRecommendation;
}) {
  const { impact } = recommendation;
  if (impact.amount?.value !== undefined) {
    if (!impact.amount.currency) {
      return (
        <span className="text-muted-foreground">
          Not available
          {impact.amount.unavailableReason
            ? ` — ${impact.amount.unavailableReason}`
            : " — impact currency unavailable"}
        </span>
      );
    }
    return (
      <span>
        {formatProfitabilityMoney({
          currency: impact.amount.currency,
          value: impact.amount.value,
        })}
        {impact.percent !== undefined && impact.percent !== null
          ? ` (${formatProfitabilityPercent(impact.percent)})`
          : ""}
      </span>
    );
  }
  if (impact.percent !== undefined && impact.percent !== null) {
    return <span>{formatProfitabilityPercent(impact.percent)}</span>;
  }
  return (
    <span className="text-muted-foreground">
      Not available
      {impact.unavailableReason ? ` — ${impact.unavailableReason}` : ""}
    </span>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function actionLabel(action: RecommendationLifecycleAction) {
  return action[0] + action.slice(1).toLowerCase();
}
