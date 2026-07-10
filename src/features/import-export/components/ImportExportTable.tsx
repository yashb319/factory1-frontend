"use client";

import {
  Download,
  FileWarning,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataJob, DataJobStatus } from "../types/importExport.types";
import {
  downloadCsv,
  getLocalExportFile,
} from "../utils/localExportFiles";

interface Props {
  jobs: DataJob[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

function getStatusBadge(status: DataJobStatus) {
  switch (status) {
    case "COMPLETED":
      return <Badge>Completed</Badge>;
    case "RUNNING":
      return <Badge variant="secondary">Running</Badge>;
    case "PENDING":
      return <Badge variant="outline">Pending</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "PARTIAL_SUCCESS":
      return <Badge variant="secondary">Partial Success</Badge>;
  }
}

export function ImportExportTable({ jobs, isLoading, onRefresh }: Props) {
  function downloadOutput(job: DataJob) {
    if (!job.outputFileUrl) return;

    if (job.outputFileUrl.startsWith("factory1-local-export://")) {
      const file = getLocalExportFile(job.outputFileUrl);

      if (!file) {
        alert("This exported file is no longer available in this browser.");
        return;
      }

      downloadCsv({
        fileName: file.fileName,
        content: file.content,
        mimeType: file.mimeType,
      });
      return;
    }

    window.open(job.outputFileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">Recent Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Imports and exports initiated across your organization.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="responsive-table">
          <TableHeader>
            <TableRow>
              <TableHead>Operation</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[180px]">Progress</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[70px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell data-label="Operation">
                  <Badge variant="outline">{job.operation}</Badge>
                </TableCell>

                <TableCell className="font-medium" data-label="Module">{job.module}</TableCell>

                <TableCell data-label="File">
                  <div>
                    <p className="font-medium">{job.fileName}</p>
                    {job.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed {formatDate(job.completedAt)}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell data-label="Status">{getStatusBadge(job.status)}</TableCell>

                <TableCell data-label="Progress">
                  <div className="space-y-1">
                    <Progress value={job.progress} />
                    <p className="text-xs text-muted-foreground">
                      {job.progress}%
                    </p>
                  </div>
                </TableCell>

                <TableCell data-label="Rows">
                  <div className="text-sm">
                    <p>Total: {job.totalRows ?? "-"}</p>
                    <p className="text-muted-foreground">
                      Success: {job.successRows ?? "-"} / Failed:{" "}
                      {job.failedRows ?? "-"}
                    </p>
                  </div>
                </TableCell>

                <TableCell data-label="Created By">{job.createdBy}</TableCell>
                <TableCell data-label="Created At">{formatDate(job.createdAt)}</TableCell>

                <TableCell className="text-right" data-label="Action">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      {job.outputFileUrl && (
                        <DropdownMenuItem onClick={() => downloadOutput(job)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download Output
                        </DropdownMenuItem>
                      )}

                      {job.errorFileUrl && (
                        <DropdownMenuItem asChild>
                          <a href={job.errorFileUrl} download>
                          <FileWarning className="mr-2 h-4 w-4" />
                          Download Error File
                          </a>
                        </DropdownMenuItem>
                      )}

                      {!job.outputFileUrl && !job.errorFileUrl && (
                        <DropdownMenuItem disabled>
                          No file captured
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}

            {!jobs.length && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  {isLoading ? "Loading jobs..." : "No import/export jobs found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
}
