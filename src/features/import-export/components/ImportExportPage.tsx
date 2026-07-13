"use client";

import { useGetImportExportJobsQuery } from "../api/importExportApi";
import { ImportExportTable } from "./ImportExportTable";

export function ImportExportPage() {
  const { data, isFetching, refetch } = useGetImportExportJobsQuery({
    page: 0,
    size: 50,
  });

  return (
    <div className="space-y-2 text-[12px]">
      <div className="rounded-lg border border-[var(--factory1-border)] bg-[var(--factory1-background)] px-3 py-2">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--factory1-text-primary)]">
          Import / Export History
        </h1>
        <p className="text-xs text-[var(--factory1-text-muted)]">
          Track imports and exports initiated across Factory1 modules.
        </p>
      </div>

      <ImportExportTable
        jobs={data?.content ?? []}
        isLoading={isFetching}
        onRefresh={refetch}
      />
    </div>
  );
}
