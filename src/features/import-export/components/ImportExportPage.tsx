"use client";

import { useGetImportExportJobsQuery } from "../api/importExportApi";
import { ImportExportTable } from "./ImportExportTable";

export function ImportExportPage() {
  const { data, isFetching, refetch } = useGetImportExportJobsQuery({
    page: 0,
    size: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import / Export History
        </h1>
        <p className="text-sm text-muted-foreground">
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
