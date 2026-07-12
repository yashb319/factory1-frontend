"use client";

import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGetBusinessInsightDrilldownQuery } from "@/features/ai/api/aiApi";
import type { BusinessInsightDrilldown } from "@/features/ai/types/ai.types";

type Props = {
  topic: string;
  title: string;
  range?: { fromDate: string; toDate: string };
  benchmark?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function buildDownloadText(data: BusinessInsightDrilldown): string {
  const lines: string[] = [];
  lines.push(data.title.toUpperCase());
  lines.push("");
  if (data.rangeFrom) {
    lines.push(`Data range: ${data.rangeFrom} to ${data.rangeTo}`);
    lines.push("");
  }
  lines.push(data.summary);
  lines.push("");
  lines.push("ACTION ITEMS");
  data.items.forEach((item) => {
    lines.push(`- ${item.label} (${item.value})`);
    if (item.detail) lines.push(`    ${item.detail}`);
    lines.push(`    Action: ${item.action}`);
  });
  lines.push("");
  lines.push(`Benchmark: ${data.benchmarkNote}`);

  return lines.join("\n");
}

function MiniBars({ data }: { data: BusinessInsightDrilldown }) {
  if (!data.chart || data.chart.length === 0) return null;

  const max = Math.max(
    ...data.chart.map((point) => Math.abs(point.value)),
    1
  );

  return (
    <div className="space-y-2">
      {data.chart.map((point) => (
        <div key={point.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{point.label}</span>
            <span className="font-medium">
              {point.value < 0 ? "-" : ""}
              {Math.abs(point.value).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{
                width: `${Math.min(100, (Math.abs(point.value) / max) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BusinessInsightDrilldownModal({
  topic,
  title,
  range,
  benchmark,
  open,
  onOpenChange,
}: Props) {
  const { data, isFetching } = useGetBusinessInsightDrilldownQuery(
    {
      topic,
      fromDate: range?.fromDate,
      toDate: range?.toDate,
      benchmark,
    },
    { skip: !open }
  );

  const handleDownload = () => {
    if (!data) return;

    const text = buildDownloadText(data);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `factory1-${topic}-insight.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const rangeText = data?.rangeFrom
    ? `${data.rangeFrom} to ${data.rangeTo}`
    : range
      ? `${range.fromDate} to ${range.toDate}`
      : "current period";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drill-down with concrete items and actions. Download to share or
            act on.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Data range used:{" "}
          <span className="font-semibold text-slate-800">{rangeText}</span>
          {data?.benchmarkLabel ? (
            <>
              {" · "}Benchmark:{" "}
              <span className="font-semibold text-slate-800">
                {data.benchmarkLabel}
              </span>
            </>
          ) : null}
        </p>

        {isFetching && !data ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading drill-down…
          </div>
        ) : data ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-700">{data.summary}</p>

            <div className="space-y-3">
              {data.items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {item.label}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {item.value}
                    </span>
                  </div>
                  {item.detail ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.detail}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    <span className="font-medium text-slate-700">Action: </span>
                    {item.action}
                  </p>
                </div>
              ))}
            </div>

            {data.chart && data.chart.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">
                  At a glance
                </p>
                <MiniBars data={data} />
              </div>
            ) : null}

            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
              {data.benchmarkNote}
            </p>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Download action items
            </Button>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            No drill-down available.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
