"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/apiError";
import { useGetFactoryDeletionHistoryQuery } from "../api/saasAdminApi";
import type { FactoryDeletionJob } from "../types/saasAdmin.types";
import { FactoryDeletionJobDialog } from "./PermanentDeleteFactoryDialog";

export const DELETION_HISTORY_PAGE_SIZE = 50;

const STATUS_LABEL: Record<FactoryDeletionJob["status"], string> = {
  ASSET_CLEANUP_PENDING: "File cleanup in progress",
  ASSET_CLEANUP_FAILED: "File cleanup failed",
  COMPLETED: "Completed",
};

/**
 * Durable deletion history from the backend. Deleted factories are gone from
 * the dashboard, so this is how pending/failed cleanups are found after a
 * reload. Only the organization ID is shown: the backend keeps no business
 * metadata for deleted tenants.
 */
export function DeletionHistoryPanel() {
  const [offset, setOffset] = useState(0);
  const [openJob, setOpenJob] = useState<FactoryDeletionJob | null>(null);
  const history = useGetFactoryDeletionHistoryQuery({
    offset,
    limit: DELETION_HISTORY_PAGE_SIZE,
  });
  const jobs = history.data?.data ?? [];

  return (
    <section className="rounded-lg border bg-white" aria-label="Factory deletion history">
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Permanent deletions</h2>
          <p className="text-xs text-slate-500">
            Recorded factory deletions, newest first. Deleted factories are
            identified only by organization ID.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={history.isFetching}
          onClick={() => history.refetch()}
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {history.isError ? (
        <p role="alert" className="px-4 py-3 text-xs text-red-700">
          Could not load deletion history:{" "}
          {getErrorMessage(history.error, "unknown error")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retained archive</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-slate-500">
                  Loading deletion history...
                </TableCell>
              </TableRow>
            ) : null}
            {!history.isLoading && jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-slate-500">
                  No permanent deletions recorded.
                </TableCell>
              </TableRow>
            ) : null}
            {jobs.map((job) => (
              <TableRow key={job.organizationId}>
                <TableCell className="font-mono text-xs break-all">
                  {job.organizationId}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      job.status === "ASSET_CLEANUP_FAILED"
                        ? "text-red-700"
                        : job.status === "ASSET_CLEANUP_PENDING"
                          ? "text-amber-800"
                          : "text-emerald-700"
                    }
                  >
                    {STATUS_LABEL[job.status] ?? job.status}
                  </span>
                  {job.errorCode ? (
                    <div className="text-xs text-slate-500">{job.errorCode}</div>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs">
                  {job.retention
                    ? `Until ${job.retention.retainUntil}${
                        job.retention.legalHold ? " • legal hold" : ""
                      }`
                    : "None"}
                </TableCell>
                <TableCell className="text-xs">{job.requestedAt ?? "—"}</TableCell>
                <TableCell className="text-xs">{job.completedAt ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={job.status === "ASSET_CLEANUP_FAILED" ? "destructive" : "outline"}
                    onClick={() => setOpenJob(job)}
                  >
                    {job.status === "ASSET_CLEANUP_FAILED" ? "Review / retry" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {offset > 0 || jobs.length === DELETION_HISTORY_PAGE_SIZE ? (
        <div className="flex justify-end gap-2 border-t px-4 py-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={offset === 0 || history.isFetching}
            onClick={() => setOffset(Math.max(0, offset - DELETION_HISTORY_PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={jobs.length < DELETION_HISTORY_PAGE_SIZE || history.isFetching}
            onClick={() => setOffset(offset + DELETION_HISTORY_PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <FactoryDeletionJobDialog job={openJob} onClose={() => setOpenJob(null)} />
    </section>
  );
}
