"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AiActionProposal,
  AiMessageSnapshot,
  AiMetric,
  AiProvenance,
} from "../types/ai.types";
import { AiActionCard } from "./AiActionCard";
import { AiChartView } from "./AiChartView";
import { AiRecordsView } from "./AiRecordsView";
import { AiThinkingView } from "./AiThinkingView";

const toneClass: Record<AiMetric["tone"], string> = {
  neutral: "border-border bg-muted/40 text-foreground",
  good: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
};

type Props = {
  snapshot?: AiMessageSnapshot | null;
  historical?: boolean;
  actionLoading?: boolean;
  onApplyAction?: (
    action: AiActionProposal,
    fields?: Record<string, string>
  ) => void;
  onSuggestion?: (suggestion: string) => void;
};

export function AiMessageContent({
  snapshot,
  historical = false,
  actionLoading = false,
  onApplyAction,
  onSuggestion,
}: Props) {
  if (!snapshot) return null;
  const briefingMetrics = snapshot.metrics?.filter((metric) =>
    ["danger", "warning", "good"].includes(metric.tone)
  );
  const showBriefing = briefingMetrics && briefingMetrics.length >= 3;

  return (
    <div className="space-y-3">
      <ProvenanceNote provenance={snapshot.provenance} />

      {showBriefing ? (
        <div className="rounded-xl border bg-muted/20 p-3" aria-label="Owner briefing signals">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Owner briefing
          </p>
          <div className="mt-2 space-y-2">
            {briefingMetrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${toneClass[metric.tone]}`}
              >
                <span className="mt-0.5 text-xs font-bold" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">
                    {metric.tone === "danger"
                      ? "Critical"
                      : metric.tone === "warning"
                        ? "Watch"
                        : "Positive"}
                    {" · "}
                    {metric.label}
                  </span>
                  <span className="mt-0.5 block font-semibold">{metric.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {snapshot.metrics?.length ? (
        <div className={`grid gap-2 sm:grid-cols-2 ${showBriefing ? "sr-only" : ""}`}>
          {snapshot.metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-lg border px-3 py-2 ${toneClass[metric.tone]}`}
            >
              <div className="text-xs opacity-80">{metric.label}</div>
              <div className="mt-1 font-semibold">{metric.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      <AiRecordsView records={snapshot.records} />
      <AiChartView chart={snapshot.chart} />
      <AiThinkingView thinking={snapshot.thinking} />

      {snapshot.followUp ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <span className="font-medium text-primary">Recommended priority: </span>
          {snapshot.followUp}
        </div>
      ) : null}

      {snapshot.actions?.length ? (
        <div className="space-y-2">
          {historical ? (
            <p className="text-xs text-muted-foreground">
              Historical proposals are shown for context and cannot be replayed.
            </p>
          ) : null}
          {snapshot.actions.map((action) =>
            historical || !onApplyAction ? (
              <div key={action.id} className="rounded-lg border bg-muted/30 p-3">
                <Badge variant="outline">{action.module}</Badge>
                <p className="mt-2 font-medium">{action.recordLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {action.confirmationText}
                </p>
              </div>
            ) : (
              <AiActionCard
                key={action.id}
                action={action}
                loading={actionLoading}
                onApply={onApplyAction}
              />
            )
          )}
        </div>
      ) : null}

      {snapshot.suggestions?.length && onSuggestion ? (
        <div className="flex flex-wrap gap-2">
          {snapshot.suggestions.slice(0, 4).map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal text-left"
              onClick={() => onSuggestion(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProvenanceNote({
  provenance,
}: {
  provenance?: AiProvenance | null;
}) {
  if (!provenance) return null;

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Data context</p>
      <p className="mt-1">{provenance.summary}</p>
      <p className="mt-1">
        {provenance.module}
        {provenance.period ? ` · ${provenance.period}` : ""}
        {` · ${provenance.recordCount} record${provenance.recordCount === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
