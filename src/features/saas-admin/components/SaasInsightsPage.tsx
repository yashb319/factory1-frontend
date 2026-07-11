"use client";

import { useState } from "react";
import { Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetSaasAdminDashboardQuery,
  useGetSaasAdminInsightsQuery,
} from "../api/saasAdminApi";
import { SaasInsights } from "./SaasInsights";
import {
  formatBytes,
  formatDuration,
  formatThroughput,
} from "../utils/metrics";
import { downloadInsightsCsv } from "../utils/insightsExport";
import { StatusBadge } from "./SaasAdminPage";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function SaasInsightsPage() {
  const { data: insightsData, isFetching: insightsLoading } =
    useGetSaasAdminInsightsQuery();
  const { data: dashboardData, isFetching: dashboardLoading } =
    useGetSaasAdminDashboardQuery();
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const insights = insightsData?.data;
  const factories = dashboardData?.data.factories ?? [];

  const sortedFactories = [...factories].sort(
    (a, b) => (b.dataVolumeBytes ?? 0) - (a.dataVolumeBytes ?? 0)
  );

  function handleExport() {
    if (!insights) {
      toast.error("Insights are still loading");
      return;
    }

    downloadInsightsCsv({
      from: from || todayISO(),
      to: to || todayISO(),
      insights,
      factories,
    });
    toast.success("Insights report downloaded");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            SaaS Insights
          </h1>
          <p className="text-sm text-slate-500">
            Revenue, renewals and per-factory backend usage derived from onboarded factories.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>From</span>
            <Input
              type="date"
              className="h-9"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>To</span>
            <Input
              type="date"
              className="h-9"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      {insights && insights.renewals.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <TriangleAlert size={16} />
            {insights.expiringIn30Days} renewal
            {insights.expiringIn30Days === 1 ? "" : "s"} due within 30 days
            {insights.expiringIn14Days > 0
              ? ` (${insights.expiringIn14Days} in final 14-day window)`
              : ""}
          </div>
          <ul className="divide-y divide-amber-200">
            {insights.renewals.map((renewal) => (
              <li
                key={renewal.organizationId}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="font-medium text-amber-950">
                  {renewal.name}
                </span>
                <span className="text-amber-800">
                  {renewal.plan} · ends {renewal.subscriptionEndDate} ·{" "}
                  <strong>{renewal.daysLeft}d left</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SaasInsights insights={insights} loading={insightsLoading} />

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-slate-500">
              Total backend service time
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatDuration(insights?.totalServiceTimeMs)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-slate-500">
              Total data served
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatBytes(insights?.totalDataVolumeBytes)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-slate-500">
              Avg throughput
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatThroughput(
                insights?.totalDataVolumeBytes,
                insights?.totalServiceTimeMs
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Per-factory backend usage</h2>
          <p className="text-xs text-slate-500">
            Service time and data volume measured per organization from API requests.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Factory</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Service time</TableHead>
              <TableHead>Data volume</TableHead>
              <TableHead>Throughput</TableHead>
              <TableHead>Renews</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dashboardLoading && !dashboardData ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  Loading usage...
                </TableCell>
              </TableRow>
            ) : null}

            {sortedFactories.map((factory) => (
              <TableRow key={factory.organizationId}>
                <TableCell className="min-w-48 font-medium">
                  {factory.name}
                </TableCell>
                <TableCell>{factory.plan}</TableCell>
                <TableCell>
                  <StatusBadge status={factory.status ?? "ACTIVE"} />
                </TableCell>
                <TableCell>{formatDuration(factory.serviceTimeMs)}</TableCell>
                <TableCell>{formatBytes(factory.dataVolumeBytes)}</TableCell>
                <TableCell>
                  {formatThroughput(factory.dataVolumeBytes, factory.serviceTimeMs)}
                </TableCell>
                <TableCell>
                  {factory.subscriptionEndDate ? (
                    <span className="text-sm">{factory.subscriptionEndDate}</span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!dashboardLoading && sortedFactories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                  No factories yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
