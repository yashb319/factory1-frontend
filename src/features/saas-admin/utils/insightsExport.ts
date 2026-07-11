import type { SaasAdminInsights, SaasFactory } from "../types/saasAdmin.types";
import { formatBytes, formatDuration, formatThroughput } from "./metrics";

type Args = {
  from: string;
  to: string;
  insights: SaasAdminInsights;
  factories: SaasFactory[];
};

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadInsightsCsv({ from, to, insights, factories }: Args) {
  const generatedAt = new Date().toISOString();
  const lines: string[] = [];

  lines.push(`# Factory1 Insights Report`);
  lines.push(`# Period,${from},to,${to}`);
  lines.push(`# Generated,${generatedAt}`);
  lines.push("");

  lines.push("Revenue Summary");
  lines.push(
    [
      "MRR",
      "AnnualRecurringRevenue",
      "ARPU",
      "ActiveFactories",
      "SuspendedFactories",
      "TrialFactories",
      "NewThisMonth",
      "UpsellOpportunities",
      "ExpiringIn30Days",
      "ExpiringIn14Days",
      "TotalServiceTimeMs",
      "TotalDataVolumeBytes",
    ].join(",")
  );
  lines.push(
    [
      insights.mrr,
      insights.annualRecurringRevenue,
      insights.arpu,
      insights.activeFactories,
      insights.suspendedFactories,
      insights.trialFactories,
      insights.newFactoriesThisMonth,
      insights.upsellOpportunities,
      insights.expiringIn30Days,
      insights.expiringIn14Days,
      insights.totalServiceTimeMs,
      insights.totalDataVolumeBytes,
    ].join(",")
  );
  lines.push("");

  lines.push("Revenue By Plan");
  lines.push(["Plan", "Label", "FactoryCount", "MRR"].join(","));
  for (const row of insights.revenueByPlan) {
    lines.push(
      [row.plan, row.label, row.factoryCount, row.mrr].map(escapeCsv).join(",")
    );
  }
  lines.push("");

  lines.push("Renewals");
  lines.push(
    ["OrganizationId", "Name", "Plan", "SubscriptionEndDate", "DaysLeft"].join(
      ","
    )
  );
  for (const row of insights.renewals) {
    lines.push(
      [
        row.organizationId,
        row.name,
        row.plan,
        row.subscriptionEndDate,
        row.daysLeft,
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  lines.push("");

  lines.push("Per-Factory Usage");
  lines.push(
    [
      "Name",
      "Plan",
      "Status",
      "MRR",
      "Employees",
      "Records",
      "ServiceTimeMs",
      "ServiceTime",
      "DataVolumeBytes",
      "DataVolume",
      "Throughput",
      "SubscriptionEndDate",
    ].join(",")
  );
  for (const factory of factories) {
    lines.push(
      [
        factory.name,
        factory.plan,
        factory.status ?? "ACTIVE",
        factory.planMonthlyPrice,
        factory.employeeCount,
        factory.dbUsage.totalRecords,
        factory.serviceTimeMs ?? 0,
        formatDuration(factory.serviceTimeMs),
        factory.dataVolumeBytes ?? 0,
        formatBytes(factory.dataVolumeBytes),
        formatThroughput(factory.dataVolumeBytes, factory.serviceTimeMs),
        factory.subscriptionEndDate ?? "",
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `factory1-insights-${from}-${to}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
