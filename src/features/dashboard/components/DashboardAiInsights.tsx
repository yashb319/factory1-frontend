"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSendAiMessageMutation } from "@/features/ai/api/aiApi";
import { AiChartView } from "@/features/ai/components/AiChartView";
import { BusinessInsightDrilldownModal } from "./BusinessInsightDrilldownModal";
import type { BenchmarkProfile } from "@/features/ai/types/ai.types";
import type { DashboardSummary, DashboardTrends } from "../types/dashboard.types";

type Props = {
  summary: DashboardSummary | undefined;
  trends: DashboardTrends | undefined;
  range?: { fromDate: string; toDate: string };
  benchmarkProfile?: BenchmarkProfile;
};

const inr = (value?: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

type Ratios = {
  sales: number;
  purchases: number;
  payroll: number;
  invValue: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  payrollPct: number;
  turnover: number;
  benchNet: number;
  benchGross: number;
};

function computeRatios(summary: DashboardSummary, profile: BenchmarkProfile): Ratios {
  const sales = Number(summary.salesThisMonth) || 0;
  const purchases = Number(summary.purchasesThisMonth) || 0;
  const payroll = Number(summary.latestPayrollAmount) || 0;
  const invValue = Number(summary.inventoryValue) || 0;
  const grossProfit = sales - purchases;
  const grossMargin = sales > 0 ? (grossProfit / sales) * 100 : 0;
  const netProfit = grossProfit - payroll;
  const netMargin = sales > 0 ? (netProfit / sales) * 100 : 0;
  const payrollPct = sales > 0 ? (payroll / sales) * 100 : 0;
  const turnover = invValue > 0 ? (purchases * 12) / invValue : 0;

  return {
    sales,
    purchases,
    payroll,
    invValue,
    grossProfit,
    grossMargin,
    netProfit,
    netMargin,
    payrollPct,
    turnover,
    benchNet: (sales * profile.netHigh) / 100,
    benchGross: sales * 0.32,
  };
}

type Tone = "good" | "warning" | "danger" | "exceptional" | "neutral";

const toneChip: Record<Tone, string> = {
  good: "border-green-200 bg-green-50 text-green-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  exceptional: "border-blue-200 bg-blue-50 text-blue-700",
  neutral: "border-slate-200 bg-white text-slate-700",
};

const toneText: Record<Tone, string> = {
  good: "text-green-700",
  warning: "text-amber-700",
  danger: "text-red-700",
  exceptional: "text-blue-700",
  neutral: "text-slate-600",
};

const toneDot: Record<Tone, string> = {
  good: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  exceptional: "bg-blue-500",
  neutral: "bg-slate-400",
};

const higherTone = (v: number, low: number, high: number, dangerBelow: number): Tone =>
  v >= low && v <= high
    ? "good"
    : v > high
      ? "exceptional"
      : v >= dangerBelow
        ? "warning"
        : "danger";

const lowerTone = (v: number, low: number, high: number, dangerAbove: number): Tone =>
  v >= low && v <= high
    ? "good"
    : v < low
      ? "exceptional"
      : v <= dangerAbove
        ? "warning"
        : "danger";

type BenchmarkRow = {
  topic: string;
  label: string;
  valueText: string;
  value: number;
  min: number;
  max: number;
  low: number;
  high: number;
  unit: string;
  tone: Tone;
  guidance: string;
};

const DEFAULT_PROFILE: BenchmarkProfile = {
  key: "small",
  label: "Small manufacturer",
  description: "Typical small-sized Indian manufacturer benchmarks.",
  type: "SIZE",
  grossLow: 22,
  grossHigh: 38,
  netLow: 4,
  netHigh: 11,
  payrollLow: 12,
  payrollHigh: 28,
  turnoverLow: 4,
  turnoverHigh: 8,
};

function benchmarkRows(
  summary: DashboardSummary,
  r: Ratios,
  profile: BenchmarkProfile
): BenchmarkRow[] {
  const grossTone = higherTone(r.grossMargin, profile.grossLow, profile.grossHigh, profile.grossLow * 0.6);
  const netTone = higherTone(r.netMargin, profile.netLow, profile.netHigh, 0);
  const payTone = lowerTone(r.payrollPct, profile.payrollLow, profile.payrollHigh, (profile.payrollHigh + profile.payrollLow) / 2 + (profile.payrollHigh - profile.payrollLow));
  const turnTone = higherTone(r.turnover, profile.turnoverLow, profile.turnoverHigh, profile.turnoverLow * 0.5);

  const payrollSaving = r.payroll - (profile.payrollHigh / 100) * r.sales;

  return [
    {
      topic: "gross",
      label: "Gross margin",
      valueText: `${r.grossMargin.toFixed(1)}%`,
      value: r.grossMargin,
      min: 0,
      max: 100,
      low: profile.grossLow,
      high: profile.grossHigh,
      unit: "%",
      tone: grossTone,
      guidance:
        grossTone === "exceptional"
          ? `Exceptional — far above the ${profile.grossLow}–${profile.grossHigh}% ${profile.label} norm, so pricing power or material costs are very strong. Protect it: avoid heavy discounting, keep renegotiating supplier rates, and skew the mix toward higher-margin products.`
          : grossTone === "good"
            ? `Healthy vs the ${profile.grossLow}–${profile.grossHigh}% benchmark. Hold pricing discipline and review COGS each quarter to stay in range.`
            : grossTone === "warning"
              ? `A bit off the ${profile.grossLow}–${profile.grossHigh}% benchmark. Check if purchases are under-recorded or pricing is soft, then tighten material costs.`
              : `Low vs the ${profile.grossLow}–${profile.grossHigh}% benchmark. Costs are high or pricing is weak — renegotiate materials and review product pricing.`,
    },
    {
      topic: "net",
      label: "Net margin",
      valueText: `${r.netMargin.toFixed(1)}%`,
      value: r.netMargin,
      min: -20,
      max: 40,
      low: profile.netLow,
      high: profile.netHigh,
      unit: "%",
      tone: netTone,
      guidance:
        netTone === "good" || netTone === "exceptional"
          ? "Solid profitability vs benchmark. Keep fixed costs (especially payroll) in check and reinvest the surplus into growth."
          : netTone === "warning"
            ? "Thin vs benchmark. The usual leak is payroll or purchase timing — see the optimizers in the analysis above."
            : `Negative — the factory isn't covering costs. Biggest lever is payroll (${r.payrollPct.toFixed(
              0
            )}% of sales vs ${profile.payrollLow}–${profile.payrollHigh}% ideal). Cut overtime/idle labor and lift sales volume.`,
    },
    {
      topic: "payroll",
      label: "Payroll % of sales",
      valueText: `${r.payrollPct.toFixed(1)}%`,
      value: r.payrollPct,
      min: 0,
      max: 100,
      low: profile.payrollLow,
      high: profile.payrollHigh,
      unit: "%",
      tone: payTone,
      guidance:
        payTone === "good" || payTone === "exceptional"
          ? `Efficient labor cost vs the ${profile.payrollLow}–${profile.payrollHigh}% benchmark. Maintain scheduling discipline and avoid adding fixed headcount as you scale.`
          : payTone === "warning"
            ? `A bit high vs the ${profile.payrollLow}–${profile.payrollHigh}% benchmark. Smooth production scheduling and limit overtime to bring it toward ${profile.payrollHigh}%.`
            : `Too high (${r.payrollPct.toFixed(
              0
            )}% vs ${profile.payrollLow}–${profile.payrollHigh}%). Trimming to ${profile.payrollHigh}% of sales would free ~${inr(
              payrollSaving
            )}/period. Improve scheduling, automate repetitive work, and use contract labor for peaks.`,
    },
    {
      topic: "inventory",
      label: "Inventory turnover",
      valueText: `${r.turnover.toFixed(1)}×`,
      value: r.turnover,
      min: 0,
      max: 10,
      low: profile.turnoverLow,
      high: profile.turnoverHigh,
      unit: "×",
      tone: turnTone,
      guidance:
        turnTone === "good" || turnTone === "exceptional"
          ? `Healthy stock velocity vs the ${profile.turnoverLow}–${profile.turnoverHigh}× benchmark. Keep tight reorder points and avoid tying cash in slow movers.`
          : turnTone === "warning"
            ? `A little off the ${profile.turnoverLow}–${profile.turnoverHigh}× benchmark. Review slow-moving SKUs and tighten reorder quantities.`
            : `Low turnover vs the ${profile.turnoverLow}–${profile.turnoverHigh}× benchmark ties up cash. Reduce overstock, prioritize fast-moving items, and improve demand planning.`,
    },
  ];
}

function BulletBar({
  value,
  min,
  max,
  low,
  high,
  tone,
}: {
  value: number;
  min: number;
  max: number;
  low: number;
  high: number;
  tone: Tone;
}) {
  const span = max - min || 1;
  const clamp = (v: number) =>
    Math.min(100, Math.max(0, ((v - min) / span) * 100));
  const zoneLow = clamp(low);
  const zoneHigh = clamp(high);
  const marker = clamp(value);

  return (
    <div className="relative h-2.5 w-full rounded-full bg-slate-100">
      <div
        className="absolute h-2.5 rounded-full bg-green-200"
        style={{
          left: `${zoneLow}%`,
          width: `${Math.max(0, zoneHigh - zoneLow)}%`,
        }}
      />
      <div
        className={`absolute top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${toneDot[tone]}`}
        style={{ left: `${marker}%` }}
      />
    </div>
  );
}

function buildPrompt(
  summary: DashboardSummary,
  trends: DashboardTrends | undefined,
  profile: BenchmarkProfile
): string {
  const r = computeRatios(summary, profile);
  const buckets = trends?.buckets ?? [];
  const bestSales = buckets.reduce(
    (best, b) =>
      Number(b.sales ?? 0) > Number(best.sales ?? 0) ? b : best,
    { label: "n/a", sales: 0, purchases: 0, net: 0 } as (typeof buckets)[number]
  );
  const worstSales = buckets.reduce(
    (worst, b) =>
      Number(b.sales ?? 0) < Number(worst.sales ?? 0) ? b : worst,
    { label: "n/a", sales: Infinity, purchases: 0, net: 0 } as (typeof buckets)[number]
  );

  const trendLines = buckets
    .map(
      (b) =>
        `- ${b.label}: sales ${inr(Number(b.sales))}, purchases ${inr(
          Number(b.purchases)
        )}, net ${inr(Number(b.net))}`
    )
    .join("\n");

  return `You are the factory owner's personal business advisor for their Factory1 ERP data.
Use ONLY the actual numbers and ratios below — never invent figures.

CURRENT SNAPSHOT
- Inventory items: ${summary.inventoryItems} (low stock: ${summary.lowStockItems})
- Inventory value: ${inr(r.invValue)}
- Sales this month: ${inr(r.sales)}
- Purchases this month: ${inr(r.purchases)}
- Latest payroll: ${inr(r.payroll)}
- Customers: ${summary.customers}, Suppliers: ${summary.suppliers}, Products: ${summary.products}

DERIVED RATIOS (already computed — use these)
- Gross profit (sales - purchases): ${inr(r.grossProfit)}  (${r.grossMargin.toFixed(1)}% of sales)
- Net profit estimate (gross profit - payroll): ${inr(r.netProfit)}  (${r.netMargin.toFixed(1)}% of sales)
- Payroll as % of sales: ${r.payrollPct.toFixed(1)}%
- Estimated inventory turnover: ${r.turnover.toFixed(1)}x per year

MONTHLY TREND (sales vs purchases vs net profit)
${trendLines || "No posted bills yet."}
- Best sales month: ${bestSales.label} (${inr(Number(bestSales.sales))})
- Weakest sales month: ${worstSales.label} (${inr(Number(worstSales.sales))})

 BENCHMARK STANDARD in use: ${profile.label} (${profile.description})
- Gross margin: ${profile.grossLow}-${profile.grossHigh}%   |   Net margin: ${profile.netLow}-${profile.netHigh}%
- Payroll: ${profile.payrollLow}-${profile.payrollHigh}% of revenue   |   Inventory turnover: ${profile.turnoverLow}-${profile.turnoverHigh}x/yr
- COGS typically 60-75% of sales

YOUR TASK — write a direct, opinionated review in these 5 sections (headings + bullets, use the real numbers):
1. Health check: Is this factory actually making money? Compare actual gross/net margins to the benchmark standard above. State plainly: "At your revenue you SHOULD be netting around ${inr(
     r.benchNet
   )} (${profile.netHigh}% benchmark) but you are at ${inr(
     r.netProfit
   )} — a gap of ${inr(r.benchNet - r.netProfit)}." Say what is going right and what is going wrong.
2. Where the money leaks: pinpoint the biggest drains (purchases vs sales, payroll %, idle inventory) using the ratios above.
3. Expense optimizers to beat the average: concrete ways to push margins above benchmark (pricing tweak, purchase timing/negotiation, cutting idle stock, payroll efficiency) with a rough ₹ impact for each.
4. Revenue & profit plan: 3 actions to grow sales and lift net margin toward 10-12%.
5. This-week action list: 4-5 specific next steps the owner can start immediately.

End with a one-line "Bottom line" verdict. Be specific, use the factory's real numbers, no generic fluff.`;
}

export function DashboardAiInsights({ summary, trends, range, benchmarkProfile }: Props) {
  const [generate, result] = useSendAiMessageMutation();

  const profile = benchmarkProfile ?? DEFAULT_PROFILE;

  const handleGenerate = () => {
    setOpen(true);
    if (!summary) return;
    const built = buildPrompt(summary, trends, profile);
    void generate({
      message: built,
      history: [],
      businessInsight: true,
      benchmark: profile.key,
    });
  };

  const response = result.data;
  const r = summary ? computeRatios(summary, profile) : null;
  const rows = r ? benchmarkRows(summary!, r, profile) : [];

  const [drill, setDrill] = useState<{ topic: string; title: string } | null>(
    null
  );

  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setOpen(false);
    }
  }, []);

  return (
    <Card className="rounded-lg border-blue-200 bg-blue-50/40">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-500 transition-transform",
              open ? "" : "-rotate-90"
            )}
          />
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-blue-600" />
            AI Business Insights
          </CardTitle>
        </button>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={!summary || result.isLoading}
        >
          {result.isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {response ? "Regenerate" : "Generate insights"}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
        {!response && !result.isLoading && (
          <p className="text-sm text-slate-500">
            Get AI recommendations on where revenue is low, where money is
            spent, how to boost profit, and how you compare to market
            standards. Your dashboard numbers above are used as context.
          </p>
        )}

        {result.isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing your factory data and comparing with market benchmarks…
          </div>
        )}

        {response?.answer && (
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {response.answer}
          </div>
        )}

        {response?.metrics?.length ? (
          <div className="flex flex-wrap gap-2">
            {response.metrics.map((metric, index) => (
              <span
                key={index}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  toneChip[metric.tone as Tone] ?? toneChip.neutral
                }`}
              >
                {metric.label}: {metric.value}
              </span>
            ))}
          </div>
        ) : null}

        {response?.chart ? <AiChartView chart={response.chart} /> : null}

        {rows.length > 0 && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">
              Benchmark standard in use: <span className="font-semibold text-slate-700">{profile.label}</span>.
              Green band = healthy range for that standard; the dot is where you
              stand now (blue = exceptional / above benchmark). Change the
              standard from the dropdown above the dashboard.
            </p>
            {rows.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {row.label}
                  </span>
                  <span className={toneText[row.tone]}>
                    <span className="font-semibold">{row.valueText}</span>{" "}
                    <span className="text-slate-400">
                      (ideal {row.low}–{row.high}
                      {row.unit})
                    </span>
                  </span>
                </div>
                <BulletBar
                  value={row.value}
                  min={row.min}
                  max={row.max}
                  low={row.low}
                  high={row.high}
                  tone={row.tone}
                />
                <p className="text-xs leading-5 text-slate-500">
                  {row.guidance}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setDrill({ topic: row.topic, title: `${row.label} insights` })
                  }
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline"
                >
                  Click for more
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <BusinessInsightDrilldownModal
          topic={drill?.topic ?? ""}
          title={drill?.title ?? ""}
          range={range}
          benchmark={profile.key}
          open={drill !== null}
          onOpenChange={(open) => {
            if (!open) setDrill(null);
          }}
        />
        </CardContent>
      )}
    </Card>
  );
}
