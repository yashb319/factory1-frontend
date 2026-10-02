"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetHealthCheckResultQuery } from "../api/healthCheckApi";
import { HealthCheckResultView } from "./HealthCheckResultView";

export function HealthCheckResultPage({ token }: { token: string }) {
  const { data, isLoading, isError, refetch } = useGetHealthCheckResultQuery(token);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><LoaderCircle className="animate-spin text-blue-600" aria-label="Loading health check result" /></div>;
  }

  if (isError || !data?.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border bg-white p-6 text-center">
          <h1 className="text-xl font-semibold">We could not load this result</h1>
          <p className="mt-2 text-sm text-slate-600">The link may be invalid or temporarily unavailable.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" asChild><Link href="/health-check">New health check</Link></Button>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        </div>
      </main>
    );
  }

  return <HealthCheckResultView result={data.data} />;
}
